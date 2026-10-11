import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const launcher = fileURLToPath(new URL('../scripts/launch.mjs', import.meta.url));
const posixOnly = { skip: process.platform === 'win32' ? 'Fixture uses a POSIX executable; no real Copilot is invoked' : false };

async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'zilot-launcher-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = {
    root,
    bin: path.join(root, 'fake bin'),
    cwd: path.join(root, 'invocation directory'),
    project: path.join(root, 'project with spaces'),
    output: path.join(root, 'generated plugins'),
    userConfig: path.join(root, 'synthetic user.json'),
    projectConfig: path.join(root, 'synthetic project.json'),
    sessionConfig: path.join(root, 'synthetic session.json'),
    log: path.join(root, 'copilot-invocations.jsonl'),
  };
  await Promise.all([paths.bin, paths.cwd, paths.project, paths.output].map(dir => mkdir(dir)));
  await Promise.all([paths.userConfig, paths.projectConfig, paths.sessionConfig].map(file => writeFile(file, '{}\n')));

  // PATH contains only this fixture. Its absolute Node interpreter never resolves
  // a real Copilot installation, even when a launch assertion fails.
  const executable = path.join(paths.bin, 'copilot');
  await writeFile(executable, `#!${process.execPath}\n` + String.raw`
const { appendFileSync } = require('node:fs');
appendFileSync(process.env.COPILOT_TEAM_TEST_LOG, JSON.stringify({
  cwd: process.cwd(), argv: process.argv.slice(2),
}) + '\n');
process.exitCode = Number(process.env.COPILOT_TEAM_TEST_EXIT_CODE || 0);
`);
  await chmod(executable, 0o755);
  return paths;
}

function launch(paths, extra = [], exitCode = 0) {
  return spawnSync(process.execPath, [
    launcher,
    '--user-config', paths.userConfig,
    '--project-config', paths.projectConfig,
    '--output-parent', paths.output,
    ...extra,
  ], {
    cwd: paths.cwd,
    // Explicit synthetic config paths prevent reads of the user's settings.
    env: {
      ...process.env,
      PATH: paths.bin,
      COPILOT_TEAM_TEST_LOG: paths.log,
      COPILOT_TEAM_TEST_EXIT_CODE: String(exitCode),
    },
    encoding: 'utf8',
    timeout: 20_000,
  });
}

