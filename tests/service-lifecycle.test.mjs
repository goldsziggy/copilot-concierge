import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const launcher = fileURLToPath(new URL('../scripts/launch.mjs', import.meta.url));
const posixOnly = { skip: process.platform === 'win32' ? 'Exercises POSIX executable fixtures and process-group signals; no real Copilot is invoked' : false, timeout: 20_000 };

async function fixture(source) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'concierge-service-')));
  const bin = path.join(root, 'fake bin');
  const project = path.join(root, 'project');
  const output = path.join(root, 'generated plugins');
  const config = path.join(root, 'synthetic config.json');
  await Promise.all([bin, project, output].map(directory => mkdir(directory)));
  await writeFile(config, '{}\n');
  const executable = path.join(bin, 'copilot');
  await writeFile(executable, `#!${process.execPath}\n${source}`);
  await chmod(executable, 0o755);
  return {
    root,
    cleanup: () => rm(root, { recursive: true, force: true }),
    cwd: project,
    // The only executable on PATH is our fake CLI; children use absolute Node.
    env: { ...process.env, PATH: bin, COPILOT_CONCIERGE_AUTONOMY: 'full', CONCIERGE_SERVICE_TEST_ROOT: root },
    args: [launcher, '--project', project, '--user-config', config, '--project-config', config,
      '--output-parent', output, '--task', 'Exercise the service lifecycle', '--', '--max-ai-credits', '30'],
  };
}

test('a one-task service gives Copilot EOF instead of inherited request input', posixOnly, async t => {
  const paths = await fixture(String.raw`
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const input = readFileSync(0, 'utf8');
writeFileSync(path.join(process.env.CONCIERGE_SERVICE_TEST_ROOT, 'stdin.json'), JSON.stringify({ input }));
process.stdout.write('CONCIERGE-RESULT: done stdin-fixture\n');
`);
  t.after(paths.cleanup);
  const result = spawnSync(process.execPath, paths.args, {
    cwd: paths.cwd, env: paths.env, input: 'This service input must not reach Copilot.\n', encoding: 'utf8', timeout: 10_000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(await readFile(path.join(paths.root, 'stdin.json'), 'utf8')), { input: '' });
  assert.match(result.stderr, /Concierge result: done/);
});

const wrapper = String.raw`
const { appendFileSync, writeFileSync } = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');
const root = process.env.CONCIERGE_SERVICE_TEST_ROOT;
let stopped = false;
let workerClosed = false;
function finish() {
  if (stopped && workerClosed) process.stdout.write('CONCIERGE-RESULT: done interrupted-fixture\n', () => process.exit(0));
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  appendFileSync(path.join(root, 'signals.log'), 'wrapper:' + signal + '\n');
  stopped = true;
  finish();
});
// This wrapper deliberately does not forward signals. Its ordinary child must
// receive the launcher's process-group signal independently.
const worker = spawn(process.execPath, [path.join(root, 'worker.cjs')], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
worker.on('message', message => {
  if (message !== 'ready') return;
  writeFileSync(path.join(root, 'pids.json'), JSON.stringify({ wrapper: process.pid, worker: worker.pid }));
  process.stdout.write('SERVICE FIXTURE READY\n');
});
worker.on('close', () => { workerClosed = true; finish(); });
`;

const worker = String.raw`
const { appendFileSync } = require('node:fs');
const path = require('node:path');
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  appendFileSync(path.join(process.env.CONCIERGE_SERVICE_TEST_ROOT, 'signals.log'), 'worker:' + signal + '\n');
  process.exit(0);
});
setInterval(() => {}, 1000);
process.send('ready');
`;

function within(promise, message) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), 10_000); })])
    .finally(() => clearTimeout(timer));
}

for (const [signal, expectedCode] of [['SIGTERM', 143], ['SIGINT', 130]]) {
  test(`a one-task service forwards ${signal} to the CLI group and exits ${expectedCode} even after done`, posixOnly, async t => {
    const paths = await fixture(wrapper);
    await writeFile(path.join(paths.root, 'worker.cjs'), worker);
    const child = spawn(process.execPath, paths.args, { cwd: paths.cwd, env: paths.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let error;
    let pids;
    let complete = false;
    let readyResolve;
    const ready = new Promise(resolve => { readyResolve = resolve; });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
      if (stdout.includes('SERVICE FIXTURE READY\n')) readyResolve();
    });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', value => { error = value; });
    const closed = new Promise(resolve => child.once('close', (code, exitSignal) => resolve({ code, signal: exitSignal })));
    t.after(async () => {
      try {
        if (complete) return;
        // Clean up even if a broken launcher leaves its child group alive.
        pids ??= await readFile(path.join(paths.root, 'pids.json'), 'utf8').then(JSON.parse).catch(() => undefined);
        if (pids) {
          try { process.kill(-pids.wrapper, 'SIGKILL'); } catch (failure) { if (failure.code !== 'ESRCH') throw failure; }
        }
        child.kill('SIGKILL');
        await closed;
      } finally {
        await paths.cleanup();
      }
    });
    await within(Promise.race([ready, closed.then(result => { throw new Error(`Launcher exited before readiness: ${JSON.stringify(result)} ${error?.message ?? ''} ${stderr}`); })]), 'Fixture did not become ready');
    pids = JSON.parse(await readFile(path.join(paths.root, 'pids.json'), 'utf8'));
    // Signal only Node's launcher PID, as a service manager or container does.
    assert.equal(child.kill(signal), true);
    const result = await within(closed, 'Launcher did not finish after cancellation');
    assert.equal(error, undefined, error?.message);
    assert.deepEqual(result, { code: expectedCode, signal: null }, stderr);
    const receipts = (await readFile(path.join(paths.root, 'signals.log'), 'utf8')).trim().split('\n').sort();
    assert.deepEqual(receipts, [`worker:${signal}`, `wrapper:${signal}`].sort());
    assert.match(stdout, /CONCIERGE-RESULT: done interrupted-fixture/);
    assert.match(stderr, /Concierge result: cancelled/);
    complete = true;
  });
}
