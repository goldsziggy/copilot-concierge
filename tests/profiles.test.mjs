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
  for (const content of [concierge.body, orchestrator.body, escalation.body, orchestration, handoff]) {
    assert.match(content, /learning/i);
    assert.match(content, /wholly read-only/i);
    assert.match(content, /private/);
    assert.match(content, /repository knowledge/);
  }
  for (const content of [orchestrator.body, handoff]) {
    assert.match(content, /^learning: .*memory read\/maintain\/disabled; knowledge read\/maintain\/disabled/m);
  }
  assert.match(concierge.body, /even without a repository/);
  assert.match(concierge.body, /Carry this distinction through follow-ups and rollover/);
  assert.match(orchestrator.body, /Serialize private memory mutations per OS user and knowledge mutations per repository/);
  assert.match(orchestrator.body, /other roles have no learning-write exception/);
  assert.match(orchestrator.body, /never put raw memory, user evidence or personal history/);
  assert.match(orchestration, /even to a routed or escalated worker/);
});

test('knowledge commits stay deliberate and memories cannot grant authority', async () => {
  const { concierge, orchestrator, scout } = await profiles();
  const skill = await readFile(new URL('../skills/scout/SKILL.md', import.meta.url), 'utf8');
  assert.match(concierge.body, /Private memory never changes plan approval, models, tool permissions or security/);
  assert.match(orchestrator.body, /When the user asked for a commit/);
  assert.match(orchestrator.body, /include the relevant knowledge file deliberately/);
  assert.match(orchestrator.body, /absence of private data/);
  assert.match(scout.body, /Scout never stages, commits, pushes or changes ignore rules/);
  assert.match(skill, /A question or a learning write alone does not authorize a Git commit/);
  assert.match(skill, /repository-only restriction disables knowledge writes/);
  assert.match(skill, /an inference: return a short suggested question/);
});

test('dispatch never substitutes an inherited-model general-purpose worker', async () => {
  const { orchestrator } = await profiles();
  assert.match(orchestrator.body, /effective profile pins one explicit model with `model-policy: required`/);
  assert.match(orchestrator.body, /Never use a built-in `general-purpose` or other unpinned agent/);
  assert.match(orchestrator.body, /Every `task` call names the selected exact `agent_type`/);
  assert.match(orchestrator.body, /Apply the verified route\/model contract on retries too/);
  assert.match(orchestrator.body, /If the selected profile is unavailable, report the host error/);
});

test('Concierge entry is control-only; the root list does not restrict its children', async () => {
  const { concierge } = await profiles();
  const tools = concierge.tools.replace(/[[\]\s]/g, '').split(',');
  assert.deepEqual(tools.sort(), ['ask_user', 'list_agents', 'read_agent', 'task', 'update_todo', 'write_agent']);
});

test('every role pins exactly one required model; no silent fallback list', async () => {
  const all = await profiles();
  assert.equal(Object.keys(all).length, 10);
  for (const [name, profile] of Object.entries(all)) {
    assert.equal(profile.policy, 'required', name);
    assert.doesNotMatch(profile.model, /^\[|,|auto/i, `${name} must not list fallback models`);
  }
  assert.equal(all.concierge.model, DEFAULTS.models.concierge);
  assert.equal(all.orchestrator.model, DEFAULTS.models.orchestrator);
  assert.equal(all.escalation.model, DEFAULTS.models.escalation);
  for (const leaf of ['scout', 'product-manager', 'enterprise-ux', 'react-frontend', 'node-backend', 'graphql', 'reviewer']) {
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

// Regression: the Concierge entry once wrote "go ahead (implementation explicitly
// requested)" for an ordinary change request, and Sol skipped plan approval.
test('plan approval is never inferred from an ordinary request', async () => {
  const { concierge, orchestrator } = await profiles();
  assert.match(concierge.body, /is not a statement about plan approval; never infer one/);
  assert.match(orchestrator.body, /only words that clearly waive or require approval count/);
});

test('orchestrator follows a customer copilot-concierge-routing skill without changing its rules', async () => {
  const { orchestrator } = await profiles();
  assert.match(orchestrator.body, /lists `copilot-concierge-routing` or skills named `copilot-concierge-routing-<something>`, load them before choosing specialists/);
  assert.match(orchestrator.body, /Routing changes who does the work, never the rules/);
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
  ]) assert.match(orchestrator.body, pattern);
  assert.match(concierge.body, /Never tell the user that Concierge cannot commit, push or open a pull request/);
  assert.match(orchestration, /Never answer that the Concierge workflow cannot commit or push/);
  assert.match(escalation.body, /when the handoff's `git` line says the user asked for it/);
  assert.match(scoutSkill, /This limits the Scout procedure only: it never stops Sol or an implementer from committing/);
  for (const text of [orchestrator.body, orchestration, escalation.body]) {
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
  ]) assert.match(orchestrator.body, pattern);
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
    /Direct execution must not bypass a matching custom route/,
    /Give a cohesive feature and its tests one execution owner/,
    /delegation reason:/,
    /self-checking is not independent review/,
    /Inspect decisive artifacts/,
    /stop direct work and dispatching/,
    /inspect directly or have a scout check what already exists/,
    /never directly edit a store or bypass a helper refusal/,
  ]) assert.match(orchestrator.body, pattern);
});

