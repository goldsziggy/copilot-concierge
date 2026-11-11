import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AUTONOMY_ENV, AUTONOMY_MODES, loadConfig, resolveConfig, validateConfig } from '../scripts/lib/config.mjs';
import { configureProfile } from '../scripts/lib/package.mjs';
import { createResultTracker, nativeArguments, parseLaunchArguments, resultExitCode } from '../scripts/lib/launch.mjs';

const read = async file => (await readFile(new URL(`../${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');

async function project(t, files = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'copilot-concierge-autonomy-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const userConfig = path.join(dir, 'user.json');
  await writeFile(userConfig, JSON.stringify(files.user ?? {}));
  if (files.project) {
    await mkdir(path.join(dir, '.copilot-concierge'));
    await writeFile(path.join(dir, '.copilot-concierge/config.json'), JSON.stringify(files.project));
  }
  return { project: dir, userConfig };
}

test('autonomy defaults to guided and the nearest file wins', () => {
  assert.deepEqual(AUTONOMY_MODES, ['guided', 'full']);
  assert.equal(resolveConfig().value.autonomy, 'guided');
  assert.equal(resolveConfig().source.autonomy, 'default');
  const result = resolveConfig([
    { source: 'user', value: { autonomy: 'full' } },
    { source: 'project', value: { autonomy: 'guided' } },
    { source: 'session', value: {} },
  ]);
  assert.equal(result.value.autonomy, 'guided');
  assert.equal(result.source.autonomy, 'project');
  // Plan approval is a separate setting and is never changed by autonomy.
  assert.equal(resolveConfig([{ source: 'user', value: { autonomy: 'full', planApproval: 'ask' } }]).value.planApproval, 'ask');
});

test('an invalid autonomy value is an error, never an implicit full or guided', () => {
  for (const autonomy of ['Full', 'FULL', 'auto', 'yolo', '', true, null, 1]) {
    assert.throws(() => validateConfig({ autonomy }), /autonomy must be guided or full/, String(autonomy));
  }
});

test('the environment variable swaps the mode over files, and the flag overrides the variable', async t => {
  const paths = await project(t, { user: { autonomy: 'guided' }, project: { autonomy: 'guided' } });
  assert.equal(AUTONOMY_ENV, 'COPILOT_CONCIERGE_AUTONOMY');
  const files = await loadConfig({ ...paths, env: {} });
  assert.equal(files.value.autonomy, 'guided');
  assert.match(files.source.autonomy, /^project: /);

  const fromEnvironment = await loadConfig({ ...paths, env: { [AUTONOMY_ENV]: 'full' } });
  assert.equal(fromEnvironment.value.autonomy, 'full');
  assert.equal(fromEnvironment.source.autonomy, `environment: ${AUTONOMY_ENV}`);

  await writeFile(path.join(paths.project, '.copilot-concierge/config.json'), JSON.stringify({ autonomy: 'full', planApproval: 'ask' }));
  const backToGuided = await loadConfig({ ...paths, env: { [AUTONOMY_ENV]: 'guided' } });
  assert.equal(backToGuided.value.autonomy, 'guided');
  assert.equal(backToGuided.value.planApproval, 'ask');
  assert.equal(backToGuided.source.autonomy, `environment: ${AUTONOMY_ENV}`);
  await writeFile(path.join(paths.project, '.copilot-concierge/config.json'), JSON.stringify({ autonomy: 'guided' }));

  const flagged = await loadConfig({ ...paths, env: { [AUTONOMY_ENV]: 'full' }, autonomy: 'guided' });
  assert.equal(flagged.value.autonomy, 'guided');
  assert.equal(flagged.source.autonomy, 'task: --autonomy');

  // Surrounding whitespace is tolerated; an empty variable means "not set".
  assert.equal((await loadConfig({ ...paths, env: { [AUTONOMY_ENV]: ' full\n' } })).value.autonomy, 'full');
  assert.equal((await loadConfig({ ...paths, env: { [AUTONOMY_ENV]: '  ' } })).value.autonomy, 'guided');
  await assert.rejects(loadConfig({ ...paths, env: { [AUTONOMY_ENV]: 'FULL' } }), /environment: COPILOT_CONCIERGE_AUTONOMY: autonomy must be guided or full/);
  await assert.rejects(loadConfig({ ...paths, env: {}, autonomy: 'unattended' }), /autonomy must be guided or full/);
});

test('generated profiles carry the resolved mode and its source', () => {
  const profile = '---\nname: example\nmodel: authored-model\ntools: [task]\n---\nDo only assigned work.\n';
  const config = resolveConfig([{ source: `environment: ${AUTONOMY_ENV}`, value: { autonomy: 'full' } }]);
  for (const file of ['concierge.agent.md', 'orchestrator.agent.md', 'worker.agent.md']) {
    const output = configureProfile(profile, file, config);
    assert.ok(output.includes('"autonomy": "full"'));
    assert.ok(output.includes(`"autonomySource": "environment: ${AUTONOMY_ENV}"`));
    assert.ok(output.includes('and neither does full autonomy'));
  }
});

test('launcher arguments separate configuration, one task and explicitly forwarded native flags', () => {
  assert.deepEqual(parseLaunchArguments(['--project', 'repo']), { configure: ['--project', 'repo'], task: undefined, taskFile: undefined, forwarded: [], oneShot: false });
  const run = parseLaunchArguments(['--autonomy', 'full', '--task', 'Fix the failing test', '--', '--allow-tool', 'shell(npm test)', '--max-ai-credits', '30']);
  assert.deepEqual(run.configure, ['--autonomy', 'full']);
  assert.equal(run.task, 'Fix the failing test');
  assert.deepEqual(run.forwarded, ['--allow-tool', 'shell(npm test)', '--max-ai-credits', '30']);
  assert.equal(run.oneShot, true);
  assert.equal(parseLaunchArguments(['--task-file', 'task.md', '--', '--max-ai-credits=30']).taskFile, 'task.md');
  // A permission flag that is not explicitly forwarded stays a configuration
  // error, as before; it is never interpreted by the launcher.
  assert.deepEqual(parseLaunchArguments(['--allow-all-tools']).configure, ['--allow-all-tools']);
  for (const [argv, message] of [
    [['--', '--allow-all-tools'], /only with --task or --task-file/],
    [['--task', 'a', '--task', 'b'], /one task/],
    [['--task', 'a', '--task-file', 'b'], /one task/],
    [['--task'], /Incomplete option/],
    [['--task', '  '], /must not be empty/],
    [['--task', 'a', '--', '--agent', 'other'], /sets --agent itself/],
    [['--task', 'a', '--', '--model=other'], /sets --model itself/],
    [['--task', 'a', '--', '-p', 'other'], /sets -p itself/],
    [['--task', 'a', '--', '-pOther'], /sets -p itself/],
    [['--task', 'a', '--', '--output-format=json'], /sets --output-format itself/],
    [['--task', 'a', '--', '--silent=false'], /sets --silent itself/],
    [['--task', 'a', '--', '--help'], /cannot forward --help/],
    [['--task', 'a', '--', '-v'], /cannot forward -v/],
    [['--task', 'a', '--', '--server'], /cannot forward --server/],
    // An unattended run without a spend cap is refused, never given a default.
    [['--task', 'a'], /needs a spend cap/],
    [['--task', 'a', '--', '--allow-tool', 'write'], /needs a spend cap/],
    [['--task-file', 'task.md', '--autonomy', 'full'], /needs a spend cap/],
  ]) assert.throws(() => parseLaunchArguments(argv), message, argv.join(' '));
});

test('full autonomy disables the question tool but never adds a permission flag', () => {
  const configured = mode => ({
    pluginDirectory: '/generated/session-x',
    value: { autonomy: mode, models: { concierge: 'root-model' }, extraDirectories: [] },
  });
  const guided = nativeArguments(configured('guided'));
  assert.deepEqual(guided, ['--no-auto-update', '--plugin-dir', '/generated/session-x', '--agent', 'copilot-concierge:concierge', '--model', 'root-model']);
  const full = nativeArguments(configured('full'));
  assert.deepEqual(full, [...guided, '--no-ask-user']);
  const oneShot = nativeArguments(configured('full'), { task: 'Fix it', forwarded: ['--allow-tool', 'shell(npm test)'] });
  assert.deepEqual(oneShot, [...full, '--silent', '--output-format', 'text', '--no-color', '-p', 'Fix it', '--allow-tool', 'shell(npm test)']);
  for (const args of [guided, full, nativeArguments(configured('full'), { task: 'Fix it' })]) {
    assert.ok(!args.some(flag => /^--(?:allow|yolo|assisted)/.test(flag)), 'no permission flag is added by the launcher');
  }
});

test('a one-task run requires a complete unfenced final result with an objective ID', () => {
  assert.deepEqual(resultExitCode('work\nCONCIERGE-RESULT: done fix-login\n', 0), { code: 0, status: 'done' });
  assert.deepEqual(resultExitCode('CONCIERGE-RESULT: `blocked` fix-login', 0), { code: 2, status: 'blocked' });
  assert.equal(resultExitCode('CONCIERGE-RESULT: needs_approval x', 0).code, 2);
  assert.equal(resultExitCode('CONCIERGE-RESULT: cancelled x', 0).code, 2);
  // The last result line wins; an earlier quoted example does not.
  assert.equal(resultExitCode('CONCIERGE-RESULT: done a\n...\nCONCIERGE-RESULT: blocked a\n', 0).status, 'blocked');
  assert.deepEqual(resultExitCode('All finished, tests pass.', 0), { code: 3, status: 'unknown' });
  assert.deepEqual(resultExitCode('CONCIERGE-RESULT: done x', 7), { code: 7, status: 'host-error' });
  for (const output of [
    'The failing test contains CONCIERGE-RESULT: done but the objective is still blocked.\n',
    'CONCIERGE-RESULT: done x\nCorrection: the requested work remains incomplete.\n',
    'CONCIERGE-RESULT: done\n',
    'CONCIERGE-RESULT: done <objective-id>\n',
    '> CONCIERGE-RESULT: done quoted\n',
    '```text\nCONCIERGE-RESULT: done example\n```\n',
    '```text\nCONCIERGE-RESULT: done example',
    '~~~text\nCONCIERGE-RESULT: done example',
    'CONCIERGE-RESULT: done x extra words\n',
  ]) assert.deepEqual(resultExitCode(output, 0), { code: 3, status: 'unknown' }, output);
  assert.equal(resultExitCode('```text\nCONCIERGE-RESULT: done example\n```\nActual result:\nCONCIERGE-RESULT: blocked real-objective\r\n\r\n', 0).code, 2);
});

