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
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'copilot-concierge-launcher-')));
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
if (process.env.COPILOT_TEAM_TEST_STDOUT) process.stdout.write(process.env.COPILOT_TEAM_TEST_STDOUT);
process.exitCode = Number(process.env.COPILOT_TEAM_TEST_EXIT_CODE || 0);
`);
  await chmod(executable, 0o755);
  return paths;
}

function launch(paths, extra = [], exitCode = 0, environment = {}) {
  // The developer's own autonomy setting must not leak into these fixtures.
  const { COPILOT_CONCIERGE_AUTONOMY: ignored, ...inherited } = process.env;
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
      ...inherited,
      PATH: paths.bin,
      COPILOT_TEAM_TEST_LOG: paths.log,
      COPILOT_TEAM_TEST_EXIT_CODE: String(exitCode),
      ...environment,
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
  assert.equal(options.get('--agent'), 'copilot-concierge:concierge');
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
    models: { concierge: 'fixture-luna-root', orchestrator: 'fixture-old-sol', specialist: 'fixture-old-leaf' },
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
  assert.equal(JSON.parse(await readFile(path.join(pluginDirectory, 'plugin.json'), 'utf8')).name, 'copilot-concierge');
  const effective = JSON.parse(await readFile(path.join(pluginDirectory, 'effective-config.json'), 'utf8'));
  assert.deepEqual(effective.value.models, {
    concierge: 'fixture-luna-root', orchestrator: 'fixture-sol-middle', specialist: 'fixture-luna-leaf', escalation: 'gpt-6.1-sol',
  });
  assert.equal(effective.value.planApproval, 'auto');
  const entry = await readFile(path.join(pluginDirectory, 'com.github.copilot/agents/concierge.agent.md'), 'utf8');
  assert.match(entry, /^model: "fixture-luna-root"$/m);
  assert.equal((await readdir(path.join(pluginDirectory, 'com.github.copilot/agents'))).includes('frontdesk.agent.md'), false);
  assert.match(result.stdout, /Plan approval: auto/);
});

test('launcher accepts the legacy frontdesk model key but invokes the renamed entry', posixOnly, async t => {
  const paths = await fixture(t);
  await writeFile(paths.userConfig, JSON.stringify({ models: { frontdesk: 'legacy-root-model' } }));
  const result = launch(paths);
  assertExit(result, 0);
  const [call] = await invocations(paths);
  assert.equal(nativeOptions(call.argv).get('--model'), 'legacy-root-model');
});

test('launcher preserves invocation cwd without --project and explicitly selects the default concierge model', posixOnly, async t => {
  const paths = await fixture(t);
  const result = launch(paths);
  assertExit(result, 0);
  const calls = await invocations(paths);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cwd, paths.cwd);
  const options = nativeOptions(calls[0].argv);
  assert.equal(options.get('--model'), 'gpt-6-luna', 'Default must remain explicit rather than native Auto');
  assert.match(result.stdout, /Plan approval: auto/);
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
  assert.equal(pluginDirs.length, 2, 'Concierge copy plus the extra plugin directory');
  assert.equal(pluginDirs[1], pluginDir);
  assert.deepEqual(argv.flatMap((value, i) => value === '--add-dir' ? [argv[i + 1]] : []), [plainDir]);
  assert.equal(argv[argv.indexOf('--agent') + 1], 'copilot-concierge:concierge');
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
    { name: 'Auto model', config: JSON.stringify({ models: { concierge: 'Auto' } }) },
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

test('the environment variable selects full autonomy, which disables the question tool and nothing else', posixOnly, async t => {
  const paths = await fixture(t);
  const result = launch(paths, [], 0, { COPILOT_CONCIERGE_AUTONOMY: 'full' });
  assertExit(result, 0);
  const [call] = await invocations(paths);
  assert.equal(call.argv.at(-1), '--no-ask-user');
  nativeOptions(call.argv.slice(0, -1));
  assert.match(result.stdout, /Autonomy: full \(environment: COPILOT_CONCIERGE_AUTONOMY\)/);
  const entry = await readFile(path.join(call.argv[call.argv.indexOf('--plugin-dir') + 1], 'com.github.copilot/agents/concierge.agent.md'), 'utf8');
  assert.match(entry, /"autonomy": "full"/);

  const guided = await fixture(t);
  assertExit(launch(guided), 0);
  const [plain] = await invocations(guided);
  assert.ok(!plain.argv.includes('--no-ask-user'));
});

test('a one-task run owns plain response output and forwards the caller permissions', posixOnly, async t => {
  const paths = await fixture(t);
  const result = launch(paths, ['--task', 'Fix the failing basket test', '--', '--allow-tool', 'shell(npm test)', '--max-ai-credits', '30'], 0, {
    COPILOT_CONCIERGE_AUTONOMY: 'full',
    COPILOT_TEAM_TEST_STDOUT: 'Fixed the test.\nCONCIERGE-RESULT: done basket-test\n',
  });
  assertExit(result, 0);
  const calls = await invocations(paths);
  assert.equal(calls.length, 1);
  const argv = calls[0].argv;
  assert.deepEqual(argv.slice(argv.indexOf('--no-ask-user')), ['--no-ask-user', '--silent', '--output-format', 'text', '--no-color', '-p', 'Fix the failing basket test', '--allow-tool', 'shell(npm test)', '--max-ai-credits', '30']);
  assert.equal(result.stdout, 'Fixed the test.\nCONCIERGE-RESULT: done basket-test\n');
  assert.match(result.stderr, /Autonomy: full/);
  assert.match(result.stderr, /Concierge result: done/);
});

test('a one-task run fails the job unless Concierge reports done', posixOnly, async t => {
  for (const [stdout, childCode, expected] of [
    ['Needs a deploy key.\nCONCIERGE-RESULT: blocked deploy\n', 0, 2],
    ['Plan: ...\nCONCIERGE-RESULT: needs_approval deploy\n', 0, 2],
    ['The run ended without a result line.\n', 0, 3],
    ['The example CONCIERGE-RESULT: done is not the result of this task.\n', 0, 3],
    ['CONCIERGE-RESULT: done deploy\nThe deployment is still incomplete.\n', 0, 3],
    ['CONCIERGE-RESULT: done\n', 0, 3],
    ['```text\nCONCIERGE-RESULT: done example\n```\n', 0, 3],
    ['CONCIERGE-RESULT: done deploy\n', 9, 9],
  ]) {
    const paths = await fixture(t);
    const task = path.join(paths.root, 'task.md');
    await writeFile(task, 'Ship the fix.\n');
    const result = launch(paths, ['--task-file', task, '--autonomy', 'full', '--', '--max-ai-credits', '30'], childCode, { COPILOT_TEAM_TEST_STDOUT: stdout });
    assertExit(result, expected);
    const [call] = await invocations(paths);
    assert.deepEqual(call.argv.slice(-4), ['-p', 'Ship the fix.', '--max-ai-credits', '30']);
  }
});

test('an invalid autonomy value or a misused one-task option never starts Copilot', posixOnly, async t => {
  for (const [extra, environment] of [
    [[], { COPILOT_CONCIERGE_AUTONOMY: 'FULL' }],
    [['--autonomy', 'unattended'], {}],
    [['--', '--allow-all-tools'], {}],
    [['--task', 'x', '--', '--agent', 'other'], {}],
    [['--task', 'x', '--', '--help', '--max-ai-credits', '30'], { COPILOT_CONCIERGE_AUTONOMY: 'full' }],
    [['--task', 'x', '--', '--output-format', 'json', '--max-ai-credits', '30'], { COPILOT_CONCIERGE_AUTONOMY: 'full' }],
    [['--task-file', 'missing-task.md', '--', '--max-ai-credits', '30'], { COPILOT_CONCIERGE_AUTONOMY: 'full' }],
    // Nobody is there to answer a guided run, so a task without full autonomy is refused.
    [['--task', 'x', '--', '--max-ai-credits', '30'], {}],
    [['--task', 'x', '--autonomy', 'guided', '--', '--max-ai-credits', '30'], { COPILOT_CONCIERGE_AUTONOMY: 'full' }],
    // An unattended run without a spend cap is refused.
    [['--task', 'x', '--autonomy', 'full'], {}],
    [['--task', 'x', '--autonomy', 'full', '--', '--allow-tool', 'write'], {}],
  ]) {
    const paths = await fixture(t);
    const result = launch(paths, extra, 0, environment);
    assertExit(result, 1);
    assert.ok(result.stderr.trim());
    assert.deepEqual(await invocations(paths), []);
    assert.deepEqual(await readdir(paths.output), [], 'a refused run leaves no generated copy');
  }
});

test('a task that says --help is passed as task text rather than an early successful exit', posixOnly, async t => {
  const paths = await fixture(t);
  const result = launch(paths, ['--task', '--help', '--autonomy', 'full', '--', '--max-ai-credits', '30'], 0, {
    COPILOT_TEAM_TEST_STDOUT: 'CONCIERGE-RESULT: done help-request\n',
  });
  assertExit(result, 0);
  const [call] = await invocations(paths);
  assert.equal(call.argv[call.argv.indexOf('-p') + 1], '--help');
});

test('service environment overrides guided project settings before Copilot starts and preserves ask', posixOnly, async t => {
  const paths = await fixture(t);
  await writeFile(paths.projectConfig, JSON.stringify({ autonomy: 'guided', planApproval: 'ask' }));
  const result = launch(paths, ['--task', 'Make the requested change', '--', '--max-ai-credits', '30'], 0, {
    COPILOT_CONCIERGE_AUTONOMY: 'full',
    COPILOT_TEAM_TEST_STDOUT: 'Plan requires approval.\nCONCIERGE-RESULT: needs_approval change\n',
  });
  assertExit(result, 2);
  const [call] = await invocations(paths);
  const pluginDirectory = call.argv[call.argv.indexOf('--plugin-dir') + 1];
  assert.equal(path.dirname(pluginDirectory), paths.output);
  const effective = JSON.parse(await readFile(path.join(pluginDirectory, 'effective-config.json'), 'utf8'));
  assert.equal(effective.value.autonomy, 'full');
  assert.equal(effective.source.autonomy, 'environment: COPILOT_CONCIERGE_AUTONOMY');
  assert.equal(effective.value.planApproval, 'ask');
  for (const filename of ['concierge.agent.md', 'orchestrator.agent.md', 'worker.agent.md']) {
    const profile = await readFile(path.join(pluginDirectory, 'com.github.copilot/agents', filename), 'utf8');
    assert.match(profile, /"autonomy": "full"/);
    assert.match(profile, /"planApproval": "ask"/);
  }
});
