#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { nativeArguments } from './lib/launch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log('Start an interactive Copilot CLI session with Concierge loaded from a fresh configured copy.\nConfiguration flags are the same as scripts/configure.mjs.\nNo global installation or permission bypass flags are used.');
} else {
  try {
    if (args.includes('--print-only')) throw new Error('Use scripts/configure.mjs --print-only to inspect without launching');
    const configured = JSON.parse(execFileSync(process.execPath, [path.join(root, 'scripts/configure.mjs'), ...args], { encoding: 'utf8' }));
    const at = args.indexOf('--project');
    const cwd = at < 0 ? process.cwd() : path.resolve(args[at + 1]);
    console.log(`Plan approval: ${configured.value.planApproval} (${configured.source.planApproval})`);
    console.log(`Autonomy: ${configured.value.autonomy} (${configured.source.autonomy})`);
    console.log(`Models: ${JSON.stringify(configured.value.models)}`);
    if (configured.value.extraDirectories.length) console.log(`Extra agent directories: ${configured.value.extraDirectories.join(', ')}`);
    console.log(`Session-local plugin: ${configured.pluginDirectory}`);
    const child = spawn('copilot', nativeArguments(configured), { cwd, stdio: 'inherit' });
    child.on('error', error => { console.error(`Copilot could not start: ${error.message}`); process.exitCode = 1; });
    child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
