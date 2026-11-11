import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DEFAULTS } from '../scripts/lib/config.mjs';

const agents = fileURLToPath(new URL('../com.github.copilot/agents/', import.meta.url));

async function profiles() {
  const result = {};
  for (const file of await readdir(agents)) {
    if (!file.endsWith('.agent.md')) continue;
    const text = (await readFile(path.join(agents, file), 'utf8')).replace(/\r\n/g, '\n');
    const header = text.match(/^---\n([\s\S]*?)\n---\n/)[1];
    const value = key => header.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1];
    result[value('name')] = { model: value('model'), policy: value('model-policy'), tools: value('tools'), header, body: text.slice(header.length) };
  }
  const orchestrate = (await readFile(new URL('../skills/orchestrate/SKILL.md', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const reference = (await readFile(new URL('../skills/orchestrate-reference/SKILL.md', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  result.orchestrator.contract = `${result.orchestrator.body}\n${orchestrate}\n${reference}`;
  result.orchestrator.orchestrate = orchestrate;
  return result;
}

// Regression: in Copilot CLI 1.0.93 a nested agent receives only tools that its
// parent agent also has. A control-only orchestrator left every specialist
// without `view`, so the scout could not read its fixture.
test('orchestrator passes specialist tools through instead of narrowing them', async () => {
  const { orchestrator } = await profiles();
  assert.equal(orchestrator.tools, undefined);
  assert.match(orchestrator.header, /^include-custom-instructions: true$/m);
  assert.match(orchestrator.body, /may investigate, plan, implement and verify directly within the approved scope/);
  assert.doesNotMatch(orchestrator.body, /Delegate everything substantive|Never do the work yourself|The only tools you call/);
});

// Written routing/authority contracts only; persistence behavior is exercised in
// learning.test.mjs. These checks do not claim that a live model followed them.
test('Scout separates private personalization from confirmed repository knowledge', async () => {
  const { scout } = await profiles();
  const skill = await readFile(new URL('../skills/scout/SKILL.md', import.meta.url), 'utf8');
  for (const content of [scout.body, skill]) {
    assert.match(content, /~\/\.config\/copilot-concierge\/memory\.json/);
    assert.match(content, /docs\/concierge\/knowledge\.md/);
    assert.match(content, /read-only migration input/);
    assert.match(content, /helper/);
    assert.match(content, /private memory|private preferences/i);
    assert.match(content, /repository knowledge/);
  }
  assert.match(skill, /Assumptions, guesses, disputed behavior and unverified findings stay in the ephemeral brief/);
  assert.match(skill, /Never use private memory or another repository's facts as evidence/);
  assert.match(skill, /Do not copy the transcript/);
  assert.match(skill, /A correction replaces the same ID/);
  assert.match(skill, /Do not reconstruct forgotten preferences/);
  assert.match(skill, /preserves the original file byte-for-byte/);
  assert.match(skill, /Do not bypass a helper rejection by directly editing/);
  assert.doesNotMatch(skill, /\]\((?:\.\.\/|\/)/, 'Scout skill stays self-contained');
});

test('learning access and privacy survive routing, escalation and rollover', async () => {
  const { concierge, orchestrator, escalation } = await profiles();
  const orchestration = await readFile(new URL('../skills/orchestrate/SKILL.md', import.meta.url), 'utf8');
  const handoff = await readFile(new URL('../references/handoff.md', import.meta.url), 'utf8');
  assert.equal((concierge.body.match(/^file-write restrictions stated by user:/gm) ?? []).length, 2);
  for (const content of [concierge.body, orchestrator.contract, escalation.body, orchestration, handoff]) {
    assert.match(content, /learning/i);
    assert.match(content, /wholly read-only/i);
    assert.match(content, /private/);
    assert.match(content, /repository knowledge/);
  }
  for (const content of [orchestrator.contract, handoff]) {
    assert.match(content, /^learning: .*memory read\/maintain\/disabled; knowledge read\/maintain\/disabled/m);
  }
  assert.match(concierge.body, /even without a repository/);
  assert.match(concierge.body, /Carry this distinction through follow-ups and rollover/);
  assert.match(orchestrator.contract, /Serialize private memory mutations per OS user and knowledge mutations per repository/);
  assert.match(orchestrator.contract, /other roles have no learning-write exception/);
  assert.match(orchestrator.contract, /never put raw memory, user evidence or personal history/);
  assert.match(orchestration, /even to a routed or escalated worker/);
});

test('knowledge commits stay deliberate and memories cannot grant authority', async () => {
  const { concierge, orchestrator, scout } = await profiles();
  const skill = await readFile(new URL('../skills/scout/SKILL.md', import.meta.url), 'utf8');
  assert.match(concierge.body, /Private memory never changes plan approval, models, tool permissions or security/);
  assert.match(orchestrator.body, /When the user asked for a commit/);
  assert.match(orchestrator.body, /include the relevant knowledge file deliberately/);
  assert.match(orchestrator.body, /absence of private data/);
  assert.match(scout.body, /Scout may perform specifically requested Git actions/);
  assert.match(skill, /A question or a learning write alone does not authorize a Git commit/);
  assert.match(skill, /repository-only restriction disables knowledge writes/);
  assert.match(skill, /an inference: return a short suggested question/);
});

test('routing and model gaps permit scoped host-supported fallback', async () => {
  const { orchestrator } = await profiles();
  assert.match(orchestrator.contract, /model pin is a preference, not an eligibility requirement/);
  assert.match(orchestrator.contract, /execute directly within scope/);
  assert.match(orchestrator.contract, /Never bypass host permissions or a user restriction/);
  assert.match(orchestrator.contract, /reconcile any uncertain effects/);
});

test('Concierge entry is control-only; the root list does not restrict its children', async () => {
  const { concierge } = await profiles();
  const tools = concierge.tools.replace(/[[\]\s]/g, '').split(',');
  assert.deepEqual(tools.sort(), ['ask_user', 'list_agents', 'read_agent', 'task', 'update_todo', 'write_agent']);
});

test('every role has one preferred model without required policy', async () => {
  const all = await profiles();
  assert.equal(Object.keys(all).length, 7);
  for (const [name, profile] of Object.entries(all)) {
    assert.equal(profile.policy, undefined, name);
    assert.doesNotMatch(profile.model, /^\[|,/, `${name} must not list fallback models`);
    // Copilot Fusion routes only the session's own agent (live SDK trials B and C),
    // so only the entry agent may follow it; sub-agents keep explicit models.
    if (name === 'concierge') assert.equal(profile.model, 'auto', 'the entry agent prefers Copilot Fusion');
    else assert.doesNotMatch(profile.model, /auto|fusion/i, `${name} must keep an explicit model`);
  }
  assert.equal(all.concierge.model, DEFAULTS.models.concierge);
  assert.equal(all.orchestrator.model, DEFAULTS.models.orchestrator);
  assert.equal(all.escalation.model, DEFAULTS.models.escalation);
  for (const leaf of ['scout', 'product-manager', 'worker', 'reviewer']) {
    assert.equal(all[leaf].model, DEFAULTS.models.specialist, leaf);
  }
});

test('specialists cannot dispatch agents or own the task list through their tool lists', async () => {
  const all = await profiles();
  for (const [name, profile] of Object.entries(all)) {
    if (['concierge', 'orchestrator'].includes(name) || !profile.tools) continue;
    assert.doesNotMatch(profile.tools, /\b(task|read_agent|write_agent|list_agents|update_todo|ask_user)\b/, name);
    // Host tool names differ by model family; list both so neither is dropped.
    assert.match(profile.tools, /\bview\b/, name);
    assert.match(profile.tools, /\brg\b.*\bgrep\b/, name);
  }
});

// Regression: unquoted 'Internal to Concierge: ...' descriptions made the YAML
// invalid, and Copilot dropped every internal agent ("Unknown agent_type").
test('frontmatter values containing ": " are quoted so Copilot can parse them', async () => {
  for (const [name, profile] of Object.entries(await profiles())) {
    for (const line of profile.header.split('\n')) {
      const value = line.match(/^[a-z-]+: (.*)$/)?.[1];
      if (value && /: | #/.test(value)) assert.match(value, /^["'[]/, `${name}: ${line}`);
    }
  }
});

test('reports carry a handover a fresh orchestrator can continue from', async () => {
  const { orchestrator } = await profiles();
  for (const field of ['request', 'follow-ups', 'decisions', 'done', 'open', 'sources']) {
    assert.match(orchestrator.body, new RegExp(`^- ${field}: `, 'm'), field);
  }
  assert.match(orchestrator.body, /objective: <objective name from the brief>/);
  assert.match(orchestrator.body, /`ROLLOVER`/);
  assert.match(orchestrator.body, /`RESUMED`/);
});

test('Concierge entry tracks several orchestrators and rolls long ones over', async () => {
  const { concierge } = await profiles();
  assert.match(concierge.body, /several can work at the same time/);
  assert.match(concierge.body, /`list_agents` with `scope: "children"`/);
  assert.match(concierge.body, /has reported `done` or `blocked`, has reached 10 turns/);
  assert.match(concierge.body, /Never roll over for answers, approvals or `CONTINUE`/);
  assert.match(concierge.body, /ROLLOVER from <old name>: continue from the handover/);
  assert.match(concierge.body, /earlier context: <the old report's handover block, copied verbatim>/);
  assert.match(concierge.body, /never erases another objective's items|so one report never erases another objective's items/);
});

test('ordinary scoped work proceeds by default while explicit approval remains available', async () => {
  const { concierge, orchestrator } = await profiles();
  assert.match(concierge.body, /request to make a change authorizes the ordinary work/);
  assert.match(orchestrator.body, /default `auto`/);
  assert.match(orchestrator.body, /With `ask`, report `needs_approval` and wait/);
});

// These are prompt-contract regressions, not executions of the host or an LLM.
test('plain installs honor environment autonomy before file defaults in both directions', async () => {
  const { orchestrator } = await profiles();
  const autonomy = orchestrator.body.match(/## Autonomy\n([\s\S]*?)\n## Git and pull requests/)[1];
  assert.match(autonomy, /then this session, then an effective-configuration block/);
  assert.match(autonomy, /use its value and source without rereading lower-priority sources/);
  assert.match(autonomy, /read `COPILOT_CONCIERGE_AUTONOMY` with one shell command that does nothing else, once per objective, and never dump the environment/);
  assert.match(autonomy, /A valid value overrides the project and user files in either direction/);
  assert.match(autonomy, /Only when the variable is unset, empty or cannot be read/);
  assert.match(autonomy, /The default is `guided`/);
  assert.match(autonomy, /report an unavailable environment read rather than claiming the variable was applied/);
  assert.match(autonomy, /Plan approval `ask` is not overridden/);
  assert.doesNotMatch(autonomy, /if both leave it unset, read the variable/);
});

test('no-progress guard permits completion evidence and terminal results', async () => {
  const { concierge } = await profiles();
  const guard = concierge.body.match(/\*\*Loop guard, in every mode\.\*\* (.+)/)[1];
  assert.match(guard, /only to consecutive `checkpoint` reports requesting a bare `CONTINUE`/);
  assert.match(guard, /where you sent a bare `CONTINUE` between them/);
  assert.match(guard, /Compare task state, reported evidence, unresolved questions and follow-up outcomes; identical/);
  assert.match(guard, /identical `tasks` lines alone do not establish a stall/);
  assert.match(guard, /User answers or approvals, completion-check responses and terminal reports are never stalled merely because their task lists match/);
  assert.match(guard, /If none of that state advanced, do not send `CONTINUE` again/);
  assert.match(guard, /Send at most one `COMPLETION CHECK` per objective/);
  assert.match(guard, /After a `blocked` report under `full`, send nothing more/);
  assert.match(concierge.body, /If they later answer a displayed approval plan, apply the same plan-decision rules as in `guided` and send `PLAN DECISION: <exact choice and any text>`/);
  assert.doesNotMatch(guard, /If two reports in a row from an orchestrator show the same `tasks` lines/);
});

test('orchestrator follows a customer copilot-concierge-routing skill without changing its rules', async () => {
  const { orchestrator } = await profiles();
  assert.match(orchestrator.body, /lists `copilot-concierge-routing` or skills named `copilot-concierge-routing-<something>`, load them before choosing specialists/);
  assert.match(orchestrator.body, /Never bypass host permissions or a user restriction/);
});

const orchestrationSkill = () => readFile(new URL('../skills/orchestrate/SKILL.md', import.meta.url), 'utf8');

// Instruction contracts only: these checks never call a provider, Git remote or model.
test('Ship it is gone: no agent, skill, route role or publication-consent stage remains', async () => {
  const all = await profiles();
  assert.equal(all['ship-it'], undefined);
  assert.ok(!(await readdir(new URL('../skills/', import.meta.url))).includes('ship-it'));
  const orchestration = await orchestrationSkill();
  for (const text of [all.concierge.body, all.orchestrator.body, all.escalation.body, orchestration]) {
    assert.doesNotMatch(text, /ship-it|Ship it|publication consent|read-only preflight/);
  }
});

test('commits, pushes and pull requests are ordinary requests, never refused as a Concierge rule', async () => {
  const { concierge, orchestrator, escalation } = await profiles();
  const orchestration = await orchestrationSkill();
  const scoutSkill = await readFile(new URL('../skills/scout/SKILL.md', import.meta.url), 'utf8');
  for (const pattern of [
    /Commits, pushes, branches and pull requests are ordinary repository work/,
    /Concierge adds no extra consent step and has no rule against committing or pushing/,
    /Never tell the user that Concierge cannot commit, push or open a pull request/,
    /report that exact cause and how to fix it/,
    /Without such a request, leave changes uncommitted and say so/,
    /Do not force-push, rewrite published history, merge or delete branches unless the user asks/,
    /^git: <what the user asked for/m,
  ]) assert.match(orchestrator.contract, pattern);
  assert.match(concierge.body, /Never tell the user that Concierge cannot commit, push or open a pull request/);
  assert.match(orchestration, /Never answer that the Concierge workflow cannot commit or push/);
  assert.match(escalation.body, /when the handoff's `git` line says the user asked for it/);
  assert.match(scoutSkill, /Scout may perform specifically requested Git actions/);
  for (const text of [orchestrator.contract, orchestration, escalation.body]) {
    assert.doesNotMatch(text, /Do not authorize commits|no-commit\/push|never merge or push|When the user authorizes commits/);
  }
});

test("Sol mirrors its checklist into the session todos that Copilot's todo view reads", async () => {
  const { concierge, orchestrator } = await profiles();
  for (const pattern of [
    /read the session's `todos` and `todo_deps` tables/,
    /`id` is `<objective>\/<short-slug>`/,
    /`pending` for `- \[ \]`, `in_progress` for `- \[\/\]`, `done` for `- \[x\]` and `blocked` for `- \[-\]`/,
    /ON CONFLICT\(id\) DO UPDATE/,
    /Never create, alter or drop the tables/,
    /never edit another objective's rows/,
    /keep the earlier ids/,
    /Workers never write todos/,
    /continue with the checklist alone/,
  ]) assert.match(orchestrator.contract, pattern);
  assert.match(concierge.body, /you do not write those/);
  // Mirroring is Sol's job; the entry agent stays control-only with no SQL tool.
  assert.doesNotMatch(concierge.tools, /\bsql\b/);
});

test('suggestions are grounded offers and every follow-up gets an outcome', async () => {
  const { concierge, orchestrator } = await profiles();
  const orchestration = await orchestrationSkill();
  assert.match(orchestrator.body, /^suggestions:\n- <a follow-up worth offering, with its one-line reason; or none>$/m);
  assert.match(orchestrator.body, /each with its outcome: applied \| deferred: why \| no change: why/);
  assert.match(orchestrator.body, /do not report `done` while a follow-up has no outcome/);
  for (const pattern of [
    /at most three follow-ups/,
    /grounded in this objective's evidence/,
    /Write `none` when nothing material applies/,
    /a related defect or risk you noticed outside the approved scope, which you reported instead of fixing/,
    /Do not pad with generic advice/,
    /repeat a suggestion the user declined/,
    /Never start one until the user accepts it/,
    /Long or multi-phase requests get checkpoints/,
    /The objective is not `done` while a follow-up has no outcome/,
  ]) assert.match(orchestration, pattern);
  assert.match(concierge.body, /"Next steps you might want:"/);
  assert.match(concierge.body, /do not ask them with `ask_user`/);
  assert.match(concierge.body, /never start one yourself/);
  assert.match(concierge.body, /\(accepted suggestion: <the full suggestion text>\)/);
});

// Instruction contracts, not live model acceptance or a permission boundary.
test('direct execution preserves route, evidence, approval and recovery boundaries', async () => {
  const { orchestrator } = await profiles();
  for (const pattern of [
    /Follow applicable repository instructions/,
    /Direct work follows the same scope, plan approval/,
    /A tracked task does not require a worker/,
    /execute directly within scope/,
    /Give a cohesive feature and its tests one execution owner/,
    /delegation reason:/,
    /self-checking is not independent review/,
    /Inspect decisive artifacts/,
    /stop direct work and dispatching/,
    /inspect directly or have a scout check what already exists/,
    /never directly edit a store or bypass a helper refusal/,
  ]) assert.match(orchestrator.contract, pattern);
});

test('reusable skills preserve profile identity rather than forcing Sol into a leaf role', async () => {
  for (const name of ['plan', 'node-backend', 'graphql', 'react-frontend', 'scout', 'review', 'grill-plan']) {
    const text = await readFile(new URL(`../skills/${name}/SKILL.md`, import.meta.url), 'utf8');
    assert.match(text, /(?:agent profile|Your profile)/, name);
    assert.doesNotMatch(text, /^(?:Work as a leaf|Act as a leaf|You are a leaf)/m, name);
  }
  const text = await readFile(new URL('../skills/orchestrate/SKILL.md', import.meta.url), 'utf8');
  assert.match(text, /If you are a specialist, finish your assignment/);
  assert.match(text, /Do not require Scout startup for every objective/);
});

// Source-contract regressions, not a simulated transport or live model trial.
test('handoff correlation fields agree across the skill and reference', async () => {
  const { concierge, orchestrator } = await profiles();
  const handoff = (await readFile(new URL('../references/handoff.md', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const template = text => text.match(/CONCIERGE-HANDOFF\n([\s\S]*?)\n```/)[1];
  for (const field of ['objective-id', 'handoff-id', 'return']) {
    const line = text => template(text).match(new RegExp(`^${field}: .+$`, 'm'))?.[0];
    assert.ok(line(orchestrator.contract), field);
    assert.equal(line(orchestrator.contract), line(handoff), field);
  }
  assert.equal((concierge.body.match(/^objective-id:/gm) ?? []).length, 2, 'new and rollover briefs preserve identity');
  assert.match(concierge.body, /objective-id: <the original stable objective-id, unchanged>/);
  assert.match(concierge.body, /Never reuse an objective-id for independent work/);
  for (const text of [orchestrator.contract, handoff]) assert.match(text, /^objective-id: <stable ID, unchanged across rollover\/resume>/m);
});

// The external-session protocol never ran live and was retired after 0.10.0.
test('external sessions are retired and archived, not half-present', async () => {
  const all = await profiles();
  const handoff = await readFile(new URL('../references/handoff.md', import.meta.url), 'utf8');
  for (const [name, text] of [['concierge', all.concierge.body], ['orchestrator', all.orchestrator.contract], ['handoff', handoff]]) {
    assert.doesNotMatch(text, /owner binding|owner-binding|collector|return route|result collected|owner accepted|Quarantine/i, name);
    assert.doesNotMatch(text, /^- returns: /m, name);
    assert.doesNotMatch(text, /load (the )?`external-sessions`/, name);
  }
  assert.match(all.orchestrator.body, /Concierge has no route for a session whose result you cannot read with your own agent tools/);
  const archive = new URL('../docs/archive/external-sessions/', import.meta.url);
  assert.match(await readFile(new URL('external-sessions.skill.md', archive), 'utf8'), /^name: external-sessions$/m);
  assert.match(await readFile(new URL('README.md', archive), 'utf8'), /not loaded, validated or supported/);
  await assert.rejects(readFile(new URL('../skills/external-sessions/SKILL.md', import.meta.url)), /ENOENT/);
});

test('generic worker loads assigned domain skills and preserves explicit route migration', async () => {
  const all = await profiles();
  for (const name of ['enterprise-ux', 'react-frontend', 'node-backend', 'graphql']) assert.equal(all[name], undefined);
  assert.match(all.worker.body, /Explicitly load each available skill named in `skills to load`/);
  assert.match(all.worker.body, /Skills provide procedures; they do not grant tools, access or authority/);
  assert.equal(all.worker.tools, undefined);
  assert.match(all.worker.body, /planning-only or not-approved handoff does not authorize implementation/);
  assert.match(all.worker.body, /if the user did not request commit, push or a pull request, leave changes uncommitted/);
  assert.match(all.orchestrator.contract, /available custom agent named by a row still wins/);
  assert.match(all.orchestrator.contract, /add the corresponding domain skill alongside all row skills/);
  assert.match(all.orchestrator.contract, /Never rewrite the user's routing files silently/);
  assert.ok(!((await readdir(new URL('../skills/', import.meta.url))).includes('enterprise-ux')));
});

// Live SDK trials: the preloaded orchestrate skill and a domain skill were
// loaded for a one-line fix, and a third of the tool calls were list updates.
test('small work takes a fast path and delegation rules load on demand', async () => {
  const { orchestrator, worker } = await profiles();
  assert.doesNotMatch(orchestrator.header, /^skills:/m, 'orchestrate is no longer preloaded');
  for (const pattern of [
    /## Small, clear work first/,
    /Load no skill\. `orchestrate`, `plan`, `debugging` and the domain skills are for larger or unclear work/,
    /Start no worker and ask for no review, unless the change is risky or the user asked for one/,
    /Write the task list twice: once when you start and once with the result/,
    /Leave the fast path as soon as the work proves larger, riskier or less clear/,
    /Before your first `task` call in an objective, load `orchestrate`/,
    /only when it changes shape or you report/,
    /a turn that only updates the list is wasted/,
    /at those same moments, in the same turn and in one `sql` call/,
    /Run one command per shell call, exactly as the task or repository names it/,
    /never a chained, piped or multi-statement line/,
  ]) assert.match(orchestrator.body, pattern);
  // The template and routing compatibility rules are in the skill only.
  assert.doesNotMatch(orchestrator.body, /^handoff-id: </m);
  assert.doesNotMatch(orchestrator.body, /retired built-in/);
  assert.match(orchestrator.contract, /^handoff-id: </m);
  assert.match(orchestrator.contract, /## Routing tables/);
  assert.match(orchestrator.contract, /## Dispatch and retries/);
  assert.match(orchestrator.contract, /## Todo rows/);
  assert.match(worker.body, /Run one command per shell call, exactly as the handoff or repository names it/);
  assert.ok(Buffer.byteLength(orchestrator.body) < 25000, 'the always-loaded orchestrator profile stays lean');
  // A plain delegation loads the handoff and dispatch rules without the rare cases.
  assert.ok(Buffer.byteLength(orchestrator.orchestrate) < 13000, 'the orchestrate skill stays small');
  assert.doesNotMatch(orchestrator.orchestrate, /## Routing tables|## Todo rows/);
  assert.match(orchestrator.orchestrate, /load `orchestrate-reference` and follow the matching section/);
  // Live medium trials: the decided list appeared in one run of three.
  assert.match(orchestrator.body, /^decided for the user:$/m);
  assert.match(orchestrator.body, /Fill the report's `decided for the user` block in every report, never leaving it out/);
  const { concierge } = await profiles();
  assert.match(concierge.body, /always write a "Decided for you:" line/);
  assert.match(concierge.body, /"Decided for you: nothing"/);
});

// Recorded sessions: 4 of 18 dispatches sent only description and prompt and
// were rejected; none that began with agent_type failed.
test('the dispatch call is shown as ordered arguments with agent_type first', async () => {
  const { concierge } = await profiles();
  const call = concierge.body.match(/call `task` with these five arguments, written in this order:\n\n```\n([\s\S]*?)\n```/)[1];
  assert.deepEqual(call.split('\n').map(line => line.split(':')[0]), ['agent_type', 'mode', 'name', 'description', 'prompt']);
  assert.match(call, /^agent_type: "copilot-concierge:orchestrator"$/m);
  assert.match(call, /^mode: "background"$/m);
  assert.match(concierge.body, /Write `agent_type` first and `prompt` last/);
  assert.match(concierge.body, /The host rejects a call that has only `description` and `prompt`/);
});