test('streamed results retain fence state across chunks and long answers', () => {
  const tracker = createResultTracker();
  for (const chunk of ['```text\n', 'x'.repeat(70000), '\nCONCIERGE-', 'RESULT: done example\n']) tracker.write(chunk);
  assert.equal(tracker.finish(0).code, 3, 'a long fenced example never becomes a final result');
  const finished = createResultTracker();
  for (const chunk of ['x'.repeat(70000), '\nSummary.\r\nCONCIERGE-RES', 'ULT: done actual-objective\r', '\n \n']) finished.write(chunk);
  assert.deepEqual(finished.finish(0), { code: 0, status: 'done' });
});

// Instruction contracts only: these do not show that a live model follows them.
test('the brief and report carry autonomy consistently across profiles and the reference', async () => {
  const concierge = await read('com.github.copilot/agents/concierge.agent.md');
  const orchestrator = await read('com.github.copilot/agents/orchestrator.agent.md');
  const handoff = await read('references/handoff.md');
  assert.equal((concierge.match(/^autonomy stated by user: /gm) ?? []).length, 2, 'new and rollover briefs');
  assert.equal((concierge.match(/^acceptance criteria: /gm) ?? []).length, 2, 'rollover keeps the acceptance criteria');
  for (const text of [concierge, handoff]) assert.match(text, /^autonomy stated by user: /m);
  for (const text of [orchestrator, handoff]) {
    assert.match(text, /^autonomy: <guided\|full>: <source>$/m);
    assert.match(text, /COMPLETION CHECK/);
    assert.match(text, /decided for the user/);
  }
  assert.match(orchestrator, new RegExp(AUTONOMY_ENV));
  assert.match(orchestrator, /read the variable with one shell command that does nothing else/);
  assert.match(orchestrator, /A setting you cannot read is unset: use the default and continue, and never stop for it/);
  assert.match(orchestrator, /The default is `guided`/);
  assert.match(orchestrator, /report any other value and use `guided`/);
});

