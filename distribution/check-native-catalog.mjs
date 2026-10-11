import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateCatalog } from './catalog.mjs';

// Optional metadata-only check against an already installed Copilot CLI.
// No model session, plugin installation, extension activation, or network access.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = await mkdtemp(join(tmpdir(), 'zilot-catalog-'));
const env = {
  ...process.env,
  COPILOT_HOME: join(fixture, 'state'),
  COPILOT_CACHE_HOME: join(fixture, 'cache'),
  COPILOT_AUTO_UPDATE: 'false',
  COPILOT_OFFLINE: 'true',
  USE_TGREP: 'false',
  CI: 'true',
  NO_COLOR: '1',
};
function run(args) {
  const result = spawnSync('copilot', ['--no-auto-update', ...args], {
    cwd: join(fixture, 'repo'), env, encoding: 'utf8', timeout: 20_000,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Metadata check failed for copilot ${args.slice(0, 3).join(' ')}: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  }
  return result.stdout.trim();
}

try {
  const manifest = JSON.parse(await readFile(join(root, 'plugin.json'), 'utf8'));
  const catalog = JSON.parse(await readFile(join(root, '.github/plugin/marketplace.json'), 'utf8'));
  validateCatalog(catalog, manifest);
  const repo = join(fixture, 'repo');
  await mkdir(join(repo, '.github/plugin'), { recursive: true });
  await copyFile(join(root, 'plugin.json'), join(repo, 'plugin.json'));
  await copyFile(join(root, '.github/plugin/marketplace.json'), join(repo, '.github/plugin/marketplace.json'));
  const cliVersion = run(['--version']);
  run(['plugin', 'marketplace', 'add', repo]);
  const plugins = JSON.parse(run(['plugin', 'marketplace', 'browse', 'zilot', '--json']));
  const entries = Array.isArray(plugins) ? plugins : plugins.plugins;
  const zilot = entries?.find(item => item.name === 'zilot');
  if (!zilot || zilot.marketplace !== 'zilot' || zilot.description !== manifest.description) {
    throw new Error(`CLI catalog browse did not return the expected Zilot entry: ${JSON.stringify(plugins)}`);
  }
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    cliVersion,
    plugin: { name: zilot.name, manifestVersion: manifest.version },
    result: 'pass',
    checks: ['catalog matches manifest including version', 'canonical catalog accepted by CLI', 'catalog browse returns expected plugin name, marketplace and description'],
    isolation: 'Temporary COPILOT_HOME and COPILOT_CACHE_HOME; offline; removed after check.',
    notTested: ['plugin installation or activation', 'model inference', 'agent hierarchy', 'app or VS Code behavior', 'remote Git fetch or publication'],
  }, null, 2));
} catch (error) {
  console.error(error.message.replaceAll(fixture, '<temporary-fixture>'));
  process.exitCode = 1;
} finally {
  await rm(fixture, { recursive: true, force: true });
}
