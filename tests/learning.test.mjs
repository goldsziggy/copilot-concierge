import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createLearning } from '../skills/scout/scripts/learning.mjs';

const supported = { skip: process.platform === 'win32' ? 'POSIX storage checks; Windows explicitly safe-stops.' : false };
const date = '2026-10-12';
const preference = (value = 'Use concise answers.') => ({ id: 'answer-length', kind: 'response_style', value, user_evidence: 'User explicitly asked to remember concise answers.', checked_on: date });
const fact = (summary = 'This repository uses Node.js.', source = 'package.json') => ({ id: 'node-runtime', category: 'Tech stack', status: 'confirmed', summary, sources: [{ path: source, locator: 'engines.node', checked_on: date }] });
async function fixture(t) {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'concierge-learning-')));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const home = path.join(directory, 'home');
  const a = path.join(directory, 'repo-a');
  const b = path.join(directory, 'repo-b');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  env.GIT_CONFIG_NOSYSTEM = '1';
  env.GIT_CONFIG_GLOBAL = os.devNull;
  const git = (repo, ...args) => execFileSync('git', ['-c', 'core.fsmonitor=false', '-C', repo, ...args], { env, stdio: 'pipe' });
  for (const repo of [home, a, b]) await fs.mkdir(repo);
  for (const repo of [a, b]) {
    git(repo, 'init', '--quiet');
    await fs.writeFile(path.join(repo, 'package.json'), '{"engines":{"node":">=20"}}\n');
  }
  const api = createLearning({ home });
  return { directory, home, a, b, git, api, memory: path.join(home, '.config/copilot-concierge/memory.json'), knowledge: path.join(a, 'docs/concierge/knowledge.md') };
}
const write = (api, store, action, project, expected_revision, fields = {}) => api.run(store, action, { ...(project ? { project } : {}), payload: { expected_revision, ...fields } });

// OS account data is never touched; every store uses the module's disposable home.
test('private preferences persist across reloads and repositories; correct, remove and disable forget without backups', supported, async t => {
  const { api, home, a, b, memory } = await fixture(t);
  assert.deepEqual((await api.run('memory', 'read')).state.preferences, []);
  let result = await write(api, 'memory', 'set', a, null, { record: preference() });
  const reopened = createLearning({ home });
  assert.deepEqual((await reopened.run('memory', 'read', { project: b })).state.preferences, [preference()]);
  result = await write(reopened, 'memory', 'set', b, result.revision, { record: preference('Use detailed answers.') });
  assert.equal(result.count, 1);
  assert.ok(!Object.hasOwn(result, 'state'));
  assert.equal((await api.run('memory', 'read')).state.preferences[0].value, 'Use detailed answers.');
  result = await write(api, 'memory', 'remove', undefined, result.revision, { id: 'answer-length' });
  assert.equal(result.count, 0);
  result = await write(api, 'memory', 'set', undefined, result.revision, { record: preference() });
  result = await write(api, 'memory', 'disable', undefined, result.revision);
  assert.equal(result.enabled, false);
  assert.equal(result.count, 0);
  await assert.rejects(write(api, 'memory', 'set', a, result.revision, { record: preference() }), /disabled/);
  result = await write(api, 'memory', 'enable', undefined, result.revision);
  assert.equal(result.count, 0);
  result = await write(api, 'memory', 'clear', undefined, result.revision);
  assert.deepEqual(await fs.readdir(path.dirname(memory)), ['memory.json']);
  assert.equal((await fs.stat(memory)).mode & 0o777, 0o600);
  assert.equal((await fs.stat(path.dirname(memory))).mode & 0o777, 0o700);
  assert.ok(!(await fs.readFile(memory, 'utf8')).includes('concise'));
});

