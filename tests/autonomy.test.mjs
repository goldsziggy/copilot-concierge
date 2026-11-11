import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AUTONOMY_ENV, AUTONOMY_MODES, loadConfig, resolveConfig, validateConfig } from '../scripts/lib/config.mjs';
import { configureProfile } from '../scripts/lib/package.mjs';
import { nativeArguments } from '../scripts/lib/launch.mjs';

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

test('full autonomy disables the question tool but never adds a permission flag', () => {
  const configured = autonomy => ({ pluginDirectory: '/tmp/session-x', value: { autonomy, extraDirectories: [], models: { concierge: 'auto' } } });
  const guided = nativeArguments(configured('guided'));
  assert.deepEqual(nativeArguments(configured('full')), [...guided, '--no-ask-user']);
  for (const args of [guided, nativeArguments(configured('full'))]) {
    assert.ok(!args.some(flag => /^--(?:allow|yolo|assisted)/.test(flag)), 'no permission flag is added by the launcher');
  }
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
    /treat the run as unattended, such as a cloud agent driven through the Copilot SDK/,
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

test('the result line the entry agent writes is the one an SDK client reads', async () => {
  const concierge = await read('com.github.copilot/agents/concierge.agent.md');
  const sdk = await read('references/sdk-automation.md');
  // Live trial 2: the line was dropped when it was not unambiguously last.
  assert.match(concierge, /the very last line of your reply, after any suggestions, is exactly/);
  assert.match(concierge, /in plain text with no formatting, quoting or list marker/);
  assert.match(concierge, /never omit it or put text after it/);
  const statuses = concierge.match(/`CONCIERGE-RESULT: <([a-z_|]+)> <objective-id>`/)?.[1].split('|');
  assert.deepEqual(statuses, ['done', 'blocked', 'cancelled', 'needs_approval']);
  // The documented client pattern accepts exactly the line the profile asks for.
  const pattern = new RegExp(sdk.match(/^const RESULT = \/(.+)\/;$/m)[1]);
  for (const status of statuses) assert.equal(pattern.exec(`CONCIERGE-RESULT: ${status} objective-1`)?.[1], status);
  assert.equal(pattern.exec('- CONCIERGE-RESULT: done objective-1'), null);
  assert.match(sdk, /Leave out `onUserInputRequest`/);
  assert.match(sdk, /Do not rely on `sendAndWait`'s return value for the result/);
  assert.match(sdk, /`auto` for the session, which is Copilot Fusion/);
});
