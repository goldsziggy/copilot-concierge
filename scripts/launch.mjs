#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MAX_TASK_BYTES, createResultTracker, nativeArguments, parseLaunchArguments } from './lib/launch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const help = `Start Copilot CLI with Concierge loaded from a fresh configured copy.

Interactive:  node scripts/launch.mjs [configuration flags]
One task:     node scripts/launch.mjs --task TEXT | --task-file FILE [configuration flags] [-- native flags]

Configuration flags are the same as scripts/configure.mjs. COPILOT_CONCIERGE_AUTONOMY=guided|full
selects the autonomy mode; --autonomy overrides it.
A one-task run needs full autonomy. It executes the task without a prompt and exits 0 when Concierge reports done,
2 when it reports blocked, cancelled or needs_approval, 3 when it reports no result, or the
host's own failure status. Flags after -- go to copilot unchanged and only with a task, and
must include --max-ai-credits N for Copilot's soft per-response budget.
One-task runs use plain response output, closed standard input and signal forwarding.
Use --output-parent DIR for writable session copies when the plugin is mounted read-only.
No global installation or permission bypass flags are used; full autonomy does not add any.`;

async function readTask(file) {
  if ((await stat(file)).size > MAX_TASK_BYTES) throw new Error(`Task file exceeds ${MAX_TASK_BYTES} bytes`);
  const text = (await readFile(file, 'utf8')).trim();
  if (!text) throw new Error('Task file is empty');
  return text;
}

if (args.length === 1 && ['--help', '-h'].includes(args[0])) console.log(help);
else {
  try {
    const launch = parseLaunchArguments(args);
    if (launch.configure.includes('--print-only')) throw new Error('Use scripts/configure.mjs --print-only to inspect without launching');
    const task = launch.taskFile === undefined ? launch.task : await readTask(path.resolve(launch.taskFile));
    if (task !== undefined && Buffer.byteLength(task) > MAX_TASK_BYTES) throw new Error(`Task exceeds ${MAX_TASK_BYTES} bytes`);
    const configure = extra => JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts/configure.mjs'), ...launch.configure, ...extra], { encoding: 'utf8' }));
    // Nobody answers a one-task run, and a guided entry agent ends its turn
    // after dispatch. Resolve the mode first so a refusal leaves nothing behind.
    if (launch.oneShot && configure(['--print-only']).value.autonomy !== 'full') {
      throw new Error('A one-task run is unattended and needs full autonomy: set COPILOT_CONCIERGE_AUTONOMY=full or pass --autonomy full');
    }
    const configured = configure([]);
    const at = launch.configure.indexOf('--project');
    const cwd = at < 0 ? process.cwd() : path.resolve(launch.configure[at + 1]);
    // A one-task run keeps stdout for the agent's answer.
    const say = launch.oneShot ? console.error : console.log;
    say(`Plan approval: ${configured.value.planApproval} (${configured.source.planApproval})`);
    say(`Autonomy: ${configured.value.autonomy} (${configured.source.autonomy})`);
    say(`Models: ${JSON.stringify(configured.value.models)}`);
    if (configured.value.extraDirectories.length) say(`Extra agent directories: ${configured.value.extraDirectories.join(', ')}`);
    say(`Session-local plugin: ${configured.pluginDirectory}`);
    const child = spawn('copilot', nativeArguments(configured, { task, forwarded: launch.forwarded }), {
      cwd, stdio: launch.oneShot ? ['ignore', 'pipe', 'inherit'] : 'inherit',
      // A POSIX service owns a separate process group so stopping the launcher
      // also reaches CLI wrappers and their ordinary child processes.
      detached: launch.oneShot && process.platform !== 'win32',
    });
    const tracker = createResultTracker();
    let failed = false;
    let cancelled;
    const signals = { SIGINT: 130, SIGTERM: 143 };
    const handlers = new Map();
    if (launch.oneShot) {
      for (const [signal, code] of Object.entries(signals)) {
        const handler = () => {
          cancelled ??= code;
          if (!child.pid) return;
          try {
            if (process.platform === 'win32') child.kill(signal);
            else process.kill(-child.pid, signal);
          } catch (error) {
            if (error.code !== 'ESRCH') console.error(`Could not forward ${signal} to Copilot: ${error.message}`);
          }
        };
        handlers.set(signal, handler);
        process.on(signal, handler);
      }
    }
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', chunk => {
      process.stdout.write(chunk);
      tracker.write(chunk);
    });
    child.on('error', error => { failed = true; console.error(`Copilot could not start: ${error.message}`); process.exitCode = 1; });
    child.on('close', (code, signal) => {
      for (const [name, handler] of handlers) process.off(name, handler);
      if (cancelled) {
        console.error('Concierge result: cancelled');
        process.exitCode = cancelled;
        return;
      }
      if (failed) return;
      const childCode = code ?? (signal ? 1 : 0);
      if (!launch.oneShot) { process.exitCode = childCode; return; }
      const result = tracker.finish(childCode);
      console.error(`Concierge result: ${result.status}`);
      process.exitCode = result.code;
    });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
