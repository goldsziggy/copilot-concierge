import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const DEFAULTS = Object.freeze({
  planApproval: 'auto',
  autonomy: 'guided',
  bundledSops: 'on',
  // Both agents prefer Copilot Fusion, which is selected as `auto` (stored ID)
  // or its `fusion` alias. Any role may also name one explicit model ID.
  models: Object.freeze({ concierge: 'auto', worker: 'auto' }),
  extraDirectories: Object.freeze([]),
});

// One environment variable switches the autonomy mode, so a pipeline can change
// it without editing a file. Add a mode here and in the agent profiles together.
export const AUTONOMY_MODES = Object.freeze(['guided', 'full']);
export const AUTONOMY_ENV = 'COPILOT_CONCIERGE_AUTONOMY';

// Older configuration files keep working: frontdesk and orchestrator are
// deprecated names for the two roles, and the specialist and escalation roles
// were retired with their agents, so their values are checked and then ignored.
const ROLE_ALIASES = Object.freeze({ frontdesk: 'concierge', orchestrator: 'worker' });
const RETIRED_ROLES = Object.freeze(['specialist', 'escalation']);
const canonicalRole = role => ROLE_ALIASES[role] ?? role;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const modelPattern = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,99}$/;

export function validateConfig(config, source = 'configuration') {
  if (!object(config)) throw new Error(`${source}: expected a JSON object`);
  for (const key of Object.keys(config)) {
    if (!['planApproval', 'autonomy', 'bundledSops', 'models', 'extraDirectories'].includes(key)) throw new Error(`${source}: unknown setting ${key}`);
  }
  if ('planApproval' in config && !['ask', 'auto'].includes(config.planApproval)) {
    throw new Error(`${source}: planApproval must be ask or auto; omit it to inherit`);
  }
  if ('autonomy' in config && !AUTONOMY_MODES.includes(config.autonomy)) {
    throw new Error(`${source}: autonomy must be ${AUTONOMY_MODES.join(' or ')}; omit it to inherit`);
  }
  // The SOPs Concierge bundles are examples; a user or team can switch them off.
  if ('bundledSops' in config && !['on', 'off'].includes(config.bundledSops)) {
    throw new Error(`${source}: bundledSops must be on or off; omit it to inherit`);
  }
  if ('models' in config) {
    if (!object(config.models)) throw new Error(`${source}: models must be an object`);
    for (const [alias, role] of Object.entries(ROLE_ALIASES)) {
      if (Object.hasOwn(config.models, alias) && Object.hasOwn(config.models, role)) {
        throw new Error(`${source}: use models.${role} or its deprecated models.${alias} alias, not both`);
      }
    }
    for (const [role, model] of Object.entries(config.models)) {
      if (!Object.hasOwn(DEFAULTS.models, role) && !Object.hasOwn(ROLE_ALIASES, role) && !RETIRED_ROLES.includes(role)) throw new Error(`${source}: unknown model role ${role}`);
      if (typeof model !== 'string' || !modelPattern.test(model)) throw new Error(`${source}: ${role} must name one model ID`);
    }
  }
  if ('extraDirectories' in config) {
    if (!Array.isArray(config.extraDirectories) || config.extraDirectories.some(dir => typeof dir !== 'string' || !dir.trim() || /[\0\n\r]/.test(dir))) {
      throw new Error(`${source}: extraDirectories must be a list of directory paths`);
    }
  }
  return config;
}

// Nearest scope wins for planApproval, autonomy and each model role. Extra directories
// accumulate across scopes so a user's own agents and a project's agents both load.
export function resolveConfig(layers = []) {
  const value = { planApproval: DEFAULTS.planApproval, autonomy: DEFAULTS.autonomy, bundledSops: DEFAULTS.bundledSops, models: { ...DEFAULTS.models }, extraDirectories: [] };
  const source = { planApproval: 'default', autonomy: 'default', bundledSops: 'default', models: Object.fromEntries(Object.keys(DEFAULTS.models).map(role => [role, 'default'])), extraDirectories: [] };
  for (const layer of layers) {
    validateConfig(layer.value, layer.source);
    if (Object.hasOwn(layer.value, 'planApproval')) {
      value.planApproval = layer.value.planApproval;
      source.planApproval = layer.source;
    }
    if (Object.hasOwn(layer.value, 'autonomy')) {
      value.autonomy = layer.value.autonomy;
      source.autonomy = layer.source;
    }
    if (Object.hasOwn(layer.value, 'bundledSops')) {
      value.bundledSops = layer.value.bundledSops;
      source.bundledSops = layer.source;
    }
    for (const [role, model] of Object.entries(layer.value.models ?? {})) {
      // Normalize the old role keys per layer so nearest-scope precedence
      // remains the same for existing configuration files.
      if (RETIRED_ROLES.includes(role)) continue;
      value.models[canonicalRole(role)] = model;
      source.models[canonicalRole(role)] = layer.source;
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
  // Files, then the environment, then explicit flags: an invalid value fails
  // here rather than falling back to a mode nobody chose.
  const fromEnvironment = (options.env ?? process.env)[AUTONOMY_ENV]?.trim();
  if (fromEnvironment) layers.push({ source: `environment: ${AUTONOMY_ENV}`, value: { autonomy: fromEnvironment } });
  if (options.planApproval !== undefined) layers.push({ source: 'task: --plan-approval', value: { planApproval: options.planApproval } });
  if (options.autonomy !== undefined) layers.push({ source: 'task: --autonomy', value: { autonomy: options.autonomy } });
  return resolveConfig(layers);
}

// An extra directory that is itself a plugin loads with --plugin-dir; any other
// directory loads its .github/agents and .github/skills through native --add-dir.
export function extraDirectoryArguments(directories) {
  return directories.flatMap(dir => existsSync(path.join(dir, 'plugin.json')) ? ['--plugin-dir', dir] : ['--add-dir', dir]);
}