test('reusable skills preserve profile identity rather than forcing Sol into a leaf role', async () => {
  for (const name of ['plan', 'node-backend', 'graphql', 'react-frontend', 'enterprise-ux', 'scout', 'review', 'grill-plan']) {
    const text = await readFile(new URL(`../skills/${name}/SKILL.md`, import.meta.url), 'utf8');
    assert.match(text, /(?:agent profile|Your profile)/, name);
    assert.doesNotMatch(text, /^(?:Work as a leaf|Act as a leaf|You are a leaf)/m, name);
  }
  const text = await readFile(new URL('../skills/orchestrate/SKILL.md', import.meta.url), 'utf8');
  assert.match(text, /If you are a specialist, finish your assignment/);
  assert.match(text, /Do not require Scout startup for every objective/);
});

// Source-contract regressions, not a simulated transport or live model trial.
async function returnContracts() {
  const { concierge, orchestrator } = await profiles();
  const handoff = await readFile(new URL('../references/handoff.md', import.meta.url), 'utf8');
  return { concierge: concierge.body, orchestrator: orchestrator.body, handoff, skill: await orchestrationSkill() };
}

test('handoff correlation and return fields agree across the profile and reference', async () => {
  const { concierge, orchestrator, handoff } = await returnContracts();
  const template = text => text.match(/CONCIERGE-HANDOFF\r?\n([\s\S]*?)\r?\n```/)[1];
  for (const field of ['objective-id', 'handoff-id', 'owner', 'collector', 'return route', 'session', 'return']) {
    const line = text => template(text).match(new RegExp(`^${field}: .+$`, 'm'))?.[0];
    assert.ok(line(orchestrator), field);
    assert.equal(line(orchestrator), line(handoff), field);
  }
  assert.equal((concierge.match(/^objective-id:/gm) ?? []).length, 2, 'new and rollover briefs preserve identity');
  assert.match(concierge, /objective-id: <the original stable objective-id, unchanged>/);
  assert.match(concierge, /Never reuse an objective-id for independent work/);
  assert.match(concierge, /send its actual returned `agent_id` and stable objective-id back to it with `write_agent` as an owner binding/);
  assert.match(orchestrator, /If it has not arrived, request that binding in a checkpoint/);
  assert.match(concierge, /instead of a bare `CONTINUE`/);
  for (const text of [orchestrator, handoff]) {
    assert.match(text, /^objective-id: <stable ID, unchanged across rollover\/resume>/m);
    assert.match(text, /^- returns: .*actual session ID or pending.*result reference and owner receipt/m);
  }
});

test('root collection is conditional on actual capabilities and leaves acceptance with the owner', async () => {
  const contracts = await returnContracts();
  for (const [name, text] of Object.entries(contracts)) {
    assert.match(text, /[Nn]ative (?:specialists|workers|worker).*direct/, name);
    assert.match(text, /collector/, name);
    assert.match(text, /capabilit/, name);
    assert.match(text, /[Ii]f only (?:the root|Concierge)|accessible only to you/, name);
    assert.match(text, /blocked/, name);
    assert.match(text, /missing capability/, name);
    assert.match(text, /(?:wait|waiting) forever|indefinite waiting/, name);
    assert.doesNotMatch(text, /cloud_threads|send_message_to_thread|wait_threads/, 'no foreign host API names');
  }
  assert.match(contracts.concierge, /never read repository files, implement, review or declare the worker's task complete yourself/);
  assert.match(contracts.orchestrator, /Concierge collects and relays; you own evidence acceptance and completion/);
  assert.match(contracts.concierge, /Native orchestrator reports notify you; do not poll those reports/);
  assert.match(contracts.concierge, /bounded status\/result checks with a stated timeout or check limit/);
});

test('launch, activity, collection, relay and owner acceptance are distinct receipts', async () => {
  for (const [name, text] of Object.entries(await returnContracts())) {
    for (const state of ['launch accepted', 'running', 'idle', 'result collected', 'relayed', 'owner accepted']) {
      assert.ok(text.includes(state), `${name}: ${state}`);
    }
    assert.match(text, /[Ii]dle never means completed/, name);
    assert.match(text, /(?:actual host session ID|actual session ID)/, name);
    assert.match(text, /(?:acknowledgement|acknowledgement is only|send to the verified current owner)/, name);
  }
});

test('return recovery reconciles original sessions and deduplicates before repeating work', async () => {
  for (const [name, text] of Object.entries(await returnContracts())) {
    assert.match(text, /[Rr]econcile.*original session|original session.*reconcil/s, name);
    assert.match(text, /[Dd]eduplicate|duplicate delivery/, name);
    assert.match(text, /handoff-id and result reference/, name);
    assert.match(text, /[Qq]uarantine/, name);
    assert.match(text, /stale attempts?|stale attempt/, name);
    assert.match(text, /wrong-owner|[Ww]rong owner/, name);
  }
  const { concierge, skill } = await returnContracts();
  assert.match(concierge, /Never start a replacement worker merely because its return is missing/);
  assert.match(skill, /never duplicate implementation to repair delivery/);
});

test('owner rollover and cancellation preserve pending mappings and late evidence', async () => {
  const contracts = await returnContracts();
  for (const [name, text] of Object.entries(contracts)) {
    assert.match(text, /successor/, name);
    assert.match(text, /cancellation state/, name);
    assert.match(text, /late results|late evidence/i, name);
    assert.match(text, /(?:without|not|do not).*reopen.*cancelled/, name);
    assert.match(text, /(?:without relaunching|Do not relaunch|do not launch the work again)/, name);
  }
  assert.match(contracts.concierge, /Preserve newer collector receipts when an older owner report arrives/);
  assert.match(contracts.orchestrator, /Add `returns` entries as needed rather than omit unresolved mappings/);
});