test('knowledge persists only in the assigned repo with readable categories and no private memory copying', supported, async t => {
  const { api, home, a, b, memory, knowledge, git } = await fixture(t);
  await write(api, 'memory', 'set', a, null, { record: preference('Private synthetic preference sentinel.') });
  let result = await write(api, 'knowledge', 'upsert', a, null, { record: fact() });
  assert.deepEqual((await createLearning({ home }).run('knowledge', 'read', { project: a })).state.records, [fact()]);
  assert.deepEqual((await api.run('knowledge', 'read', { project: b })).state.records, []);
  const bytes = await fs.readFile(knowledge, 'utf8');
  for (const category of ['Tech stack', 'Conventions', 'Business rules', 'Findings', 'Decisions']) assert.ok(bytes.includes(`## ${category}`));
  assert.ok(bytes.includes('Source: `package.json` — engines.node (checked 2026-10-12)'));
  assert.ok(!bytes.includes('Private synthetic') && !bytes.includes(home) && !bytes.includes(a));
  assert.ok(!(await fs.readFile(memory, 'utf8')).includes('node-runtime'));
  assert.equal(git(a, 'ls-files').toString(), '', 'helper never stages knowledge');
  result = await write(api, 'knowledge', 'upsert', a, result.revision, { record: fact('This repository requires Node.js 20 or later.') });
  assert.equal(result.state.records.length, 1);
  result = await write(api, 'knowledge', 'remove', a, result.revision, { id: 'node-runtime' });
  assert.deepEqual(result.state.records, []);
});

test('separate strict schemas reject assumptions, transcripts, approval settings and undocumented decisions', supported, async t => {
  const { api, a } = await fixture(t);
  for (const record of [fact(), { ...preference(), transcript: 'dump' }, { ...preference(), kind: 'approval' }, { ...preference(), user_evidence: '' }]) {
    await assert.rejects(write(api, 'memory', 'set', a, null, { record }));
  }
  for (const record of [preference(), { ...fact(), status: 'assumption' }, { ...fact(), category: 'Decisions' }, { ...fact(), sources: [] }]) {
    await assert.rejects(write(api, 'knowledge', 'upsert', a, null, { record }));
  }
  const decision = { ...fact('Use Node.js for this service.'), category: 'Decisions', decision_evidence: 'User chose Node.js for the service.' };
  assert.deepEqual((await write(api, 'knowledge', 'upsert', a, null, { record: decision })).state.records, [decision]);
});

test('knowledge preserves user-authored prefix and suffix byte for byte', supported, async t => {
  const { api, a, knowledge } = await fixture(t);
  await write(api, 'knowledge', 'upsert', a, null, { record: fact() });
  const original = await fs.readFile(knowledge);
  const prefix = Buffer.from('\uFEFF# Our team docs\r\n\r\nKeep café and spacing.  \r\n');
  const suffix = Buffer.from('\r\n## User-owned notes\r\nDo not rewrite this!\r\n');
  await fs.writeFile(knowledge, Buffer.concat([prefix, original, suffix]));
  const read = await api.run('knowledge', 'read', { project: a });
  await write(api, 'knowledge', 'upsert', a, read.revision, { record: fact('Node.js 20 is the minimum runtime.') });
  const changed = await fs.readFile(knowledge);
  assert.ok(changed.subarray(0, prefix.length).equals(prefix));
  assert.ok(changed.subarray(-suffix.length).equals(suffix));
});

test('unowned, malformed, duplicate and hand-edited managed docs are preserved and refused', supported, async t => {
  const { api, a, knowledge } = await fixture(t);
  await write(api, 'knowledge', 'upsert', a, null, { record: fact() });
  const valid = await fs.readFile(knowledge, 'utf8');
  for (const content of ['# Existing team knowledge\nKeep it.\n', valid + '<!-- concierge-knowledge:start -->', valid.replace('<!-- concierge-knowledge:end -->', ''), valid.replace('This repository uses Node.js.\n', 'Changed by human.\n'), valid.replace('concierge-state:', 'edited-state:')]) {
    await fs.writeFile(knowledge, content);
    await assert.rejects(api.run('knowledge', 'read', { project: a }));
    await assert.rejects(write(api, 'knowledge', 'upsert', a, null, { record: fact() }));
    assert.equal(await fs.readFile(knowledge, 'utf8'), content);
  }
});

