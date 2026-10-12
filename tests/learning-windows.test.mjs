import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createLearning } from '../skills/scout/scripts/learning.mjs';
import { createWindowsStorage, windowsPath, powershellExecutable, invokeWindows } from '../skills/scout/scripts/learning-windows.mjs';

const native = { skip: process.platform !== 'win32' ? 'Requires real Windows NTFS, PowerShell 5.1 and native ACL/handle APIs.' : false };
const preference = value => ({ id: 'answer-style', kind: 'response_style', value, user_evidence: 'User explicitly requested this presentation preference.', checked_on: '2026-10-12' });
const fact = summary => ({ id: 'runtime', category: 'Tech stack', status: 'confirmed', summary, sources: [{ path: 'package.json', locator: 'engines.node', checked_on: '2026-10-12' }] });
const cli = fileURLToPath(new URL('../skills/scout/scripts/learning.mjs', import.meta.url));
// Exact adapter messages, so a crash reported through the generic error cannot pass.
const unsafePath = /^Windows learning requires an ordinary canonical path on a local fixed NTFS drive, without links, reparse points or path aliases\.$/;
const unsafeAcl = /^Windows learning cannot verify the required ownership and access protections; existing permissions were not repaired\.$/;
const conflict = /^Learning state, permissions or directory identity changed; read current state before retrying\.$/;

