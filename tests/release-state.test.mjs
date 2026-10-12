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
const localState = [
  ['.copilot-concierge/project-notes.md', 'Synthetic private legacy Scout note: must never be published.\n'],
  ['.copilot-concierge/memory.json', '{"syntheticPrivateMemory":"repository-local copy must never be published"}\n'],
  ['.config/copilot-concierge/memory.json', '{"syntheticPrivateMemory":"copied home directory must never be published"}\n'],
];
const knowledge = 'docs/concierge/knowledge.md';
const knowledgeContent = '# Synthetic repository knowledge\n\nConfirmed: this fixture uses Node.js. Source: package.json.\n';

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

async function writeEntry(directory, relative, content) {
  await mkdir(path.dirname(path.join(directory, relative)), { recursive: true });
  await writeFile(path.join(directory, relative), content);
}

test('broad staging excludes private state while preserving repository knowledge and project configuration', async t => {
  const { directory, git } = await fixture(t);
  await writeFile(path.join(directory, '.gitignore'), await readFile(path.join(root, '.gitignore')));
  for (const [relative, sentinel] of localState) await writeEntry(directory, relative, sentinel);
  const distributable = [
    '.copilot-concierge/config.json', '.config/copilot-concierge/config.json',
    'docs/memory.json', 'src/memory.json',
  ];
  for (const relative of distributable) await writeEntry(directory, relative, '{}\n');
  await writeEntry(directory, knowledge, knowledgeContent);
  git('add', '--all');
  const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
  for (const [relative, sentinel] of localState) {
    assert.ok(!tracked.includes(relative), `git add --all must not publish ${relative}`);
    assert.equal(await readFile(path.join(directory, relative), 'utf8'), sentinel);
  }
  for (const relative of [...distributable, knowledge]) {
    assert.ok(tracked.includes(relative), `Private-state exclusions must not hide ${relative}`);
  }
  assert.doesNotThrow(() => assertNoTrackedLocalState(directory), 'Ignored private state and tracked knowledge must not block a release');
});

for (const [relative, sentinel] of localState) {
  test(`release check rejects force-tracked ${relative} without reading or deleting its contents`, async t => {
    const { directory, env, git } = await fixture(t);
    await copyPackage(root, directory);
    await writeEntry(directory, relative, sentinel);
    git('add', '--force', '--', relative);
    assert.ok(git('ls-files', '-z').split('\0').includes(relative));
    const { version } = JSON.parse(await readFile(path.join(directory, 'plugin.json'), 'utf8'));
    const result = spawnSync(process.execPath, [path.join(directory, 'scripts/release-check.mjs'), '--tag', `v${version}`], {
      cwd: directory, env, encoding: 'utf8',
    });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Private local state must not be tracked for release/);
    assert.ok(result.stderr.includes(relative));
    assert.ok(!result.stderr.includes(sentinel.trim()), 'The guard must report paths, never private contents');
    assert.equal(await readFile(path.join(directory, relative), 'utf8'), sentinel);
    // The guard must use tracked paths, not require readable working-tree data.
    await rm(path.join(directory, relative));
    assert.throws(() => assertNoTrackedLocalState(directory), /Private local state must not be tracked for release/);
  });
}

test('package copies include deliberately tracked repository knowledge and exclude private state', async t => {
  const { directory, temporary, git } = await fixture(t);
  await copyPackage(root, directory);
  await writeEntry(directory, knowledge, knowledgeContent);
  git('add', '--', knowledge);
  assert.ok(git('ls-files', '-z').split('\0').includes(knowledge));
  for (const [relative, sentinel] of localState) await writeEntry(directory, relative, sentinel);
  const output = path.join(temporary, 'package');
  await copyPackage(directory, output);
  for (const [relative, sentinel] of localState) {
    await assert.rejects(access(path.join(output, relative)), { code: 'ENOENT' });
    assert.equal(await readFile(path.join(directory, relative), 'utf8'), sentinel);
  }
  assert.equal(await readFile(path.join(output, knowledge), 'utf8'), knowledgeContent);
  assert.deepEqual(await readFile(path.join(output, 'plugin.json')), await readFile(path.join(root, 'plugin.json')));
});