test('stale revisions and concurrent helper writers cannot silently overwrite another update', supported, async t => {
  const { api, a, knowledge } = await fixture(t);
  const initial = await write(api, 'knowledge', 'upsert', a, null, { record: fact() });
  const results = await Promise.allSettled([
    write(api, 'knowledge', 'upsert', a, initial.revision, { record: fact('First proposed correction.') }),
    write(api, 'knowledge', 'upsert', a, initial.revision, { record: fact('Second proposed correction.') })
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  const bytes = await fs.readFile(knowledge);
  await assert.rejects(write(api, 'knowledge', 'remove', a, initial.revision, { id: 'node-runtime' }), /Revision conflict/);
  assert.ok((await fs.readFile(knowledge)).equals(bytes));
  assert.deepEqual(await fs.readdir(path.dirname(knowledge)), ['knowledge.md']);
});

test('legacy migration selects reverified facts, preserves original bytes and retires repeat reads', supported, async t => {
  const { api, a, knowledge } = await fixture(t);
  const legacy = path.join(a, '.copilot-concierge/project-notes.md');
  const original = Buffer.from('# Old notes\r\n- Keep: Node.js; package.json engines.node.\r\n- Unverified discarded assumption.\r\n');
  await fs.mkdir(path.dirname(legacy));
  await fs.writeFile(legacy, original);
  const read = await api.run('legacy', 'read', { project: a });
  const result = await write(api, 'knowledge', 'migrate', a, null, { expected_legacy_revision: read.revision, records: [fact()] });
  assert.deepEqual(result.state.records, [fact()]);
  assert.equal(result.state.migration.legacy_revision, read.revision);
  assert.ok((await fs.readFile(legacy)).equals(original));
  assert.ok(!(await fs.readFile(knowledge, 'utf8')).includes('Unverified discarded'));
  assert.deepEqual(await api.run('legacy', 'read', { project: a }), { path: legacy, revision: read.revision, retired: true, content: null });
  const replay = await write(api, 'knowledge', 'migrate', a, result.revision, { expected_legacy_revision: read.revision, records: [] });
  assert.equal(replay.changed, false);
  assert.equal(replay.already_migrated, true);
  const updated = await write(api, 'knowledge', 'upsert', a, result.revision, { record: fact('Node.js is confirmed in the current manifest.') });
  assert.equal(updated.state.migration.legacy_revision, read.revision);
  assert.ok((await fs.readFile(legacy)).equals(original));
  const removed = await write(api, 'knowledge', 'remove', a, updated.revision, { id: 'node-runtime' });
  const replayAfterRemoval = await write(api, 'knowledge', 'migrate', a, removed.revision, { expected_legacy_revision: read.revision, records: [fact()] });
  assert.deepEqual(replayAfterRemoval.state.records, [], 'replayed migration must never resurrect corrected or removed knowledge');
  assert.equal(replayAfterRemoval.changed, false);
  await assert.rejects(write(api, 'knowledge', 'migrate', a, removed.revision, { expected_legacy_revision: '0'.repeat(64), records: [] }), /different legacy/);
});

test('migration rejects changed legacy notes, assumptions, absent notes and legacy-as-source', supported, async t => {
  const { api, a } = await fixture(t);
  const legacy = path.join(a, '.copilot-concierge/project-notes.md');
  await fs.mkdir(path.dirname(legacy));
  await fs.writeFile(legacy, '# Old note\n');
  const read = await api.run('legacy', 'read', { project: a });
  await fs.writeFile(legacy, '# Concurrent change\n');
  await assert.rejects(write(api, 'knowledge', 'migrate', a, null, { expected_legacy_revision: read.revision, records: [fact()] }), /changed/);
  const latest = await api.run('legacy', 'read', { project: a });
  for (const record of [{ ...fact(), status: 'assumption' }, fact('Old note says so.', '.copilot-concierge/project-notes.md')]) {
    await assert.rejects(write(api, 'knowledge', 'migrate', a, null, { expected_legacy_revision: latest.revision, records: [record] }));
  }
  await fs.rm(legacy);
  await assert.rejects(write(api, 'knowledge', 'migrate', a, null, { expected_legacy_revision: latest.revision, records: [] }), /changed/);
});

test('store rejects symlinked directories, symlinked files and hard links without touching their targets', supported, async t => {
  const { api, directory, a, knowledge } = await fixture(t);
  const outside = path.join(directory, 'outside');
  await fs.mkdir(outside);
  await fs.symlink(outside, path.join(a, 'docs'));
  await assert.rejects(api.run('knowledge', 'read', { project: a }), /Unsafe/);
  await assert.rejects(write(api, 'knowledge', 'upsert', a, null, { record: fact() }), /Unsafe/);
  assert.deepEqual(await fs.readdir(outside), []);
  await fs.unlink(path.join(a, 'docs'));
  await fs.mkdir(path.dirname(knowledge), { recursive: true });
  const target = path.join(outside, 'target.md');
  await fs.writeFile(target, 'unchanged');
  await fs.symlink(target, knowledge);
  await assert.rejects(api.run('knowledge', 'read', { project: a }), /ordinary file/);
  await fs.unlink(knowledge);
  await fs.link(target, knowledge);
  await assert.rejects(api.run('knowledge', 'read', { project: a }), /one hard link/);
  assert.equal(await fs.readFile(target, 'utf8'), 'unchanged');
});

test('source evidence rejects missing, circular, outside, symlink and hardlinked files', supported, async t => {
  const { api, directory, a } = await fixture(t);
  const external = path.join(directory, 'external.txt');
  await fs.writeFile(external, 'synthetic external data');
  await fs.symlink(external, path.join(a, 'linked.txt'));
  await fs.link(external, path.join(a, 'hardlinked.txt'));
  await fs.mkdir(path.join(a, 'folder'));
  for (const source of ['missing.txt', '../external.txt', external, '.git/config', 'docs/concierge/knowledge.md', 'linked.txt', 'hardlinked.txt', 'folder']) {
    await assert.rejects(write(api, 'knowledge', 'upsert', a, null, { record: fact('Unsupported evidence.', source) }));
  }
});

test('private storage rejects unsafe permissions, hard links and repository home independently of assigned project', supported, async t => {
  const { api, home, a, b, memory, git } = await fixture(t);
  await write(api, 'memory', 'set', undefined, null, { record: preference() });
  await fs.chmod(memory, 0o644);
  await assert.rejects(api.run('memory', 'read'), /mode 0600/);
  await fs.chmod(memory, 0o600);
  await fs.chmod(path.dirname(memory), 0o755);
  assert.equal((await api.run('memory', 'read')).state.preferences.length, 1, 'an existing non-writable config directory is supported');
  await fs.chmod(path.dirname(memory), 0o775);
  await assert.rejects(api.run('memory', 'read'), /not writable/);
  await fs.chmod(path.dirname(memory), 0o700);
  await fs.link(memory, path.join(a, 'copied-memory.json'));
  await assert.rejects(api.run('memory', 'read', { project: b }), /one hard link/);
  await fs.unlink(path.join(a, 'copied-memory.json'));
  git(home, 'init', '--quiet');
  await assert.rejects(api.run('memory', 'read'), /Git working tree/);
  await assert.rejects(api.run('memory', 'read', { project: b }), /Git working tree/);
  await assert.rejects(api.run('memory', 'read', { project: home }), /assigned repository/);
});

test('private symlinked config paths, memory files and nonregular files fail closed', supported, async t => {
  const { api, home, directory, memory } = await fixture(t);
  const outside = path.join(directory, 'outside');
  await fs.mkdir(outside);
  await fs.symlink(outside, path.join(home, '.config'));
  await assert.rejects(api.run('memory', 'read'), /Unsafe/);
  await fs.unlink(path.join(home, '.config'));
  await fs.mkdir(path.dirname(memory), { recursive: true, mode: 0o700 });
  const target = path.join(outside, 'private.json');
  await fs.writeFile(target, '{}', { mode: 0o600 });
  await fs.symlink(target, memory);
  await assert.rejects(api.run('memory', 'read'), /ordinary file/);
  await fs.unlink(memory);
  await fs.mkdir(memory);
  await assert.rejects(api.run('memory', 'read'), /ordinary file/);
  assert.equal(await fs.readFile(target, 'utf8'), '{}');
});

test('bounded reads and record counts stop oversized or malformed persistence', supported, async t => {
  const { api, a, memory, knowledge } = await fixture(t);
  await fs.mkdir(path.dirname(memory), { recursive: true, mode: 0o700 });
  await fs.writeFile(memory, 'x'.repeat(8193), { mode: 0o600 });
  await assert.rejects(api.run('memory', 'read'), /exceeds/);
  await fs.writeFile(memory, '{invalid');
  await assert.rejects(api.run('memory', 'read'), /Malformed/);
  await fs.mkdir(path.dirname(knowledge), { recursive: true });
  await fs.writeFile(knowledge, 'x'.repeat(262145));
  await assert.rejects(api.run('knowledge', 'read', { project: a }), /exceeds/);
  await fs.rm(knowledge);
  const legacy = path.join(a, '.copilot-concierge/project-notes.md');
  await fs.mkdir(path.dirname(legacy));
  await fs.writeFile(legacy, 'x'.repeat(2049));
  await assert.rejects(api.run('legacy', 'read', { project: a }), /exceeds/);
  await fs.writeFile(legacy, '# Notes\n');
  const read = await api.run('legacy', 'read', { project: a });
  const records = Array.from({ length: 41 }, (_, i) => ({ ...fact(), id: `fact-${i}` }));
  await assert.rejects(write(api, 'knowledge', 'migrate', a, null, { expected_legacy_revision: read.revision, records }), /Invalid knowledge/);
});

test('only explicit canonical Git roots are accepted; environment Git redirection is ignored', supported, async t => {
  const { api, a, b, directory } = await fixture(t);
  await assert.rejects(api.run('knowledge', 'read'), /explicit absolute/);
  await assert.rejects(api.run('knowledge', 'read', { project: '.' }), /explicit absolute/);
  await fs.mkdir(path.join(a, 'nested'));
  await assert.rejects(api.run('knowledge', 'read', { project: path.join(a, 'nested') }), /exact assigned/);
  await fs.symlink(a, path.join(directory, 'alias'));
  await assert.rejects(api.run('knowledge', 'read', { project: path.join(directory, 'alias') }), /canonical/);
  const old = process.env.GIT_DIR;
  process.env.GIT_DIR = path.join(b, '.git');
  try { assert.equal((await api.run('knowledge', 'read', { project: a })).revision, null); }
  finally { if (old === undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR = old; }
});

test('existing update locks stop writes without deleting another operation lock', supported, async t => {
  const { api, a, knowledge } = await fixture(t);
  await fs.mkdir(path.dirname(knowledge), { recursive: true });
  const lock = path.join(path.dirname(knowledge), '.knowledge.md.concierge-lock');
  await fs.writeFile(lock, 'another operation');
  await assert.rejects(write(api, 'knowledge', 'upsert', a, null, { record: fact() }), /in progress|stale lock/);
  assert.equal(await fs.readFile(lock, 'utf8'), 'another operation');
  await assert.rejects(fs.access(knowledge), { code: 'ENOENT' });
});

test('Windows persistence safe-stops before filesystem or repository access', async () => {
  const api = createLearning({ home: '/not-used', platform: 'win32' });
  for (const store of ['memory', 'knowledge', 'legacy']) await assert.rejects(api.run(store, 'read'), /Windows.*reparse points.*ACLs/);
});


test('stale existing evidence never prevents correcting or removing other knowledge', supported, async t => {
  const { api, a } = await fixture(t);
  await fs.writeFile(path.join(a, 'obsolete.md'), '# Old convention\n');
  const old = { ...fact('Old convention.', 'obsolete.md'), id: 'old-convention', category: 'Conventions' };
  let result = await write(api, 'knowledge', 'upsert', a, null, { record: old });
  result = await write(api, 'knowledge', 'upsert', a, result.revision, { record: fact() });
  await fs.rm(path.join(a, 'obsolete.md'));
  result = await write(api, 'knowledge', 'upsert', a, result.revision, { record: fact('Current Node.js fact.') });
  assert.equal(result.state.records.length, 2);
  result = await write(api, 'knowledge', 'remove', a, result.revision, { id: 'node-runtime' });
  assert.deepEqual(result.state.records, [old]);
  result = await write(api, 'knowledge', 'remove', a, result.revision, { id: 'old-convention' });
  assert.deepEqual(result.state.records, []);
});

test('private memory copies and common credential paths cannot be knowledge sources', supported, async t => {
  const { api, a } = await fixture(t);
  for (const source of ['.copilot-concierge/memory.json', '.config/copilot-concierge/memory.json', '.env', '.env.local', 'keys/id_rsa', 'keys/private.pem', 'credentials.json']) {
    await fs.mkdir(path.dirname(path.join(a, source)), { recursive: true });
    await fs.writeFile(path.join(a, source), 'synthetic private fixture');
    await assert.rejects(write(api, 'knowledge', 'upsert', a, null, { record: fact('Must not persist this.', source) }), /Private memory and credential/);
  }
});

test('memory bounds enforce both twenty current preferences and eight KiB', supported, async t => {
  const { api, memory } = await fixture(t);
  await fs.mkdir(path.dirname(memory), { recursive: true, mode: 0o700 });
  const preferences = Array.from({ length: 21 }, (_, i) => ({ ...preference(), id: `preference-${i}` }));
  await fs.writeFile(memory, JSON.stringify({ schema: 1, enabled: true, preferences }), { mode: 0o600 });
  await assert.rejects(api.run('memory', 'read'), /Invalid memory/);
  await fs.writeFile(memory, JSON.stringify({ schema: 1, enabled: true, preferences: Array.from({ length: 12 }, (_, i) => ({ ...preference(), id: `long-${i}`, value: 'v'.repeat(240), user_evidence: 'e'.repeat(300) })) }));
  // Compact input remains under 8KiB, but its canonical representation exceeds it.
  await assert.rejects(api.run('memory', 'read'), /8 KiB|exceeds/);
});

test('CLI help and invalid usage do not wait for input or touch stores', () => {
  const cli = fileURLToPath(new URL('../skills/scout/scripts/learning.mjs', import.meta.url));
  const result = execFileSync(process.execPath, [cli, '--help'], { encoding: 'utf8', timeout: 5000 });
  assert.match(result, /expected_revision/);
  assert.match(result, /Memory mutation output omits private preferences/);
  assert.throws(() => execFileSync(process.execPath, [cli], { stdio: 'pipe', timeout: 5000 }), error => error.status === 1 && /Usage:/.test(error.stderr.toString()));
});


test('knowledge updates preserve existing permissions and user-authored text', supported, async t => {
  const { api, a, knowledge } = await fixture(t);
  await write(api, 'knowledge', 'upsert', a, null, { record: fact() });
  const prefix = '# Restricted team notes\n\n';
  await fs.writeFile(knowledge, prefix + await fs.readFile(knowledge, 'utf8'));
  for (const mode of [0o600, 0o640]) {
    await fs.chmod(knowledge, mode);
    const current = await api.run('knowledge', 'read', { project: a });
    await write(api, 'knowledge', 'upsert', a, current.revision, { record: fact(`Node.js fact with mode ${mode}.`) });
    assert.equal((await fs.stat(knowledge)).mode & 0o777, mode);
    assert.ok((await fs.readFile(knowledge, 'utf8')).startsWith(prefix));
  }
});

test('canonical evidence rejects case aliases for knowledge, legacy and private files', supported, async t => {
  const { api, a } = await fixture(t);
  const original = await write(api, 'knowledge', 'upsert', a, null, { record: fact() });
  for (const source of ['docs/concierge/Knowledge.md', '.copilot-concierge/Project-Notes.md', '.copilot-concierge/Memory.json', '.config/copilot-concierge/Memory.json', '.GIT/config', '.ENV.production']) {
    await assert.rejects(write(api, 'knowledge', 'upsert', a, original.revision, { record: fact('Alias is not valid evidence.', source) }));
  }
  // On case-insensitive hosts an ordinary source alias exists but is noncanonical.
  try { await fs.access(path.join(a, 'Package.json')); }
  catch { return; }
  await assert.rejects(write(api, 'knowledge', 'upsert', a, original.revision, { record: fact('Noncanonical spelling.', 'Package.json') }), /canonical filesystem spelling/);
});

test('knowledge HTML metadata roundtrips arrows safely and rejects Markdown-delimited paths', supported, async t => {
  const { api, a, knowledge } = await fixture(t);
  const record = fact('An input --> output arrow and <tag> describe this finding.');
  record.sources[0].locator = 'section <render> --> output';
  const result = await write(api, 'knowledge', 'upsert', a, null, { record });
  const text = await fs.readFile(knowledge, 'utf8');
  const metadata = text.split('\n')[1];
  assert.equal(metadata.indexOf('-->'), metadata.length - 3, 'only the terminating comment delimiter may be literal');
  assert.ok(metadata.includes('\\u003e'));
  assert.deepEqual((await api.run('knowledge', 'read', { project: a })).state.records, [record]);
  await fs.writeFile(path.join(a, 'unsafe`source.md'), '# Synthetic evidence\n');
  await assert.rejects(write(api, 'knowledge', 'upsert', a, result.revision, { record: fact('Unsafe delimiter.', 'unsafe`source.md') }), /Markdown code delimiters/);
});

test('retired legacy paths are never read again when replaced by oversized files or symlinks', supported, async t => {
  const { api, a, directory } = await fixture(t);
  const legacy = path.join(a, '.copilot-concierge/project-notes.md');
  await fs.mkdir(path.dirname(legacy));
  await fs.writeFile(legacy, '# Selected old note\n');
  const read = await api.run('legacy', 'read', { project: a });
  await write(api, 'knowledge', 'migrate', a, null, { expected_legacy_revision: read.revision, records: [] });
  const retired = { path: legacy, revision: read.revision, retired: true, content: null };
  await fs.writeFile(legacy, 'oversized changed retired notes'.repeat(200));
  assert.deepEqual(await api.run('legacy', 'read', { project: a }), retired);
  await fs.rm(legacy);
  const outside = path.join(directory, 'must-not-read.txt');
  await fs.writeFile(outside, 'synthetic old content outside root');
  await fs.symlink(outside, legacy);
  assert.deepEqual(await api.run('legacy', 'read', { project: a }), retired);
  await fs.rm(legacy);
  await fs.rmdir(path.dirname(legacy));
  await fs.symlink(directory, path.dirname(legacy));
  assert.deepEqual(await api.run('legacy', 'read', { project: a }), retired, 'retired parent path is not traversed either');
});

test('CLI mutation preserves multibyte UTF-8 split across stdin chunks and refuses malformed UTF-8', supported, async t => {
  const { api, a, b } = await fixture(t);
  const cli = fileURLToPath(new URL('../skills/scout/scripts/learning.mjs', import.meta.url));
  const record = fact('The café service uses Node.js.');
  const input = Buffer.from(JSON.stringify({ expected_revision: null, record }));
  const split = input.indexOf(Buffer.from('é')) + 1;
  const child = spawn(process.execPath, [cli, 'knowledge', 'upsert', '--project', a], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const done = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  child.stdin.write(input.subarray(0, split));
  await new Promise(resolve => setTimeout(resolve, 100));
  child.stdin.end(input.subarray(split));
  assert.equal(await done, 0, stderr);
  assert.deepEqual(JSON.parse(stdout).state.records, [record]);
  assert.deepEqual((await api.run('knowledge', 'read', { project: a })).state.records, [record]);
  const invalid = Buffer.from(input);
  invalid[split] = 0xff;
  assert.throws(() => execFileSync(process.execPath, [cli, 'knowledge', 'upsert', '--project', b], { input: invalid, stdio: 'pipe' }), error => error.status === 1 && /UTF-8/.test(error.stderr.toString()));
  assert.equal((await api.run('knowledge', 'read', { project: b })).revision, null);
});


test('malformed Unicode is rejected before persistence while emoji roundtrips', supported, async t => {
  const { api, a, knowledge, memory } = await fixture(t);
  for (const malformed of ['A\ud800B', 'A\udc00B']) {
    await assert.rejects(write(api, 'knowledge', 'upsert', a, null, { record: fact(malformed) }), /well-formed Unicode/);
    await assert.rejects(write(api, 'memory', 'set', undefined, null, { record: preference(malformed) }), /well-formed Unicode/);
    await assert.rejects(fs.access(path.dirname(knowledge)), { code: 'ENOENT' });
    await assert.rejects(fs.access(path.dirname(memory)), { code: 'ENOENT' });
  }
  const record = fact('The service supports a robot 🤖 and café text.');
  const result = await write(api, 'knowledge', 'upsert', a, null, { record });
  assert.deepEqual((await api.run('knowledge', 'read', { project: a })).state.records, [record]);
  assert.ok((await fs.readFile(knowledge, 'utf8')).includes('🤖'));
  const before = await fs.readFile(knowledge);
  await assert.rejects(write(api, 'knowledge', 'upsert', a, result.revision, { record: fact('A\ud800B') }), /well-formed Unicode/);
  assert.ok((await fs.readFile(knowledge)).equals(before));
});
