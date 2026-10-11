import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const DEFAULTS = Object.freeze({
  planApproval: 'ask',
  models: Object.freeze({ concierge: 'gpt-6-luna', orchestrator: 'gpt-6.1-sol', specialist: 'gpt-6-luna', escalation: 'gpt-6.1-sol' }),
  extraDirectories: Object.freeze([]),
});

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const modelPattern = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,99}$/;

export function validateConfig(config, source = 'configuration') {
  if (!object(config)) throw new Error(`${source}: expected a JSON object`);
  for (const key of Object.keys(config)) {
    if (!['planApproval', 'models', 'extraDirectories'].includes(key)) throw new Error(`${source}: unknown setting ${key}`);
  }
  if ('planApproval' in config && !['ask', 'auto'].includes(config.planApproval)) {
    throw new Error(`${source}: planApproval must be ask or auto; omit it to inherit`);
  }
  if ('models' in config) {
    if (!object(config.models)) throw new Error(`${source}: models must be an object`);
    if (Object.hasOwn(config.models, 'frontdesk') && Object.hasOwn(config.models, 'concierge')) {
      throw new Error(`${source}: use models.concierge or its deprecated models.frontdesk alias, not both`);
    }
    for (const [role, model] of Object.entries(config.models)) {
      if (!Object.hasOwn(DEFAULTS.models, role) && role !== 'frontdesk') throw new Error(`${source}: unknown model role ${role}`);
      if (typeof model !== 'string' || !modelPattern.test(model) || model.toLowerCase() === 'auto') {
        throw new Error(`${source}: ${role} must name one explicit model ID, never Auto`);
      }
    }
  }
  if ('extraDirectories' in config) {
    if (!Array.isArray(config.extraDirectories) || config.extraDirectories.some(dir => typeof dir !== 'string' || !dir.trim() || /[\0\n\r]/.test(dir))) {
      throw new Error(`${source}: extraDirectories must be a list of directory paths`);
    }
  }
  return config;
}

// Nearest scope wins for planApproval and each model role. Extra directories
// accumulate across scopes so a user's own agents and a project's agents both load.
export function resolveConfig(layers = []) {
  const value = { planApproval: DEFAULTS.planApproval, models: { ...DEFAULTS.models }, extraDirectories: [] };
  const source = { planApproval: 'default', models: Object.fromEntries(Object.keys(DEFAULTS.models).map(role => [role, 'default'])), extraDirectories: [] };
  for (const layer of layers) {
    validateConfig(layer.value, layer.source);
    if (Object.hasOwn(layer.value, 'planApproval')) {
      value.planApproval = layer.value.planApproval;
      source.planApproval = layer.source;
    }
    for (const [role, model] of Object.entries(layer.value.models ?? {})) {
      // Normalize the old entry-role key per layer so nearest-scope precedence
      // remains the same for existing configuration files.
      const canonicalRole = role === 'frontdesk' ? 'concierge' : role;
      value.models[canonicalRole] = model;
      source.models[canonicalRole] = layer.source;
    }
    for (const dir of layer.value.extraDirectories ?? []) {
      const resolved = layer.base ? path.resolve(layer.base, dir.replace(/^~(?=$|\/)/, os.homedir())) : dir;
      if (!value.extraDirectories.includes(resolved)) {
        value.extraDirectories.push(resolved);
        source.extraDirectories.push(layer.source);
      }
    }
  }
  return { value, source };
}

async function readLayer(file, scope, required) {
  try {
    if ((await stat(file)).size > 16384) throw new Error(`${scope}: configuration exceeds 16 KiB`);
    const content = await readFile(file, 'utf8');
    let value;
    try { value = JSON.parse(content); }
    catch { throw new Error(`${scope}: invalid JSON in ${file}`); }
    return { source: `${scope}: ${file}`, base: path.dirname(file), value: validateConfig(value, scope) };
  } catch (error) {
    if (error.code === 'ENOENT' && !required) return undefined;
    throw error;
  }
}

export async function loadConfig(options = {}) {
  const project = path.resolve(options.project ?? process.cwd());
  const candidates = [
    [options.userConfig ?? path.join(os.homedir(), '.config/copilot-concierge/config.json'), 'user', Boolean(options.userConfig)],
    [options.projectConfig ?? path.join(project, '.copilot-concierge/config.json'), 'project', Boolean(options.projectConfig)],
  ];
  if (options.sessionConfig) candidates.push([options.sessionConfig, 'session', true]);
  const layers = [];
  for (const [file, scope, required] of candidates) {
    const layer = await readLayer(path.resolve(file), scope, required);
    if (layer) layers.push(layer);
  }
  if (options.planApproval !== undefined) layers.push({ source: 'task: --plan-approval', value: { planApproval: options.planApproval } });
  return resolveConfig(layers);
}

// An extra directory that is itself a plugin loads with --plugin-dir; any other
// directory loads its .github/agents and .github/skills through native --add-dir.
export function extraDirectoryArguments(directories) {
  return directories.flatMap(dir => existsSync(path.join(dir, 'plugin.json')) ? ['--plugin-dir', dir] : ['--add-dir', dir]);
}