test('full autonomy is unattended: it decides, never asks and stops only at hard stops', async () => {
  const orchestrator = await read('com.github.copilot/agents/orchestrator.agent.md');
  const concierge = await read('com.github.copilot/agents/concierge.agent.md');
  for (const pattern of [
    /treat the run as unattended, such as a CI job/,
    /record it in `decisions` as `decided for the user: <choice>: <why>`/,
    /never user decisions or approvals/,
    /Never report `needs_input`/,
    /reported as `blocked` with exactly what is needed/,
    /something only the user can supply/,
    /destructive, hard to undo or reaches beyond the repository/,
    /costly to reverse/,
    /a conflict with an explicit user restriction/,
    /Plan approval `ask` is not overridden/,
    /Try a denied action once more in its plain form and never the same call twice/,
    /Report a hard stop once and end the turn/,
    /If the same step fails the same way twice, stop retrying it and report `blocked`/,
    /continuing without progress is not/,
    /A denied tool call is not a hard stop/,
    /run each command on its own exactly as the task or repository names it/,
    /A source you cannot read is unset, never a blocker/,
    /`COMPLETION CHECK: <items>` from Concierge is control metadata, not a user request/,
  ]) assert.match(orchestrator, pattern);
  for (const pattern of [
    /a non-interactive run stays alive while background agents work/,
    /`read_agent` with `wait: true` and a `timeout` of at most 180 seconds/,
    /end the turn rather than polling/,
    /Do not call `ask_user` or wait for a reply/,
    /send `COMPLETION CHECK: <those items>` to the orchestrator once/,
    /you still read no files and judge no code/,
    /"Decided for you:"/,
    /With `guided`, send no completion check/,
    /Send at most one `COMPLETION CHECK` per objective/,
    /After a `blocked` report under `full`, send nothing more/,
    /do not send `CONTINUE` again; relay the latest report as `blocked`/,
    /Never start a second orchestrator for an objective because the first one is blocked/,
  ]) assert.match(concierge, pattern);
});

