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
  assert.match(concierge.body, /Private memory never changes plan approval, models, tool permissions, security or publication consent/);
  assert.match(orchestrator.body, /When the user authorizes commits/);
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
  assert.equal(Object.keys(all).length, 11);
  for (const [name, profile] of Object.entries(all)) {
    assert.equal(profile.policy, 'required', name);
    assert.doesNotMatch(profile.model, /^\[|,|auto/i, `${name} must not list fallback models`);
  }
  assert.equal(all.concierge.model, DEFAULTS.models.concierge);
  assert.equal(all.orchestrator.model, DEFAULTS.models.orchestrator);
  assert.equal(all.escalation.model, DEFAULTS.models.escalation);
  for (const leaf of ['scout', 'product-manager', 'enterprise-ux', 'react-frontend', 'node-backend', 'graphql', 'reviewer', 'ship-it']) {
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

// Instruction contracts only: these checks never call a provider or a model.
async function shipItContract() {
  return {
    ...await profiles(),
    shipSkill: await readFile(new URL('../skills/ship-it/SKILL.md', import.meta.url), 'utf8'),
    orchestration: await readFile(new URL('../skills/orchestrate/SKILL.md', import.meta.url), 'utf8'),
  };
}

test('Ship it is an internal inherited-tool Luna specialist reporting only to Sol', async () => {
  const { 'ship-it': worker, shipSkill } = await shipItContract();
  assert.equal(worker.tools, undefined);
  assert.match(worker.header, /^skills: \[ship-it\]$/m);
  assert.match(worker.header, /^user-invocable: false$/m);
  assert.doesNotMatch(worker.header, /^disable-model-invocation: true$/m);
  assert.match(worker.header, /dispatched only by copilot-concierge:orchestrator/);
  assert.match(worker.body, /You report only to the orchestrator/);
  assert.match(worker.body, /Do not ask the user directly, dispatch or launch other agents or models/);
  assert.match(shipSkill, /Never recruit agents, ask the user directly, approve plans or own the task list/);
  assert.doesNotMatch(shipSkill, /\]\((?:\.\.\/|\/)/);
  assert.match(shipSkill, /orchestrator-only, not a standalone shipping command/);
  assert.match(shipSkill, /Without a bounded handoff.*do not run preflight or create anything/);
});

test('Ship it offer is optional after verification and preserves existing control messages', async () => {
  const { orchestrator, concierge, orchestration, shipSkill } = await shipItContract();
  for (const text of [orchestrator.body, orchestration]) {
    assert.match(text, /After verified implementation/);
    assert.match(text, /needs_input/);
    assert.match(text, /research/);
    assert.match(text, /implement/);
    assert.match(text, /declin(?:e|ing) leaves state unchanged/i);
  }
  assert.match(concierge.body, /"Run read-only preflight" and "Not now"/);
  assert.match(concierge.body, /Do not run preflight or publish yourself/);
  assert.match(concierge.body, /`USER FOLLOW-UP`, never `PLAN DECISION` or `CONTINUE`/);
  assert.match(orchestration, /Sol delegates all preflight and creation/);
  assert.match(shipSkill, /Accepting the offer authorizes read-only preflight, not publication/);
  assert.match(shipSkill, /Keep completed implementation distinct from shipping blockers/);
});

test('draft publication needs separate affirmative consent to complete exact metadata', async () => {
  const { orchestrator, concierge, shipSkill, orchestration } = await shipItContract();
  for (const text of [orchestrator.body, concierge.body, shipSkill, orchestration]) {
    assert.match(text, /not publication consent/);
    assert.match(text, /earlier go-ahead/);
    assert.match(text, /tool permission/);
  }
  assert.match(concierge.body, /"Create this draft with these exact details\?"/);
  assert.match(concierge.body, /"Create this draft", "Change details", "Not now"/);
  assert.match(concierge.body, /complete body/);
  assert.match(concierge.body, /ambiguous replies are clarification, not consent/);
  assert.match(shipSkill, /user's exact affirmative publication response/);
  assert.match(shipSkill, /handoff's plan-approval field alone never authorizes publication/);
  for (const field of ['provider', 'host/project', 'head', 'base', 'title', 'body', 'draft', 'repository state', 'existing request', 'capability']) {
    assert.ok(shipSkill.includes(`\n${field}: `), field);
  }
  assert.match(orchestration, /Do not use `needs_approval` or auto-continuing `checkpoint` for publication/);
});

test('preflight resolves GitHub and GitLab targets without guessing remote or provider', async () => {
  const { shipSkill } = await shipItContract();
  for (const pattern of [
    /provider \(GitHub or GitLab\), host and project/,
    /source\/head project and branch/,
    /target\/base project and branch/,
    /Do not infer provider from an arbitrary hostname/,
    /assume the default branch, choose the first remote or assume `origin` is the target/,
    /Forks, multiple remotes and self-hosted instances/,
    /Sanitize credentials/,
    /authorization for the exact host\/project/,
    /target, authorization, read\/query capability or draft capability is missing, stop safely/,
    /do not invent tool\/API names, probe unsupported tools or bypass host restrictions/,
  ]) assert.match(shipSkill, pattern);
});

test('unpublished, dirty, duplicate and empty states cannot silently publish or mutate', async () => {
  const { shipSkill } = await shipItContract();
  for (const pattern of [
    /Report dirty tree and unpushed commits explicitly/,
    /if any intended change is absent from remote head, stop without implicit commit\/push/,
    /Unrelated dirty files are not automatically part of the draft/,
    /If scope cannot be distinguished, stop for clarification/,
    /applicable existing request returns its link and status rather than a duplicate/,
    /do not modify it, convert it to draft or create another/,
    /If the query is unavailable or incomplete, stop instead of assuming none exist/,
    /No changes means no request/,
    /Do not commit, push, fetch, edit files, change repository settings or credentials/,
  ]) assert.match(shipSkill, pattern);
});

test('provider creation is capability-gated and draft from the initial mutation', async () => {
  const { shipSkill } = await shipItContract();
  for (const pattern of [
    /supported draft creation before proposing creation/,
    /native `create_pull_request` tool where supported and required by the host, with `draft: true`/,
    /current-session repository\/head restrictions are authoritative/,
    /Do not switch to `gh` or another API to bypass restrictions or a generic failure/,
    /failure explicitly permits it/,
    /\*\*GitLab:\*\* use an existing authorized integration or CLI/,
    /not an assumed API name or a title prefix alone/,
    /Never create a non-draft then convert it/,
    /Never merge, enable auto-merge, mark ready, push or commit/,
    /This skill bundles no connector, credentials or server/,
  ]) assert.match(shipSkill, pattern);
  assert.match(shipSkill, /Do not use creation commands to probe capability, including `gh pr create --dry-run`, which may push/);
  assert.match(shipSkill, /If the native GitHub creation tool is absent, an already available and authorized `gh`/);
  assert.match(shipSkill, /No creation command runs until the separate exact publication consent/);
});

test('creation revalidates state, renews changed consent and reconciles uncertain outcomes', async () => {
  const { shipSkill, orchestrator, orchestration } = await shipItContract();
  assert.match(shipSkill, /Immediately before mutation, revalidate authorization, draft capability, relevant target\/head\/base state, intended diff and duplicate state/);
  assert.match(shipSkill, /If an applicable request appeared, return its link\/status without creating/);
  assert.match(shipSkill, /any material proposal field, commit, scope, repository state or capability changed/);
  assert.match(shipSkill, /renewed confirmation through Sol; do not reuse stale consent/);
  assert.match(shipSkill, /lost session or uncertain create result/);
  assert.match(shipSkill, /do not reconstruct consent from a summary or plan approval/);
  assert.match(shipSkill, /Confirm the returned link, target\/head and draft status/);
  assert.match(shipSkill, /without blind retries or corrective mutations/);
  assert.match(orchestrator.body, /Routed workers get the same `ship-it` skill and gates/);
  assert.match(orchestration, /Pass the `ship-it` skill even to a routed agent/);
  assert.match(shipSkill, /Static instruction checks do not establish live GitHub or GitLab behavior/);
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