// Portable tests cover request construction and lexical input handling only.
// They do not simulate NTFS, access tokens, DACLs or Windows replacement semantics.
test('Windows path transport rejects aliases, devices and alternate streams before native access', () => {
  assert.equal(windowsPath('C:\\Projects\\café 🤖'), 'C:\\Projects\\café 🤖');
  assert.equal(windowsPath('D:\\'), 'D:\\');
  for (const input of ['relative', 'C:relative', 'c:\\repo', 'C:/Projects', '\\\\server\\share', '\\\\?\\C:\\repo', '\\\\.\\C:\\repo', 'C:\\repo\\..\\other', 'C:\\repo\\file:secret', 'C:\\repo\\name.', 'C:\\repo\\name ', 'C:\\repo\\CON', 'C:\\repo\\NUL.txt', 'C:\\repo\\COM1.log', 'C:\\PROGRA~1\\repo', 'C:\\repo\\bad\u0000name']) assert.throws(() => windowsPath(input), /Windows|Unsupported/);
  assert.equal(powershellExecutable('C:\\Windows'), 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
});

test('Windows adapter starts only the bundled ASCII script, without profiles, policy bypass, elevation or a shell', async () => {
  const source = await fs.readFile(new URL('../skills/scout/scripts/learning-windows.mjs', import.meta.url), 'utf8');
  const script = await fs.readFile(new URL('../skills/scout/scripts/learning-windows.ps1', import.meta.url), 'utf8');
  const start = source.indexOf('spawn(executable');
  const invocation = source.slice(start, source.indexOf('});', start));
  assert.match(invocation, /\['-NoLogo', '-NoProfile', '-NonInteractive', '-File', nativeScript\]/);
  assert.match(invocation, /shell: false/);
  assert.doesNotMatch(source, /ExecutionPolicy|EncodedCommand|'-Command'|'-ep'|RunAs/i);
  // Windows PowerShell 5.1 reads a BOM-less script in the ANSI code page.
  assert.match(script, /^[\x00-\x7f]*$/);
  assert.doesNotMatch(script, /ExecutionPolicy|Set-Acl|SetAccessControl|Invoke-Expression|Start-Process|RunAs/i);
});

test('Windows adapter preserves UTF-8 bytes and CAS/ACL snapshots over the native protocol', async () => {
  const data = Buffer.from('Café 🤖\n');
  const calls = [];
  const snapshot = { bytes: data.toString('base64'), identity: 'volume:file', parents: [{ path: 'C:\\repo', identity: 'volume:directory' }], acl: 'fixture-acl', revision: 'a'.repeat(64) };
  const api = createWindowsStorage({ invoke: async request => {
    calls.push(request);
    if (request.op === 'context') return { home: 'C:\\Users\\fixture' };
    if (request.op === 'project') return { root: request.root };
    if (request.op === 'read') return snapshot;
    return {};
  } });
  assert.equal(await api.home(), 'C:\\Users\\fixture');
  const root = await api.project('C:\\repo');
  const original = await api.read(root, 'C:\\repo\\knowledge.md', 1024);
  assert.ok(original.bytes.equals(data));
  await api.write(root, 'C:\\repo\\knowledge.md', original, data, 1024, false);
  const request = calls.at(-1);
  assert.equal(request.op, 'write');
  assert.deepEqual(request.original, { identity: snapshot.identity, parents: snapshot.parents, acl: snapshot.acl, revision: snapshot.revision });
  assert.ok(Buffer.from(request.bytes, 'base64').equals(data));
  assert.equal(request.privateFile, false);
});

test('Windows adapter refuses malformed or oversized native bytes and oversized writes', async () => {
  for (const bytes of ['not base64!', Buffer.alloc(20).toString('base64')]) {
    const api = createWindowsStorage({ invoke: async () => ({ bytes }) });
    await assert.rejects(api.read('C:\\repo', 'C:\\repo\\note.md', 10), /encoding|allowed limit/);
  }
  let called = false;
  const api = createWindowsStorage({ invoke: async () => { called = true; } });
  await assert.rejects(api.write('C:\\repo', 'C:\\repo\\note.md', {}, Buffer.alloc(20), 10, false), /allowed limit/);
  assert.equal(called, false);
});

async function fixture(t) {
  // The native profile lookup performs metadata checks only. Keep fixtures in a
  // disposable sibling of the real .config store, never in actual memory data.
  const account = await invokeWindows({ op: 'context' });
  const directory = await fs.realpath(await fs.mkdtemp(path.join(account.home, 'concierge-native-windows-')));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const home = path.join(directory, 'home');
  const repo = path.join(directory, 'repo');
  await fs.mkdir(home);
  await fs.mkdir(repo);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  env.GIT_CONFIG_NOSYSTEM = '1'; env.GIT_CONFIG_GLOBAL = '/dev/null';
  const git = (...args) => execFileSync('git', ['-c', 'core.fsmonitor=false', '-C', repo, ...args], { env, stdio: 'pipe' });
  git('init', '--quiet');
  await fs.writeFile(path.join(repo, 'package.json'), '{"engines":{"node":">=20"}}\n');
  const api = createLearning({ home });
  return { directory, home, repo, api, git, sid: account.sid, memory: path.join(home, '.config', 'copilot-concierge', 'memory.json'), knowledge: path.join(repo, 'docs', 'concierge', 'knowledge.md') };
}
const mutate = (api, store, action, project, revision, extra = {}) => api.run(store, action, { ...(project ? { project } : {}), payload: { expected_revision: revision, ...extra } });
function powershell(body, target) {
  // Test-only fixed scripts. The fixture path arrives through the environment:
  // Windows PowerShell consumes redirected stdin itself under -Command.
  const command = "$ErrorActionPreference='Stop'; $p=$env:CONCIERGE_FIXTURE_PATH; " + body;
  return execFileSync(powershellExecutable(process.env.SystemRoot), ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], { env: { ...process.env, CONCIERGE_FIXTURE_PATH: target }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
}
// .NET calls instead of Get-Acl/Set-Acl: a Windows PowerShell child can inherit
// PowerShell 7's module path, which prevents the Security module from loading.
const acl = "$d=[System.IO.Directory]::Exists($p); $a=if ($d) { [System.IO.Directory]::GetAccessControl($p) } else { [System.IO.File]::GetAccessControl($p) }; ";
// Adds an Everyone allow rule, as a user or another tool might.
const grantEveryone = (target, rights) => powershell(acl + `$s=New-Object System.Security.Principal.SecurityIdentifier('S-1-1-0'); $a.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($s, '${rights}', 'Allow'))); if ($d) { [System.IO.Directory]::SetAccessControl($p, $a) } else { [System.IO.File]::SetAccessControl($p, $a) }`, target);
const sddl = target => powershell(acl + "$a.GetSecurityDescriptorSddlForm('Access,Owner,Group')", target).trim();
// Independent read-only view of an object's owner and DACL by SID, via the OS.
function security(target) {
  const body = acl + '$t=[System.Security.Principal.SecurityIdentifier]; [pscustomobject]@{ owner=$a.GetOwner($t).Value; protected=$a.AreAccessRulesProtected; rules=@($a.GetAccessRules($true, $true, $t) | ForEach-Object { [pscustomobject]@{ sid=$_.IdentityReference.Value; allow=($_.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Allow); inherited=$_.IsInherited } }) } | ConvertTo-Json -Compress -Depth 4';
  return JSON.parse(powershell(body, target));
}
function assertCurrentUserOnly(target, sid) {
  const info = security(target);
  assert.equal(info.owner, sid, `${target} owner`);
  assert.equal(info.protected, true, `${target} must not inherit access`);
  assert.ok(info.rules.length > 0, `${target} needs an explicit current-user rule`);
  for (const rule of info.rules) assert.deepEqual(rule, { sid, allow: true, inherited: false }, `${target} grants only the current account`);
}
function assertInherits(target) {
  const info = security(target);
  assert.equal(info.protected, false, `${target} should inherit like other repository files`);
  assert.ok(info.rules.length > 0, `${target} should keep inherited access rules`);
  // Updates must not turn inherited rules into explicit copies.
  for (const rule of info.rules) assert.equal(rule.inherited, true, `${target} has only inherited rules`);
}

test('native Windows private memory persists, corrects and forgets with a verified restrictive DACL', native, async t => {
  const { api, home, repo, memory, sid } = await fixture(t);
  let result = await mutate(api, 'memory', 'set', repo, null, { record: preference('Use concise café 🤖 answers.') });
  assert.equal(result.count, 1);
  // Created directories and the file grant only the current account SID.
  for (const target of [path.dirname(path.dirname(memory)), path.dirname(memory), memory]) assertCurrentUserOnly(target, sid);
  const original = await invokeWindows({ op: 'read', root: home, file: memory, limit: 8192, privateFile: true });
  assert.equal(original.identity === null, false);
  assert.equal(typeof original.acl, 'string');
  const reload = createLearning({ home });
  assert.equal((await reload.run('memory', 'read')).state.preferences[0].value, 'Use concise café 🤖 answers.');
  result = await mutate(api, 'memory', 'set', undefined, result.revision, { record: preference('Prefer detailed answers.') });
  const changed = await invokeWindows({ op: 'read', root: home, file: memory, limit: 8192, privateFile: true });
  assert.equal(changed.acl, original.acl);
  assertCurrentUserOnly(memory, sid);
  result = await mutate(api, 'memory', 'disable', undefined, result.revision);
  assert.equal(result.count, 0);
  assert.equal(result.enabled, false);
  assert.ok(!(await fs.readFile(memory, 'utf8')).includes('detailed'));
  await assert.rejects(mutate(api, 'memory', 'set', undefined, result.revision, { record: preference('Do not store.') }), /disabled/);
  assert.deepEqual(await fs.readdir(path.dirname(memory)), ['memory.json']);
});

test('native Windows knowledge preserves its existing DACL, user text and CAS updates', native, async t => {
  const { api, repo, knowledge } = await fixture(t);
  await mutate(api, 'knowledge', 'upsert', repo, null, { record: fact('Node.js supports café 🤖 text.') });
  await fs.writeFile(knowledge, '# User text\r\n' + await fs.readFile(knowledge, 'utf8'));
  grantEveryone(knowledge, 'ReadData');
  const original = await invokeWindows({ op: 'read', root: repo, file: knowledge, limit: 262144, privateFile: false });
  const current = await api.run('knowledge', 'read', { project: repo });
  const settled = await Promise.allSettled([
    mutate(api, 'knowledge', 'upsert', repo, current.revision, { record: fact('First correction.') }),
    mutate(api, 'knowledge', 'upsert', repo, current.revision, { record: fact('Second correction.') }),
  ]);
  assert.equal(settled.filter(item => item.status === 'fulfilled').length, 1);
  const final = await invokeWindows({ op: 'read', root: repo, file: knowledge, limit: 262144, privateFile: false });
  assert.equal(final.acl, original.acl);
  assert.ok((await fs.readFile(knowledge, 'utf8')).startsWith('# User text\r\n'));
  assert.deepEqual(await fs.readdir(path.dirname(knowledge)), ['knowledge.md']);
});

test('native Windows rejects unsafe private ACLs without reading or repairing them', native, async t => {
  const { api, repo, memory } = await fixture(t);
  await mutate(api, 'memory', 'set', repo, null, { record: preference('Synthetic confidential preference.') });
  grantEveryone(memory, 'ReadData');
  const unsafe = sddl(memory);
  assert.match(unsafe, /;;;WD\)/, 'fixture must add an Everyone rule');
  await assert.rejects(api.run('memory', 'read'), { message: unsafeAcl });
  assert.equal(sddl(memory), unsafe, 'unsafe ACL must not be repaired automatically');
});

test('native Windows rejects junctions and hardlinked destinations without altering targets', native, async t => {
  const { api, repo, directory, knowledge } = await fixture(t);
  const outside = path.join(directory, 'outside');
  await fs.mkdir(outside);
  await fs.symlink(outside, path.join(repo, 'docs'), 'junction');
  await assert.rejects(api.run('knowledge', 'read', { project: repo }), { message: unsafePath });
  assert.deepEqual(await fs.readdir(outside), []);
  await fs.rm(path.join(repo, 'docs'));
  await fs.mkdir(path.dirname(knowledge), { recursive: true });
  const target = path.join(outside, 'target.md');
  await fs.writeFile(target, 'synthetic external content');
  await fs.link(target, knowledge);
  await assert.rejects(api.run('knowledge', 'read', { project: repo }), { message: unsafePath });
  assert.equal(await fs.readFile(target, 'utf8'), 'synthetic external content');
});

test('native Windows legacy migration stays selected, idempotent and isolated from private preferences', native, async t => {
  const { api, home, repo, knowledge } = await fixture(t);
  const legacy = path.join(repo, '.copilot-concierge', 'project-notes.md');
  await fs.mkdir(path.dirname(legacy));
  const original = '# Reverify this: Node.js. Do not copy the whole note.\r\n';
  await fs.writeFile(legacy, original);
  await mutate(api, 'memory', 'set', undefined, null, { record: preference('Private presentation sentinel.') });
  const read = await api.run('legacy', 'read', { project: repo });
  let result = await mutate(api, 'knowledge', 'migrate', repo, null, { expected_legacy_revision: read.revision, records: [fact('Node.js is verified in package.json.')] });
  assert.equal(await fs.readFile(legacy, 'utf8'), original);
  assert.ok(!(await fs.readFile(knowledge, 'utf8')).includes('Private presentation sentinel'));
  result = await mutate(api, 'knowledge', 'remove', repo, result.revision, { id: 'runtime' });
  const replay = await mutate(api, 'knowledge', 'migrate', repo, result.revision, { expected_legacy_revision: read.revision, records: [fact('Do not resurrect.')] });
  assert.equal(replay.changed, false);
  assert.deepEqual(replay.state.records, []);
  assert.equal((await createLearning({ home }).run('memory', 'read')).state.preferences.length, 1);
});


test('native Windows refuses Git-contained memory and writable private ancestors', native, async t => {
  const { api, home, repo, memory } = await fixture(t);
  await mutate(api, 'memory', 'set', repo, null, { record: preference('Synthetic private preference.') });
  // A .git marker is enough; no user repository or real memory store is touched.
  await fs.mkdir(path.join(home, '.git'));
  await assert.rejects(api.run('memory', 'read', { project: repo }), { message: /^Private memory cannot live inside a Git working tree\.$/ });
  await fs.rmdir(path.join(home, '.git'));
  const config = path.dirname(path.dirname(memory));
  grantEveryone(config, 'DeleteSubdirectoriesAndFiles');
  await assert.rejects(api.run('memory', 'read'), { message: unsafeAcl });
});

test('native Windows repository knowledge inherits ordinary access and survives a checkout-style rewrite', native, async t => {
  const { api, repo, knowledge } = await fixture(t);
  let result = await mutate(api, 'knowledge', 'upsert', repo, null, { record: fact('Node.js 20 or later is required.') });
  for (const target of [path.join(repo, 'docs'), path.dirname(knowledge), knowledge]) assertInherits(target);
  // A clone or checkout recreates tracked bytes as a new file with inherited access.
  const bytes = await fs.readFile(knowledge);
  await fs.rm(knowledge);
  await fs.writeFile(knowledge, bytes);
  const before = await invokeWindows({ op: 'read', root: repo, file: knowledge, limit: 262144, privateFile: false });
  assert.equal(before.revision, result.revision);
  result = await mutate(api, 'knowledge', 'upsert', repo, result.revision, { record: fact('Node.js 20 and 22 are tested.') });
  const after = await invokeWindows({ op: 'read', root: repo, file: knowledge, limit: 262144, privateFile: false });
  assert.equal(after.revision, result.revision);
  assert.equal(after.acl, before.acl);
  assertInherits(knowledge);
  assert.deepEqual(await fs.readdir(path.dirname(knowledge)), ['knowledge.md']);
});

test('native Windows CLI maintains repository knowledge from UTF-8 stdin and refuses malformed input', native, async t => {
  const { repo } = await fixture(t);
  const record = fact('The café 🤖 tooling uses Node.js.');
  const run = (args, input) => spawnSync(process.execPath, [cli, ...args], { input, timeout: 240000 });
  let result = run(['knowledge', 'upsert', '--project', repo], Buffer.from(JSON.stringify({ expected_revision: null, record })));
  assert.equal(result.status, 0, result.stderr.toString());
  assert.deepEqual(JSON.parse(result.stdout.toString('utf8')).state.records, [record]);
  result = run(['knowledge', 'read', '--project', repo]);
  assert.equal(result.status, 0, result.stderr.toString());
  const current = JSON.parse(result.stdout.toString('utf8'));
  assert.deepEqual(current.state.records, [record]);
  const invalid = Buffer.from(JSON.stringify({ expected_revision: current.revision, record: fact('Replacement.') }));
  invalid[invalid.indexOf(Buffer.from('Replacement'))] = 0xff;
  result = run(['knowledge', 'upsert', '--project', repo], invalid);
  assert.equal(result.status, 1);
  assert.match(result.stderr.toString(), /UTF-8/);
  assert.equal(JSON.parse(run(['knowledge', 'read', '--project', repo]).stdout.toString('utf8')).revision, current.revision);
});

test('native Windows learning stays unavailable when system PowerShell cannot start', native, async t => {
  const { api, home, memory } = await fixture(t);
  const original = process.env.SystemRoot;
  const restore = () => { process.env.SystemRoot = original; };
  t.after(restore);
  process.env.SystemRoot = path.join(path.parse(home).root, 'ConciergeMissingSystemRoot');
  await assert.rejects(invokeWindows({ op: 'context' }), /unavailable or could not start/);
  await assert.rejects(api.run('memory', 'read'), /unavailable or could not start/);
  restore();
  await assert.rejects(fs.access(path.dirname(path.dirname(memory))), { code: 'ENOENT' });
});

test('native Windows learning stays unavailable when execution policy blocks the bundled script', native, async t => {
  const { api, memory } = await fixture(t);
  // A Process-scope policy reaches the child through this variable; Concierge
  // never sets it, so this simulates a host whose policy blocks local scripts.
  const original = process.env.PSExecutionPolicyPreference;
  const restore = () => { if (original === undefined) delete process.env.PSExecutionPolicyPreference; else process.env.PSExecutionPolicyPreference = original; };
  t.after(restore);
  process.env.PSExecutionPolicyPreference = 'Restricted';
  await assert.rejects(invokeWindows({ op: 'context' }), /no valid result/);
  await assert.rejects(api.run('memory', 'read'), /no valid result/);
  restore();
  await assert.rejects(fs.access(path.dirname(path.dirname(memory))), { code: 'ENOENT' });
});

test('native Windows refuses an update while another lock exists and leaves that lock alone', native, async t => {
  const { api, repo, knowledge } = await fixture(t);
  const result = await mutate(api, 'knowledge', 'upsert', repo, null, { record: fact('Node.js 20 or later is required.') });
  const lock = path.join(path.dirname(knowledge), '.knowledge.md.concierge-lock');
  await fs.writeFile(lock, 'another writer');
  const before = await fs.readFile(knowledge);
  await assert.rejects(mutate(api, 'knowledge', 'upsert', repo, result.revision, { record: fact('Blocked update.') }), { message: /^Learning update is locked/ });
  assert.equal(await fs.readFile(lock, 'utf8'), 'another writer');
  assert.ok((await fs.readFile(knowledge)).equals(before));
  assert.deepEqual((await fs.readdir(path.dirname(knowledge))).sort(), ['.knowledge.md.concierge-lock', 'knowledge.md']);
});

test('native Windows reports a sharing conflict during the rename as a clean conflict', native, async t => {
  const { api, repo, directory, knowledge } = await fixture(t);
  const result = await mutate(api, 'knowledge', 'upsert', repo, null, { record: fact('Node.js 20 or later is required.') });
  const before = await fs.readFile(knowledge);
  // Another program holds the document open for reading without delete sharing,
  // so reads still work but the final rename is refused.
  const release = path.join(directory, 'release-holder');
  const body = "$h=[System.IO.File]::Open($p, 'Open', 'Read', 'Read'); [Console]::Out.WriteLine('open'); [Console]::Out.Flush(); $n=0; while (-not [System.IO.File]::Exists($env:CONCIERGE_RELEASE) -and $n -lt 1200) { [System.Threading.Thread]::Sleep(100); $n++ }; $h.Dispose()";
  const holder = spawn(powershellExecutable(process.env.SystemRoot), ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', "$ErrorActionPreference='Stop'; $p=$env:CONCIERGE_FIXTURE_PATH; " + body], { env: { ...process.env, CONCIERGE_FIXTURE_PATH: knowledge, CONCIERGE_RELEASE: release }, stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = new Promise(resolve => holder.once('close', resolve));
  // after() hooks run in registration order, so the fixture folder may already
  // be gone here; stop a holder that is still waiting instead of signalling it.
  t.after(() => { if (holder.exitCode === null) holder.kill(); return exited; });
  await new Promise((resolve, reject) => {
    holder.stdout.on('data', chunk => { if (String(chunk).includes('open')) resolve(); });
    holder.once('close', () => reject(new Error('file holder exited early')));
  });
  await assert.rejects(mutate(api, 'knowledge', 'upsert', repo, result.revision, { record: fact('Blocked update.') }), { message: conflict });
  await fs.writeFile(release, '');
  assert.equal(await exited, 0);
  assert.ok((await fs.readFile(knowledge)).equals(before));
  assert.deepEqual(await fs.readdir(path.dirname(knowledge)), ['knowledge.md']);
});

test('native Windows updates a repository document owned by another account under a CREATOR OWNER folder rule', native, async t => {
  const { api, repo, knowledge } = await fixture(t);
  let result = await mutate(api, 'knowledge', 'upsert', repo, null, { record: fact('Node.js 20 or later is required.') });
  // The folder grants each creator full control, as C:\\ does for new folders.
  powershell(acl + "$co=New-Object System.Security.Principal.SecurityIdentifier('S-1-3-0'); $a.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($co, 'FullControl', 'ContainerInherit, ObjectInherit', 'InheritOnly', 'Allow'))); [System.IO.Directory]::SetAccessControl($p, $a)", path.dirname(knowledge));
  const bytes = await fs.readFile(knowledge);
  await fs.rm(knowledge);
  await fs.writeFile(knowledge, bytes);
  // Give the document to the account SID instead of this elevated writer's
  // default owner, then add an explicit rule; Windows recomputes inherited
  // rules, so the creator rule names a different account than a new file would.
  powershell("$u=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; $a=[System.IO.File]::GetAccessControl($p, 'Owner'); $a.SetOwner($u); [System.IO.File]::SetAccessControl($p, $a); $a=[System.IO.File]::GetAccessControl($p); $a.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-1-0')), 'ReadData', 'Allow'))); [System.IO.File]::SetAccessControl($p, $a)", knowledge);
  const before = security(knowledge);
  result = await mutate(api, 'knowledge', 'upsert', repo, result.revision, { record: fact('Node.js 20 and 22 are tested.') });
  const after = security(knowledge);
  t.diagnostic(JSON.stringify({ before, after }));
  const explicit = info => info.rules.filter(rule => !rule.inherited);
  assert.equal(after.protected, false);
  assert.deepEqual(explicit(after), [{ sid: 'S-1-1-0', allow: true, inherited: false }]);
  assert.deepEqual(explicit(after), explicit(before));
  assert.equal((await api.run('knowledge', 'read', { project: repo })).revision, result.revision);
  assert.deepEqual(await fs.readdir(path.dirname(knowledge)), ['knowledge.md']);
});
