#!/usr/bin/env node
import { readFile, readdir, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PACKAGE_FILES } from './lib/package.mjs';

const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const errors = [];
const fail = message => errors.push(message);
async function filesUnder(file) {
  const info = await lstat(file);
  if (info.isSymbolicLink()) { fail(`Symbolic link is not distributable: ${file}`); return []; }
  if (info.isDirectory()) return (await Promise.all((await readdir(file)).map(name => filesUnder(path.join(file, name))))).flat();
  return [file];
}
function field(content, name) {
  const header = content.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  if (!header) throw new Error('Missing frontmatter');
  const matches = [...header.matchAll(new RegExp(`^${name}: (.+)$`, 'gm'))];
  if (matches.length !== 1) throw new Error(`Expected one ${name} field`);
  return matches[0][1].replace(/^(["'])(.*)\1$/, '$2');
}
try {
  const manifest = JSON.parse(await readFile(path.join(root, 'plugin.json'), 'utf8'));
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (manifest.$schema !== 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') fail('Unexpected plugin schema');
  if (manifest.name !== 'copilot-concierge' || pkg.name !== manifest.name || pkg.version !== manifest.version) fail('Package identity/version mismatch');
  const manifestFields = ['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords', 'extensions'];
  for (const key of Object.keys(manifest)) if (!manifestFields.includes(key)) fail(`Unsupported manifest key: ${key}`);
  const files = [];
  for (const relative of PACKAGE_FILES) {
    try { files.push(...await filesUnder(path.join(root, relative))); }
    catch (error) { fail(`${relative}: ${error.message}`); }
  }
  let skills = 0;
  let agents = 0;
  let entryAgents = 0;
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const text = (await readFile(file, 'utf8')).replace(/\r\n/g, '\n');
    const relative = path.relative(root, file);
    if (/\[TODO:|INSERT_(?:NAME|DESCRIPTION)|REPLACE_ME/.test(text)) fail(`${relative}: unfinished scaffold`);
    const shipped = !relative.startsWith('examples' + path.sep);
    if (path.basename(file) === 'SKILL.md') {
      if (shipped) skills++;
      try {
        const name = field(text, 'name');
        const description = field(text, 'description');
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) fail(`${relative}: invalid skill name`);
        if (name !== path.basename(path.dirname(file))) fail(`${relative}: directory/name mismatch`);
        if (description.length < 20 || description.length > 1024) fail(`${relative}: invalid description length`);
      } catch (error) { fail(`${relative}: ${error.message}`); }
    }
    if (file.endsWith('.agent.md')) {
      if (shipped) agents++;
      try {
        const name = field(text, 'name');
        field(text, 'description');
        if (shipped && name === 'concierge') {
          entryAgents++;
          if (path.basename(file) !== 'concierge.agent.md') fail(`${relative}: Concierge entry filename must be concierge.agent.md`);
          if (field(text, 'user-invocable') !== 'true') fail(`${relative}: Concierge entry must be user-invocable`);
        } else if (shipped && field(text, 'user-invocable') !== 'false') {
          fail(`${relative}: only Concierge may be user-invocable`);
        }
        // Copilot silently drops an agent whose frontmatter is not valid YAML;
        // an unquoted ': ' or ' #' inside a plain value is the common cause.
        for (const line of text.match(/^---\n([\s\S]*?)\n---/)[1].split('\n')) {
          const value = line.match(/^[a-z-]+: (.*)$/)?.[1];
          if (value && !/^["'[]/.test(value) && /: | #/.test(value)) fail(`${relative}: quote the value of "${line.split(':')[0]}"`);
        }
        const model = field(text, 'model');
        if (model.toLowerCase() === 'auto' || !model) fail(`${relative}: exact model required`);
        if (field(text, 'model-policy') !== 'required') fail(`${relative}: required policy missing`);
        // Copilot gives a nested agent only tools its parent agent also has
        // (verified in CLI 1.0.93), so the orchestrator must not narrow its list.
        const hasTools = /^tools:/m.test(text.split('\n---')[0]);
        const tools = hasTools ? field(text, 'tools') : null;
        const controls = /\b(task|list_agents|read_agent|write_agent|update_todo|exit_plan_mode|ask_user)\b/;
        if (name === 'orchestrator' && hasTools) fail(`${relative}: orchestrator must not restrict tools; specialists inherit through it`);
        if (name === 'ship-it' && hasTools) fail(`${relative}: ship-it must not restrict tools; authorized provider integrations are inherited`);
        if (name === 'ship-it') {
          if (model !== 'gpt-6-luna') fail(`${relative}: ship-it must pin gpt-6-luna`);
          if (field(text, 'user-invocable') !== 'false') fail(`${relative}: ship-it must be internal`);
          if (/^disable-model-invocation: true$/m.test(text.split('\n---')[0])) fail(`${relative}: ship-it must remain dispatchable`);
          if (field(text, 'skills') !== '[ship-it]') fail(`${relative}: ship-it skill required`);
        }
        if (name === 'concierge') {
          if (!hasTools || /\b(view|rg|grep|glob|bash|powershell|apply_patch|edit|create|web_fetch)\b/.test(tools)) fail(`${relative}: Concierge entry must list only control tools`);
          for (const control of ['task', 'read_agent', 'write_agent', 'ask_user', 'update_todo']) if (!new RegExp(`\\b${control}\\b`).test(tools)) fail(`${relative}: Concierge entry needs ${control}`);
        } else if (hasTools && controls.test(tools)) fail(`${relative}: specialist has agent-control tools`);
        if (tools?.includes('*')) fail(`${relative}: tool wildcard not allowed; omit tools instead`);
      } catch (error) { fail(`${relative}: ${error.message}`); }
    }
    for (const match of text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = match[1].replace(/^<|>$/g, '').split('#')[0];
      if (!target || /^[a-z]+:|^\//i.test(target)) continue;
      try { await lstat(path.resolve(path.dirname(file), decodeURIComponent(target))); }
      catch { fail(`${relative}: missing local link ${target}`); }
    }
  }
  if (skills !== 12 || agents !== 11) fail(`Expected 12 skills and 11 agents; found ${skills} and ${agents}`);
  if (entryAgents !== 1) fail(`Expected one Concierge entry agent; found ${entryAgents}`);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Package checks passed: ${skills} skills, ${agents} agents, ${files.length} files. These are static checks, not runtime acceptance.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
