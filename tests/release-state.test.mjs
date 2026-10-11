import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, access, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { copyPackage } from '../scripts/lib/package.mjs';
import { assertNoTrackedLocalState } from '../scripts/lib/release-state.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const note = '.copilot-concierge/project-notes.md';
const sentinel = 'Synthetic private Scout note: must never be published.\n';

async function fixture(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'copilot-concierge-release-state-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const directory = path.join(temporary, 'source');
  await mkdir(directory);
  const emptyConfig = path.join(temporary, 'empty-config');
  await writeFile(emptyConfig, '');
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  env.GIT_CONFIG_GLOBAL = emptyConfig;
  env.GIT_CONFIG_NOSYSTEM = '1';
  const git = (...args) => execFileSync('git', ['-c', 'core.fsmonitor=false', ...args], {
    cwd: directory, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  git('init', '--quiet');
  return { directory, temporary, env, git };
}

async function writeNote(directory) {
  await mkdir(path.dirname(path.join(directory, note)), { recursive: true });
  await writeFile(path.join(directory, note), sentinel);
}

test('broad staging ignores local Scout notes without ignoring project configuration', async t => {
  const { directory, git } = await fixture(t);
  await writeFile(path.join(directory, '.gitignore'), await readFile(path.join(root, '.gitignore')));
  await writeNote(directory);
  await writeFile(path.join(directory, '.copilot-concierge/config.json'), '{}\n');
  await writeFile(path.join(directory, 'README.md'), 'Synthetic distributable source\n');
  git('add', '--all');
  const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
  assert.ok(!tracked.includes(note), 'git add --all must not publish local Scout notes');
  assert.ok(tracked.includes('.copilot-concierge/config.json'), 'The note exclusion must not hide project configuration');
  assert.ok(tracked.includes('README.md'));
  assert.doesNotThrow(() => assertNoTrackedLocalState(directory), 'Local ignored notes must not block a release');
  assert.equal(await readFile(path.join(directory, note), 'utf8'), sentinel);
});

test('release check rejects force-tracked Scout notes without reading or deleting them', async t => {
  const { directory, env, git } = await fixture(t);
  await copyPackage(root, directory);
  await writeNote(directory);
  git('add', '--force', '--', note);
  assert.ok(git('ls-files', '-z').split('\0').includes(note));
  const { version } = JSON.parse(await readFile(path.join(directory, 'plugin.json'), 'utf8'));
  const result = spawnSync(process.execPath, [path.join(directory, 'scripts/release-check.mjs'), '--tag', `v${version}`], {
    cwd: directory, env, encoding: 'utf8',
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Local Scout notes must not be tracked for release/);
  assert.ok(result.stderr.includes(note));
  assert.ok(!result.stderr.includes(sentinel.trim()), 'The guard must report paths, never private note contents');
  assert.equal(await readFile(path.join(directory, note), 'utf8'), sentinel);
});

test('package copies exclude local Scout note sentinels', async t => {
  const { directory, temporary } = await fixture(t);
  await copyPackage(root, directory);
  await writeNote(directory);
  const output = path.join(temporary, 'package');
  await copyPackage(directory, output);
  await assert.rejects(access(path.join(output, note)), { code: 'ENOENT' });
  assert.deepEqual(await readFile(path.join(output, 'plugin.json')), await readFile(path.join(root, 'plugin.json')));
  assert.equal(await readFile(path.join(directory, note), 'utf8'), sentinel);
});
