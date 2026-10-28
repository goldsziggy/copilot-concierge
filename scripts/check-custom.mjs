#!/usr/bin/env node
// Checks customer agents, skills and copilot-concierge-routing tables before Copilot loads
// them. Copilot drops an agent whose frontmatter is not valid YAML without an
// error, so problems are easier to find here than in a session.
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

export const CONCIERGE_ROLES = ['scout', 'product-manager', 'enterprise-ux', 'react-frontend', 'node-backend', 'graphql', 'reviewer', 'ship-it', 'escalation'];
export const CONCIERGE_SKILLS = ['orchestrate', 'plan', 'grill-plan', 'scout', 'enterprise-ux', 'react-frontend', 'node-backend', 'graphql', 'review', 'ship-it', 'debugging', 'task-evaluation'];
const CONCIERGE_AGENTS = ['concierge', 'orchestrator', ...CONCIERGE_ROLES];
const BUILTIN_PREFIX = 'copilot-concierge:';

// Where Copilot reads agents and skills for each kind of root: a project
// (.github/, .claude/ and .agents/), the Copilot home (~/.copilot), or a
// plugin (plugin.json). Inherited parent folders, ~/.agents, organization
// agents and extra configured skill folders are not scanned.
async function locations(root) {
  const plugin = await exists(path.join(root, 'plugin.json'));
  const pluginName = plugin ? JSON.parse(await readFile(path.join(root, 'plugin.json'), 'utf8')).name : undefined;
  if (plugin && (typeof pluginName !== 'string' || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(pluginName))) {
    throw new Error(`${root}: plugin.json must declare a valid plugin name to resolve agent namespaces`);
  }
  const home = path.resolve(root) === path.join(os.homedir(), '.copilot');
  return {
    pluginName,
    agents: ['.github/agents', ...(plugin ? [] : ['.claude/agents']), ...(home || plugin ? ['agents'] : []), ...(plugin ? ['com.github.copilot/agents'] : [])],
    skills: ['.github/skills', ...(plugin ? [] : ['.agents/skills', '.claude/skills']), ...(home || plugin ? ['skills'] : [])],
  };
}

async function exists(file) { try { await stat(file); return true; } catch { return false; } }

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

export function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const fields = {};
  const problems = [];
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s?(.*)$/);
    if (!field) continue;
    const [, key, value] = field;
    fields[key] = value.replace(/^(["'])(.*)\1$/, '$2');
    if (value && !/^["'[]/.test(value) && /: | #/.test(value)) problems.push(`quote the value of "${key}"; Copilot drops files whose frontmatter is not valid YAML`);
  }
  return { fields, problems };
}

// Repository and personal agent IDs come from the file path: the name without
// .agent.md or .md, with subdirectories joined by "--".
export function agentId(agentsDir, file) {
  return path.relative(agentsDir, file).replace(/\.agent\.md$|\.md$/, '').split(path.sep).join('--');
}

export function routingRows(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!/^\s*\|/.test(line) || /^\s*\|\s*-/.test(line)) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim().replace(/^`|`$/g, ''));
    if (cells[0].toLowerCase() === 'role') continue;
    const [role, agent, skills = '', when = ''] = cells;
    rows.push({ role, agent, skills: skills.split(',').map(s => s.trim().replace(/^`|`$/g, '')).filter(Boolean), when });
  }
  return rows;
}

