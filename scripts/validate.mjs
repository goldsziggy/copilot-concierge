#!/usr/bin/env node
import { readFile, readdir, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PACKAGE_FILES } from './lib/package.mjs';
import { ARTICLE_COUNT, BUNDLED_SOPS, sopProblems } from './check-custom.mjs';

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
        // Only the entry agent follows the session's Copilot Fusion choice; Fusion
        // does not route sub-agents, so the worker keeps an exact model.
        if (!model || (model.toLowerCase() === 'auto' && name !== 'concierge')) fail(`${relative}: exact model required`);
        if (name === 'concierge' && model !== 'auto') fail(`${relative}: the entry agent prefers Copilot Fusion (model: auto)`);
        // Copilot gives a nested agent only tools its parent agent also has
        // (verified in CLI 1.0.93), so the worker must not narrow its list.
        const hasTools = /^tools:/m.test(text.split('\n---')[0]);
        const tools = hasTools ? field(text, 'tools') : null;
        const controls = /\b(task|list_agents|read_agent|write_agent|update_todo|exit_plan_mode|ask_user)\b/;
        if (name === 'worker' && hasTools) fail(`${relative}: worker must not restrict tools; its sub-agents inherit through it`);
        if (name === 'concierge') {
          if (!hasTools || /\b(view|rg|grep|glob|bash|powershell|apply_patch|edit|create|web_fetch)\b/.test(tools)) fail(`${relative}: Concierge entry must list only control tools`);
          // The entry agent's procedures are the brief and relay skills.
          for (const control of ['skill', 'task', 'read_agent', 'write_agent', 'ask_user', 'update_todo']) if (!new RegExp(`\\b${control}\\b`).test(tools)) fail(`${relative}: Concierge entry needs ${control}`);
        } else if (shipped && name !== 'worker') fail(`${relative}: Concierge ships two agents, concierge and worker`);
        else if (!shipped && hasTools && controls.test(tools)) fail(`${relative}: example agent has agent-control tools`);
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
  if (skills !== 20 || agents !== 2) fail(`Expected 20 skills and 2 agents; found ${skills} and ${agents}`);
  // Bundled SOPs are run step by step, so each must have the SOP shape
  // and be listed in the router's table.
  const bundled = path.join(root, 'skills/sops/procedures');
  const present = (await readdir(bundled)).filter(name => name.endsWith('.md')).map(name => name.slice(0, -3)).sort();
  if (present.join() !== [...BUNDLED_SOPS].sort().join()) fail(`Bundled SOPs differ from BUNDLED_SOPS: ${present.join(', ')}`);
  const router = await readFile(path.join(root, 'skills/sops/SKILL.md'), 'utf8');
  for (const title of present) {
    for (const problem of sopProblems(await readFile(path.join(bundled, `${title}.md`), 'utf8'))) fail(`skills/sops/procedures/${title}.md: ${problem}`);
    if (!router.includes(`\`procedures/${title}.md\``)) fail(`skills/sops/SKILL.md: table does not list procedures/${title}.md`);
  }
  // Articles are cited by number from SOPs and saved skills: exactly ten, numbered
  // 01 to 10, each with the Article shape and a row in the constitution's table.
  const articlesDir = path.join(root, 'skills/constitution/articles');
  const articles = (await readdir(articlesDir)).filter(name => name.endsWith('.md')).sort();
  const constitution = await readFile(path.join(root, 'skills/constitution/SKILL.md'), 'utf8');
  if (articles.length !== ARTICLE_COUNT) fail(`Expected ${ARTICLE_COUNT} Articles; found ${articles.length}`);
  articles.forEach((name, index) => {
    const number = index + 1;
    if (!name.startsWith(`${String(number).padStart(2, '0')}-`)) fail(`skills/constitution/articles/${name}: expected Article ${number} here`);
    if (!constitution.includes(`| ${number} | `) || !constitution.includes(`\`articles/${name}\``)) fail(`skills/constitution/SKILL.md: table does not list articles/${name}`);
  });
  for (const name of articles) {
    const text = (await readFile(path.join(articlesDir, name), 'utf8')).replace(/\r\n/g, '\n');
    if (!new RegExp(`^# Article ${Number(name.slice(0, 2))}: .+\\n\\n.+\\n\\n## Applies when\\n[\\s\\S]+\\n## Do\\n\\n- [\\s\\S]+\\n## Check\\n\\n.+`).test(text)) fail(`skills/constitution/articles/${name}: needs a numbered title, a one-line rule, "## Applies when", "## Do" and "## Check"`);
  }
  for (const title of present) {
    const text = await readFile(path.join(bundled, `${title}.md`), 'utf8');
    for (const [, number] of text.matchAll(/Article (\d+)/g)) if (Number(number) < 1 || Number(number) > ARTICLE_COUNT) fail(`skills/sops/procedures/${title}.md: cites unknown Article ${number}`);
  }
  if (entryAgents !== 1) fail(`Expected one Concierge entry agent; found ${entryAgents}`);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Package checks passed: ${skills} skills, ${agents} agents, ${files.length} files. These are static checks, not runtime acceptance.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