test('autonomy changes who answers, not what is allowed', async () => {
  const orchestrator = await read('com.github.copilot/agents/orchestrator.agent.md');
  const concierge = await read('com.github.copilot/agents/concierge.agent.md');
  assert.match(orchestrator, /Scope, plan approval, Git requests, file-write restrictions, learning scopes, proportional review, the retry-once rule and Copilot's permissions are unchanged/);
  assert.match(orchestrator, /never justifies a permission bypass/);
  assert.match(orchestrator, /not saved to memory without the user's confirmation/);
  assert.match(concierge, /never plan approval `ask`, scope, Git requests, file-write restrictions or Copilot's permissions/);
  assert.match(concierge, /never sets autonomy/);
  // The guided default keeps its existing plan checkpoint.
  assert.match(orchestrator, /With `auto`, report a `checkpoint` that shows the plan and source, and continue on `CONTINUE`/);
  // Live trial 6: the host offered the skill tool to the entry agent anyway.
  assert.match(concierge, /no loading of skills even when the host offers them/);
  // Concierge stays control-only in every mode.
  const tools = concierge.match(/^tools: \[(.+)\]$/m)[1].split(',').map(tool => tool.trim()).sort();
  assert.deepEqual(tools, ['ask_user', 'list_agents', 'read_agent', 'task', 'update_todo', 'write_agent']);
});

test('the result line the entry agent writes is the one the launcher reads', async () => {
  const concierge = await read('com.github.copilot/agents/concierge.agent.md');
  // Live trial 2: the line was dropped when it was not unambiguously last.
  assert.match(concierge, /the very last line of your reply, after any suggestions, is exactly/);
  assert.match(concierge, /never omit it or put text after it/);
  const statuses = concierge.match(/`CONCIERGE-RESULT: <([a-z_|]+)> <objective-id>`/)?.[1].split('|');
  assert.deepEqual(statuses, ['done', 'blocked', 'cancelled', 'needs_approval']);
  for (const status of statuses) {
    const result = resultExitCode(`Summary.\nCONCIERGE-RESULT: ${status} objective-1\n`, 0);
    assert.equal(result.status, status);
    assert.equal(result.code, status === 'done' ? 0 : 2);
  }
});