export async function checkRoots(roots) {
  const errors = [];
  const warnings = [];
  const agents = new Map();
  const skills = new Map();
  const routing = [];
  for (const root of roots) {
    const rootLocations = await locations(root);
    for (const dir of rootLocations.agents) {
      const agentsDir = path.join(root, dir);
      if (!await exists(agentsDir)) continue;
      for (const file of (await walk(agentsDir)).filter(f => f.endsWith('.md'))) {
        const parsed = frontmatter(await readFile(file, 'utf8'));
        const where = path.relative(process.cwd(), file) || file;
        if (!parsed) { errors.push(`${where}: missing frontmatter`); continue; }
        for (const problem of parsed.problems) errors.push(`${where}: ${problem}`);
        if (!parsed.fields.description) errors.push(`${where}: add a description; the orchestrator chooses agents by it`);
        if (!parsed.fields.model) warnings.push(`${where}: no model; pin one, with model-policy: required, so the agent never runs on an unexpected model`);
        else if (parsed.fields.model.startsWith('[')) warnings.push(`${where}: a model list falls back silently when the first model is unavailable`);
        if (/\b(task|write_agent|ask_user|update_todo)\b/.test(parsed.fields.tools ?? '')) warnings.push(`${where}: workers should report to the orchestrator, not dispatch agents, ask the user or own the task list`);
        const localId = agentId(agentsDir, file);
        const id = rootLocations.pluginName && dir !== '.github/agents' ? `${rootLocations.pluginName}:${localId}` : localId;
        if (rootLocations.pluginName !== 'copilot-concierge' && CONCIERGE_AGENTS.includes(id)) errors.push(`${where}: agent ID "${id}" is a Concierge agent name; Copilot keeps only one agent per ID and loads plugin agents after personal and project agents, so choose a distinct team name`);
        if (agents.has(id)) warnings.push(`${where}: duplicate agent ID "${id}" (also ${agents.get(id)}); Copilot loads only one, following its documented loading order`);
        else agents.set(id, where);
      }
    }
    for (const dir of rootLocations.skills) {
      const skillsDir = path.join(root, dir);
      if (!await exists(skillsDir)) continue;
      for (const entry of await readdir(skillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const file = path.join(skillsDir, entry.name, 'SKILL.md');
        if (!await exists(file)) continue;
        const text = await readFile(file, 'utf8');
        const parsed = frontmatter(text);
        const where = path.relative(process.cwd(), file) || file;
        if (!parsed) { errors.push(`${where}: missing frontmatter`); continue; }
        for (const problem of parsed.problems) errors.push(`${where}: ${problem}`);
        if (parsed.fields.name !== entry.name) errors.push(`${where}: name must match its folder (${entry.name})`);
        if (!parsed.fields.description) errors.push(`${where}: add a description`);
        if (rootLocations.pluginName !== 'copilot-concierge' && CONCIERGE_SKILLS.includes(entry.name)) errors.push(`${where}: "${entry.name}" is a Concierge skill name; Copilot keeps only one skill per name, so this could replace Concierge's own skill. Rename it`);
        if (skills.has(entry.name)) warnings.push(`${where}: duplicate skill "${entry.name}" (also ${skills.get(entry.name)}); Copilot loads only one, following its documented loading order`);
        else skills.set(entry.name, where);
        if (/^copilot-concierge-routing(-|$)/.test(entry.name)) routing.push({ where, rows: routingRows(text) });
      }
    }
  }
  const knownAgent = id => agents.has(id) || id.startsWith(BUILTIN_PREFIX) && CONCIERGE_ROLES.includes(id.slice(BUILTIN_PREFIX.length));
  for (const { where, rows } of routing) {
    if (!rows.length) warnings.push(`${where}: no routing rows found; use a table with Role | Agent | Skills | Use when`);
    for (const row of rows) {
      if (!row.role || !row.agent) { errors.push(`${where}: each row needs a role and an agent`); continue; }
      if (!knownAgent(row.agent)) warnings.push(`${where}: agent "${row.agent}" was not found in these folders; it must come from a plugin or another location Copilot loads`);
      if (!CONCIERGE_ROLES.includes(row.role) && !row.when) warnings.push(`${where}: new role "${row.role}" needs a "Use when" description`);
      for (const skill of row.skills) {
        if (!skills.has(skill) && !CONCIERGE_SKILLS.includes(skill)) warnings.push(`${where}: skill "${skill}" was not found in these folders`);
      }
    }
  }
  return { errors, warnings, agents: [...agents.keys()], skills: [...skills.keys()], routing: routing.map(r => r.where) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const roots = process.argv.slice(2).length ? process.argv.slice(2).map(r => path.resolve(r)) : [process.cwd(), path.join(os.homedir(), '.copilot')];
  const result = await checkRoots(roots);
  console.log(`Agents: ${result.agents.sort().join(', ') || 'none'}`);
  console.log(`Skills: ${result.skills.sort().join(', ') || 'none'}`);
  console.log(`Routing tables: ${result.routing.sort().join(', ') || 'none'}`);
  for (const warning of result.warnings) console.log(`warning: ${warning}`);
  for (const error of result.errors) console.error(`error: ${error}`);
  if (result.errors.length) process.exitCode = 1;
  else console.log(result.warnings.length ? 'No errors; review the warnings.' : 'No problems found.');
}