async function invocations(paths) {
  try {
    return (await readFile(paths.log, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function nativeOptions(argv) {
  const options = new Map();
  const valued = new Set(['--plugin-dir', '--agent', '--model']);
  const repeatable = new Set(['--add-dir']);
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    assert.ok(flag === '--no-auto-update' || valued.has(flag) || repeatable.has(flag), `Unexpected native flag/argument (including permission bypass): ${flag}`);
    if (repeatable.has(flag)) { i++; continue; }
    assert.ok(!options.has(flag), `Duplicate native flag: ${flag}`);
    if (flag === '--no-auto-update') options.set(flag, true);
    else {
      assert.ok(argv[i + 1] && !argv[i + 1].startsWith('--'), `Missing value for ${flag}`);
      options.set(flag, argv[++i]);
    }
  }
  for (const flag of valued) assert.ok(options.has(flag), `Required native flag missing: ${flag}`);
  assert.equal(options.get('--agent'), 'zilot:frontdesk');
  return options;
}

function assertExit(result, expected) {
  assert.ifError(result.error);
  assert.equal(result.signal, null, `Launcher terminated by ${result.signal}`);
  assert.equal(result.status, expected, result.stderr || result.stdout);
}

test('launcher uses the requested project and configured native role/model without permission bypass', posixOnly, async t => {
  const paths = await fixture(t);
  await writeFile(paths.userConfig, JSON.stringify({
    planApproval: 'ask',
    models: { frontdesk: 'fixture-luna-root', orchestrator: 'fixture-old-sol', specialist: 'fixture-old-leaf' },
  }));
  await writeFile(paths.projectConfig, JSON.stringify({ models: { orchestrator: 'fixture-sol-middle' } }));
  await writeFile(paths.sessionConfig, JSON.stringify({ models: { specialist: 'fixture-luna-leaf' } }));

  const result = launch(paths, [
    '--project', path.relative(paths.cwd, paths.project),
    '--session-config', paths.sessionConfig,
    '--plan-approval', 'auto',
  ]);
  assertExit(result, 0);
  const calls = await invocations(paths);
  assert.equal(calls.length, 1, 'A single native Copilot process should be started');
  assert.equal(calls[0].cwd, paths.project);
  const options = nativeOptions(calls[0].argv);
  assert.equal(options.get('--model'), 'fixture-luna-root');
  const pluginDirectory = options.get('--plugin-dir');
  assert.equal(path.dirname(pluginDirectory), paths.output, 'Generated plugin must stay in the requested fixture directory');
  assert.equal(JSON.parse(await readFile(path.join(pluginDirectory, 'plugin.json'), 'utf8')).name, 'zilot');
  const effective = JSON.parse(await readFile(path.join(pluginDirectory, 'effective-config.json'), 'utf8'));
  assert.deepEqual(effective.value.models, {
    frontdesk: 'fixture-luna-root', orchestrator: 'fixture-sol-middle', specialist: 'fixture-luna-leaf', escalation: 'gpt-6.1-sol',
  });
  assert.equal(effective.value.planApproval, 'auto');
  assert.match(result.stdout, /Plan approval: auto/);
});

test('launcher preserves invocation cwd without --project and explicitly selects the default frontdesk model', posixOnly, async t => {
  const paths = await fixture(t);
  const result = launch(paths);
  assertExit(result, 0);
  const calls = await invocations(paths);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cwd, paths.cwd);
  const options = nativeOptions(calls[0].argv);
  assert.equal(options.get('--model'), 'gpt-6-luna', 'Default must remain explicit rather than native Auto');
  assert.match(result.stdout, /Plan approval: ask/);
});

test('extra agent directories load natively: plugins by --plugin-dir, others by --add-dir', posixOnly, async t => {
  const paths = await fixture(t);
  const pluginDir = path.join(paths.root, 'team plugin');
  const plainDir = path.join(paths.root, 'team agents');
  await mkdir(pluginDir);
  await mkdir(plainDir);
  await writeFile(path.join(pluginDir, 'plugin.json'), '{"name":"team"}\n');
  await writeFile(paths.userConfig, JSON.stringify({ extraDirectories: [pluginDir] }));
  await writeFile(paths.projectConfig, JSON.stringify({ extraDirectories: [plainDir, pluginDir] }));
  const result = launch(paths);
  assertExit(result, 0);
  const [call] = await invocations(paths);
  const argv = call.argv;
  const pluginDirs = argv.flatMap((value, i) => value === '--plugin-dir' ? [argv[i + 1]] : []);
  assert.equal(pluginDirs.length, 2, 'Zilot copy plus the extra plugin directory');
  assert.equal(pluginDirs[1], pluginDir);
  assert.deepEqual(argv.flatMap((value, i) => value === '--add-dir' ? [argv[i + 1]] : []), [plainDir]);
  assert.equal(argv[argv.indexOf('--agent') + 1], 'zilot:frontdesk');
  assert.match(result.stdout, /Extra agent directories/);
});

test('launcher returns the native child exit status', posixOnly, async t => {
  const paths = await fixture(t);
  const result = launch(paths, [], 23);
  assertExit(result, 23);
  assert.equal((await invocations(paths)).length, 1);
});

test('invalid configuration and unsupported launch options never start Copilot', posixOnly, async t => {
  const cases = [
    { name: 'malformed JSON', config: '{ broken' },
    { name: 'invalid approval value', config: JSON.stringify({ planApproval: true }) },
    { name: 'Auto model', config: JSON.stringify({ models: { frontdesk: 'Auto' } }) },
    { name: 'unknown setting', config: JSON.stringify({ allowAllTools: true }) },
    { name: 'missing explicit session file', extra: paths => ['--session-config', path.join(paths.root, 'missing.json')] },
    { name: 'permission bypass flag', extra: () => ['--allow-all-tools'] },
    { name: 'duplicate project', extra: paths => ['--project', paths.project, '--project', paths.cwd] },
    { name: 'print-only belongs to configure', extra: () => ['--print-only'] },
  ];
  for (const entry of cases) {
    await t.test(entry.name, async subtest => {
      const paths = await fixture(subtest);
      if (entry.config !== undefined) await writeFile(paths.userConfig, entry.config);
      const result = launch(paths, entry.extra?.(paths) ?? []);
      assertExit(result, 1);
      assert.ok(result.stderr.trim(), 'Invalid input should explain the launch failure');
      assert.deepEqual(await invocations(paths), [], 'Invalid input must not reach the native executable');
      assert.deepEqual(await readdir(paths.output), [], 'Invalid input must not leave generated session copies');
    });
  }
});
