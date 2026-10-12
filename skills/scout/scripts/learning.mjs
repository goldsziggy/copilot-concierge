#!/usr/bin/env node
// Plain-file learning storage. Content judgments remain the assigned Scout's job.
// Metadata checks and compare-and-swap detect ordinary conflicts, not hostile
// same-user path races: Node does not expose descriptor-relative rename here.
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createWindowsStorage } from './learning-windows.mjs';

const exec = promisify(execFile);
const START = '<!-- concierge-knowledge:start -->';
const END = '<!-- concierge-knowledge:end -->';
const CATEGORIES = ['Tech stack', 'Conventions', 'Business rules', 'Findings', 'Decisions'];
const MEMORY_LIMIT = 8192;
const KNOWLEDGE_LIMIT = 24576;
const DOC_LIMIT = 262144;
const LEGACY_LIMIT = 2048;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);
const fail = message => { throw new Error(message); };
const revision = bytes => bytes === null ? null : hash(bytes);
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
function object(value, keys, required = keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected an object.');
  for (const key of Object.keys(value)) if (!keys.includes(key)) fail('Unexpected field in payload or stored record.');
  for (const key of required) if (!Object.hasOwn(value, key)) fail(`Missing field: ${key}`);
}
function text(value, name, max = 300) {
  if (typeof value === 'string' && !value.isWellFormed()) fail('Text must contain well-formed Unicode.');
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\r\n\x00-\x1f\x7f]/u.test(value)) fail(`Invalid ${name}.`);
  return value;
}
function id(value) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{0,47}$/.test(value)) fail('Invalid record id.');
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('Invalid checked_on date.');
}
function expected(value) {
  if (value !== null && (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))) fail('expected_revision must be null or a SHA256 revision.');
}
function memoryRecord(record) {
  object(record, ['id', 'kind', 'value', 'user_evidence', 'checked_on']);
  id(record.id);
  if (!['response_style', 'workflow_style'].includes(record.kind)) fail('Memory accepts only current response/workflow preferences.');
  text(record.value, 'preference', 240);
  text(record.user_evidence, 'explicit user-origin evidence', 300);
  date(record.checked_on);
}
function memoryState(state) {
  object(state, ['schema', 'enabled', 'preferences']);
  if (state.schema !== 1 || typeof state.enabled !== 'boolean' || !Array.isArray(state.preferences) || state.preferences.length > 20) fail('Invalid memory state.');
  if (!state.enabled && state.preferences.length) fail('Disabled memory must be empty.');
  state.preferences.forEach(memoryRecord);
  if (new Set(state.preferences.map(item => item.id)).size !== state.preferences.length) fail('Duplicate memory ids.');
  if (jsonBytes(state).length > MEMORY_LIMIT) fail('Memory exceeds 8 KiB.');
  return state;
}
function sourceShape(source) {
  object(source, ['path', 'locator', 'checked_on']);
  text(source.path, 'source path', 240);
  if (source.path.includes('`')) fail('Source paths containing Markdown code delimiters are unsupported.');
  const normalized = source.path.toLowerCase();
  if (source.path.includes('\\') || path.posix.isAbsolute(source.path) || source.path.split('/').some(part => !part || part === '.' || part === '..' || part.toLowerCase() === '.git') || normalized === 'docs/concierge/knowledge.md' || normalized === '.copilot-concierge/project-notes.md') fail('Source must be a direct repository-relative evidence file, not knowledge or legacy notes.');
  const basename = path.posix.basename(normalized);
  if (['.copilot-concierge/memory.json', '.config/copilot-concierge/memory.json'].includes(normalized) || /^\.env(?:\.|$)/.test(basename) || /^(?:id_rsa|id_ed25519|credentials(?:\.json)?|secrets(?:\.json)?)$/.test(basename) || /\.(?:pem|key)$/.test(basename)) fail('Private memory and credential files cannot be knowledge evidence.');
  text(source.locator, 'source section or symbol', 160);
  date(source.checked_on);
}
function knowledgeRecord(record) {
  object(record, ['id', 'category', 'status', 'summary', 'sources', 'decision_evidence'], ['id', 'category', 'status', 'summary', 'sources']);
  id(record.id);
  if (!CATEGORIES.includes(record.category) || record.status !== 'confirmed') fail('Only confirmed repository knowledge can be persisted.');
  text(record.summary, 'repository fact', 600);
  if (!Array.isArray(record.sources) || record.sources.length < 1 || record.sources.length > 4) fail('One to four repository sources are required.');
  record.sources.forEach(sourceShape);
  if (record.category === 'Decisions') text(record.decision_evidence, 'explicit user decision evidence', 300);
  else if (Object.hasOwn(record, 'decision_evidence')) fail('decision_evidence is only for Decisions.');
}
function knowledgeState(state) {
  object(state, ['schema', 'migration', 'records']);
  if (state.schema !== 1 || !Array.isArray(state.records) || state.records.length > 40) fail('Invalid knowledge state.');
  if (state.migration !== null) {
    object(state.migration, ['legacy_revision']);
    expected(state.migration.legacy_revision);
    if (state.migration.legacy_revision === null) fail('Migration requires a legacy revision.');
  }
  state.records.forEach(knowledgeRecord);
  if (new Set(state.records.map(item => item.id)).size !== state.records.length) fail('Duplicate knowledge ids.');
  return state;
}
const markdown = value => value.replace(/[\\`*_[\]<>]/g, match => '\\' + match);
function block(state) {
  knowledgeState(state);
  const lines = [START, '<!-- concierge-state: ' + JSON.stringify(state).replace(/</g, '\\u003c').replace(/>/g, '\\u003e') + ' -->', '', '# Concierge repository knowledge', '', 'Confirmed repository facts; source files and current instructions take precedence.'];
  for (const category of CATEGORIES) {
    lines.push('', `## ${category}`, '');
    const records = state.records.filter(record => record.category === category);
    if (!records.length) lines.push('_No confirmed records yet._');
    for (const record of records) {
      lines.push(`- **${record.id}**: ${markdown(record.summary)}`);
      for (const source of record.sources) lines.push(`  - Source: \`${source.path}\` — ${markdown(source.locator)} (checked ${source.checked_on})`);
      if (record.decision_evidence) lines.push(`  - User decision: ${markdown(record.decision_evidence)}`);
    }
  }
  if (state.migration) lines.push('', 'Legacy project notes were reviewed; this document is the active repository learning store.');
  lines.push('', END);
  const result = lines.join('\n');
  if (Buffer.byteLength(result) > KNOWLEDGE_LIMIT) fail('Managed knowledge exceeds 24 KiB.');
  return result;
}
function decode(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { fail('Stored file is not valid UTF-8; preserve it for review.'); }
}
function parseKnowledge(bytes) {
  if (bytes === null) return { state: { schema: 1, migration: null, records: [] }, before: '', after: '\n' };
  const value = decode(bytes);
  const starts = value.split(START).length - 1;
  const ends = value.split(END).length - 1;
  const start = value.indexOf(START);
  const end = value.indexOf(END);
  if (starts !== 1 || ends !== 1 || end < start) fail('Knowledge file is unowned or has malformed/duplicate markers; leave it unchanged.');
  const managed = value.slice(start, end + END.length);
  const metadata = managed.split('\n')[1];
  const match = /^<!-- concierge-state: (.+) -->$/.exec(metadata);
  if (!match) fail('Malformed knowledge metadata; leave it unchanged.');
  let state;
  try { state = JSON.parse(match[1]); } catch { fail('Malformed knowledge JSON; leave it unchanged.'); }
  if (block(state) !== managed) fail('Managed knowledge was edited outside the helper; preserve it for review.');
  return { state, before: value.slice(0, start), after: value.slice(end + END.length) };
}
async function lstat(file) {
  try { return await fs.lstat(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function regular(stat, file) {
  if (!stat || !stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) fail(`Expected an ordinary file with one hard link: ${file}`);
}
function identity(stat) { return stat ? `${stat.dev}:${stat.ino}:${stat.mode}:${stat.isDirectory() ? '' : stat.nlink}` : null; }
async function directoryChain(root, target, { create = false, privateDirectory = false } = {}) {
  if (!inside(root, target)) fail('Path is outside its assigned root.');
  let current = root;
  const pieces = path.relative(root, target).split(path.sep).filter(Boolean);
  for (let index = -1; index < pieces.length; index++) {
    if (index >= 0) current = path.join(current, pieces[index]);
    let stat = await lstat(current);
    if (!stat && create && index >= 0) {
      // Recheck the parent immediately before creating this one directory.
      const parent = await lstat(path.dirname(current));
      if (!parent?.isDirectory() || parent.isSymbolicLink()) fail('Parent changed before directory creation.');
      try { await fs.mkdir(current, { mode: privateDirectory ? 0o700 : 0o755 }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      stat = await lstat(current);
    }
    if (!stat) return false;
    if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(current) !== current) fail(`Unsafe directory chain: ${current}`);
  }
  return true;
}
async function chainIdentity(root, target) {
  const result = [];
  let current = root;
  for (const piece of ['', ...path.relative(root, target).split(path.sep).filter(Boolean)]) {
    if (piece) current = path.join(current, piece);
    const stat = await lstat(current);
    if (!stat) break;
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail('Unsafe directory identity.');
    result.push([current, identity(stat)]);
  }
  return result;
}
async function unchangedParents(parents) {
  for (const [file, original] of parents) {
    if (identity(await lstat(file)) !== original) fail('Directory changed during operation.');
  }
}
async function readFile(root, file, limit, privateFile = false) {
  await directoryChain(root, path.dirname(file));
  const parents = await chainIdentity(root, path.dirname(file));
  const before = await lstat(file);
  if (!before) return { bytes: null, identity: null, parents };
  regular(before, file);
  if (privateFile && ((before.mode & 0o077) !== 0 || before.uid !== process.getuid())) fail('Private memory must be owned by this user with mode 0600 or stricter.');
  if (before.size > limit) fail(`File exceeds ${limit} bytes; leave it unchanged.`);
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    regular(stat, file);
    if (identity(stat) !== identity(before)) fail('File changed while opening.');
    // Bounded read even if another process extends the file after stat.
    const bytes = Buffer.alloc(limit + 1);
    let count = 0;
    while (count < bytes.length) {
      const read = await handle.read(bytes, count, bytes.length - count, count);
      if (!read.bytesRead) break;
      count += read.bytesRead;
    }
    if (count > limit) fail(`File exceeds ${limit} bytes; leave it unchanged.`);
    const after = await lstat(file);
    if (identity(after) !== identity(before)) fail('Path changed while reading.');
    await unchangedParents(parents);
    return { bytes: bytes.subarray(0, count), identity: identity(before), parents, mode: before.mode & 0o777 };
  } finally { await handle.close(); }
}
async function atomicWrite(root, file, original, bytes, limit, privateFile) {
  if (bytes.length > limit) fail(`File exceeds ${limit} bytes.`);
  await unchangedParents(original.parents);
  await directoryChain(root, path.dirname(file), { create: true, privateDirectory: privateFile });
  if (privateFile) await privateParent(file);
  const parents = await chainIdentity(root, path.dirname(file));
  const temp = path.join(path.dirname(file), `.concierge-${randomUUID()}.tmp`);
  const lock = path.join(path.dirname(file), `.${path.basename(file)}.concierge-lock`);
  let handle, lockHandle;
  try {
    try { lockHandle = await fs.open(lock, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600); }
    catch (error) { if (error.code === 'EEXIST') fail('Learning update already in progress or a stale lock needs review; no changes written.'); throw error; }
    await unchangedParents(parents);
    handle = await fs.open(temp, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    await handle.writeFile(bytes);
    // Keep an existing document's permissions, including restrictive user text.
    await handle.chmod(original.mode ?? (privateFile ? 0o600 : 0o644 & ~process.umask()));
    await handle.sync();
    await handle.close();
    handle = null;
    const current = await readFile(root, file, limit, privateFile);
    if (current.identity !== original.identity || revision(current.bytes) !== revision(original.bytes)) fail('Concurrent change detected; retry after reading current state.');
    await directoryChain(root, path.dirname(file));
    await unchangedParents(parents);
    if (privateFile) { await privateParent(file); await rejectGitAncestor(file); }
    await fs.rename(temp, file);
  } finally {
    if (handle) await handle.close();
    // Do not remove anything through a directory that changed underneath us.
    try {
      await unchangedParents(parents);
      await fs.unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; });
      if (lockHandle) await fs.unlink(lock);
    } finally { if (lockHandle) await lockHandle.close(); }
  }
}
async function privateParent(file) {
  const stat = await fs.lstat(path.dirname(file));
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0) fail('Private memory directory must be owned by this user and not writable by group or others.');
}
async function projectRoot(project, windows) {
  if (typeof project !== 'string' || !path.isAbsolute(project)) fail('An explicit absolute --project Git root is required.');
  const root = windows ? await windows.project(project) : path.resolve(project);
  if (!windows) {
    if (await fs.realpath(root) !== root) fail('Use the canonical repository path, without symlink aliases.');
    await directoryChain(root, root);
  }
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  env.GIT_CONFIG_NOSYSTEM = '1';
  env.GIT_CONFIG_GLOBAL = os.devNull;
  const { stdout } = await exec('git', ['-c', 'core.fsmonitor=false', '-C', root, 'rev-parse', '--show-toplevel'], { env, maxBuffer: 8192 });
  if (path.resolve(stdout.trim()) !== root) fail('--project must be the exact assigned Git root, not a subdirectory.');
  return root;
}
async function rejectGitAncestor(file) {
  let current = path.dirname(file);
  while (true) {
    if (await lstat(path.join(current, '.git'))) fail('Private memory cannot live inside any Git working tree.');
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

// Tests may inject a disposable home. The CLI always uses the OS account's home,
// never HOME, XDG_CONFIG_HOME, repository settings, or a supplied storage path.
export function createLearning({ home, platform = process.platform } = {}) {
  const windows = platform === 'win32' ? createWindowsStorage() : null;
  const read = windows ? (...args) => windows.read(...args) : readFile;
  const replace = windows ? (...args) => windows.write(...args) : atomicWrite;
  return {
    async run(store, action, { project, payload } = {}) {
      if (!['memory', 'knowledge', 'legacy'].includes(store)) fail('Unknown store.');
      const actions = store === 'memory' ? ['read', 'set', 'remove', 'clear', 'disable', 'enable'] : store === 'knowledge' ? ['read', 'upsert', 'remove', 'migrate'] : ['read'];
      if (!actions.includes(action)) fail('Unsupported operation for this store.');
      if (action === 'read' && payload !== undefined) fail('Read takes no payload.');
      const root = project !== undefined || store !== 'memory' ? await projectRoot(project, windows) : null;
      let anchor, file, limit;
      if (store === 'memory') {
        anchor = path.resolve(home ?? (windows ? await windows.home() : os.userInfo().homedir));
        if (!windows && await fs.realpath(anchor) !== anchor) fail('OS home must be canonical, without symlink aliases.');
        file = path.join(anchor, '.config', 'copilot-concierge', 'memory.json');
        if (root && inside(root, file)) fail('Private memory cannot live inside the assigned repository.');
        if (windows) await windows.memory(anchor, file);
        else {
          await directoryChain(anchor, path.dirname(file));
          for (const [directory] of await chainIdentity(anchor, path.dirname(file))) {
            const stat = await fs.lstat(directory);
            if (stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0) fail('Private memory ancestors must be owned by this user and not writable by group or others.');
          }
          await rejectGitAncestor(file);
          if (await lstat(path.dirname(file))) await privateParent(file);
        }
        limit = MEMORY_LIMIT;
      } else {
        anchor = root;
        file = store === 'knowledge' ? path.join(root, 'docs', 'concierge', 'knowledge.md') : path.join(root, '.copilot-concierge', 'project-notes.md');
        limit = store === 'knowledge' ? DOC_LIMIT : LEGACY_LIMIT;
      }
      if (store === 'legacy') {
        // A retired note is never opened again, even if its former path is now
        // absent, oversized or unsafe. The recorded hash identifies the review.
        const canonical = await read(root, path.join(root, 'docs', 'concierge', 'knowledge.md'), DOC_LIMIT);
        const migration = parseKnowledge(canonical.bytes).state.migration;
        if (migration) return { path: file, revision: migration.legacy_revision, retired: true, content: null };
        const legacy = await read(anchor, file, limit);
        return { path: file, revision: revision(legacy.bytes), retired: false, content: legacy.bytes === null ? null : decode(legacy.bytes) };
      }
      const original = await read(anchor, file, limit, store === 'memory');
      const rev = revision(original.bytes);
      let state, document;
      if (store === 'memory') {
        try { state = original.bytes === null ? { schema: 1, enabled: true, preferences: [] } : JSON.parse(decode(original.bytes)); }
        catch { fail('Malformed private memory; preserve it for review.'); }
        memoryState(state);
      } else {
        document = parseKnowledge(original.bytes);
        state = document.state;
      }
      if (action === 'read') return { path: file, revision: rev, state };
      const keys = action === 'set' || action === 'upsert' ? ['expected_revision', 'record'] : action === 'remove' ? ['expected_revision', 'id'] : action === 'migrate' ? ['expected_revision', 'expected_legacy_revision', 'records'] : ['expected_revision'];
      object(payload, keys);
      expected(payload.expected_revision);
      if (payload.expected_revision !== rev) fail('Revision conflict; read current state before making a correction.');
      if (store === 'memory') {
        if (action === 'set') {
          if (!state.enabled) fail('Remembering is disabled; explicit enable is required.');
          memoryRecord(payload.record);
          state.preferences = state.preferences.filter(item => item.id !== payload.record.id).concat(payload.record);
        } else if (action === 'remove') {
          id(payload.id);
          state.preferences = state.preferences.filter(item => item.id !== payload.id);
        } else if (action === 'clear' || action === 'disable') state.preferences = [];
        if (action === 'disable') state.enabled = false;
        if (action === 'enable') state.enabled = true;
        memoryState(state);
      } else {
        if (action === 'upsert') {
          knowledgeRecord(payload.record);
          state.records = state.records.filter(item => item.id !== payload.record.id).concat(payload.record);
        } else if (action === 'remove') {
          id(payload.id);
          state.records = state.records.filter(item => item.id !== payload.id);
        } else {
          expected(payload.expected_legacy_revision);
          if (!payload.expected_legacy_revision) fail('Migration requires the exact existing legacy revision.');
          if (state.migration) {
            if (state.migration.legacy_revision !== payload.expected_legacy_revision) fail('A different legacy revision was already reviewed; use normal knowledge corrections.');
            return { path: file, revision: rev, state, changed: false, already_migrated: true };
          }
          if (!Array.isArray(payload.records)) fail('Migration requires explicitly selected reverified records.');
          payload.records.forEach(knowledgeRecord);
          const legacy = await read(root, path.join(root, '.copilot-concierge', 'project-notes.md'), LEGACY_LIMIT);
          if (revision(legacy.bytes) !== payload.expected_legacy_revision) fail('Legacy notes changed; review them again.');
          state.migration = { legacy_revision: payload.expected_legacy_revision };
          for (const record of payload.records) state.records = state.records.filter(item => item.id !== record.id).concat(record);
        }
        knowledgeState(state);
        // Validate evidence locations only. A regular file is not proof that the
        // claim is true or safe to publish; Scout must review that separately.
        const added = action === 'upsert' ? [payload.record] : action === 'migrate' ? payload.records : [];
        for (const record of added) for (const source of record.sources) {
          const sourceFile = path.join(root, source.path);
          if (windows) await windows.source(root, sourceFile);
          else {
            if (!await directoryChain(root, path.dirname(sourceFile))) fail(`Missing source directory: ${source.path}`);
            regular(await lstat(sourceFile), source.path);
            if (await fs.realpath(sourceFile) !== sourceFile) fail('Source path must use its canonical filesystem spelling, without aliases.');
          }
        }
      }
      const bytes = store === 'memory' ? jsonBytes(state) : Buffer.from(document.before + block(state) + document.after);
      if (store === 'memory') {
        if (windows) await windows.memory(anchor, file);
        else await rejectGitAncestor(file);
      }
      if (action === 'migrate') {
        const latest = await read(root, path.join(root, '.copilot-concierge', 'project-notes.md'), LEGACY_LIMIT);
        if (revision(latest.bytes) !== payload.expected_legacy_revision) fail('Legacy notes changed before migration; review again.');
      }
      await replace(anchor, file, original, bytes, limit, store === 'memory');
      const result = { path: file, revision: hash(bytes), changed: !original.bytes?.equals(bytes) };
      return store === 'memory' ? { ...result, enabled: state.enabled, count: state.preferences.length } : { ...result, state };
    }
  };
}

async function main(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    process.stdout.write('Usage: learning.mjs STORE ACTION [--project /canonical/git/root]\nMemory: read, set, remove, clear, disable, enable (--project optional).\nKnowledge: read, upsert, remove, migrate (--project required). Legacy: read (--project required).\nMutations accept JSON stdin with expected_revision (SHA256 or null); set/upsert add record, remove adds id, migrate adds expected_legacy_revision and records. Read returns revision and state. Memory mutation output omits private preferences.\n');
    return;
  }
  const [store, action, ...rest] = args;
  const allowed = { memory: ['read', 'set', 'remove', 'clear', 'disable', 'enable'], knowledge: ['read', 'upsert', 'remove', 'migrate'], legacy: ['read'] };
  if (!allowed[store]?.includes(action)) fail('Usage: learning.mjs STORE ACTION [--project /canonical/git/root]; use --help.');
  let project;
  if (rest.length) {
    if (rest.length !== 2 || rest[0] !== '--project') fail('Usage: learning.mjs STORE ACTION [--project /canonical/git/root]');
    project = rest[1];
  }
  let payload;
  if (action !== 'read') {
    const chunks = [];
    let length = 0;
    for await (const chunk of process.stdin) {
      length += chunk.length;
      if (length > KNOWLEDGE_LIMIT) fail('Mutation input exceeds 24 KiB.');
      chunks.push(chunk);
    }
    const input = decode(Buffer.concat(chunks, length));
    try { payload = JSON.parse(input); } catch { fail('Mutation requires a JSON object on stdin.'); }
  }
  const result = await createLearning().run(store, action, { project, payload });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { process.stderr.write(`Learning: ${error.message}\n`); process.exitCode = 1; });
}
