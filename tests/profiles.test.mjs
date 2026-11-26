import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DEFAULTS } from '../scripts/lib/config.mjs';
import { CONCIERGE_SKILLS } from '../scripts/check-custom.mjs';

// The agent profiles and skills are the implementation. These are source-contract
// regressions: they never call a model, a provider or a Git remote, and do not
// show that a live model follows the instructions.
const agents = fileURLToPath(new URL('../com.github.copilot/agents/', import.meta.url));
const read = async file => (await readFile(new URL(`../${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const skill = name => read(`skills/${name}/SKILL.md`);
const FRONT_SKILLS = ['brief', 'relay'];

async function profiles() {
  const result = {};
  for (const file of await readdir(agents)) {
    if (!file.endsWith('.agent.md')) continue;
    const text = (await readFile(path.join(agents, file), 'utf8')).replace(/\r\n/g, '\n');
    const header = text.match(/^---\n([\s\S]*?)\n---\n/)[1];
    const value = key => header.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1];
    result[value('name')] = { file, model: value('model'), policy: value('model-policy'), tools: value('tools'), header, body: text.slice(header.length) };
  }
  return result;
}

// The skills a profile's "| When | Load |" table names in its second column.
const tableSkills = body => [...body.matchAll(/^\| [^|\n]+ \| ((?:`[a-z-]+`(?:, )?)+) \|$/gm)]
  .flatMap(row => [...row[1].matchAll(/`([a-z-]+)`/g)].map(match => match[1]));

// Field names of a fenced message template, in order.
const fields = (text, marker) => text.match(new RegExp(`${marker}\\n([\\s\\S]*?)\\n\`\`\``))[1]
  .split('\n').map(line => line.match(/^([a-z][a-z -]*(?: \(verbatim\))?):/)?.[1]).filter(Boolean);

test('Concierge ships exactly two agents: a front entry agent and a worker behind it', async () => {
  const all = await profiles();
  assert.deepEqual(Object.keys(all).sort(), ['concierge', 'worker']);
  assert.equal(all.concierge.file, 'concierge.agent.md');
  assert.equal(all.worker.file, 'worker.agent.md');
  assert.match(all.concierge.header, /^user-invocable: true$/m);
  assert.match(all.worker.header, /^user-invocable: false$/m);
  assert.match(all.worker.header, /started only by copilot-concierge:concierge/);
});

test('every role has one preferred model without required policy', async () => {
  const all = await profiles();
  assert.deepEqual(Object.keys(DEFAULTS.models).sort(), Object.keys(all).sort());
  for (const [name, profile] of Object.entries(all)) {
    assert.equal(profile.policy, undefined, name);
    assert.doesNotMatch(profile.model, /^\[|,/, `${name} must not list fallback models`);
    assert.equal(profile.model, DEFAULTS.models[name], name);
  }
  // Copilot Fusion routes only the session's own agent (live SDK trials B and C
  // on earlier releases), so only the entry agent may follow it.
  assert.equal(all.concierge.model, 'auto');
  assert.doesNotMatch(all.worker.model, /auto|fusion/i);
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

// Regression: in Copilot CLI 1.0.93 a nested agent receives only tools that its
// parent agent also has, so a worker with a narrowed list would starve its sub-agents.
test('the entry agent is control-only plus skills; the worker does not narrow its tools', async () => {
  const { concierge, worker } = await profiles();
  const tools = concierge.tools.replace(/[[\]\s]/g, '').split(',');
  assert.deepEqual(tools.sort(), ['ask_user', 'list_agents', 'read_agent', 'skill', 'task', 'update_todo', 'write_agent']);
  assert.match(concierge.header, /^include-custom-instructions: false$/m);
  assert.equal(worker.tools, undefined);
  assert.match(worker.header, /^include-custom-instructions: true$/m);
  assert.doesNotMatch(worker.header, /^skills:/m, 'worker skills load on demand, none preloaded');
  assert.doesNotMatch(concierge.header, /^skills:/m, 'entry skills load on demand, none preloaded');
});

test('both profiles stay thin and are driven by skills that exist', async () => {
  const { concierge, worker } = await profiles();
  const shipped = (await readdir(new URL('../skills/', import.meta.url))).sort();
  assert.ok(Buffer.byteLength(concierge.body) < 5000, 'the always-loaded entry profile stays thin');
  assert.ok(Buffer.byteLength(worker.body) < 16000, 'the always-loaded worker profile stays lean');
  assert.deepEqual(tableSkills(concierge.body).sort(), FRONT_SKILLS);
  const back = [...new Set(tableSkills(worker.body))].sort();
  // Every shipped skill is reachable from exactly one profile's table.
  assert.deepEqual([...FRONT_SKILLS, ...back].sort(), shipped);
  assert.deepEqual([...CONCIERGE_SKILLS].sort(), shipped, 'reserved names match the shipped skills');
  for (const name of FRONT_SKILLS) assert.ok(!back.includes(name), `${name} belongs to the entry agent only`);
  assert.match(concierge.body, /Load no other skill; the worker loads what the work needs/);
  assert.match(concierge.body, /do not dispatch from memory/);
  assert.match(worker.body, /Load a skill when its row applies, and only then/);
  assert.match(worker.body, /A skill supplies a procedure, not a different identity or permission/);
});

test('skills are self-contained procedures that say whose they are', async () => {
  for (const name of FRONT_SKILLS) {
    const text = await skill(name);
    assert.match(text, /^description: Concierge entry agent only\./m, name);
    assert.match(text, /This procedure belongs to the Concierge entry agent/, name);
  }
  for (const name of CONCIERGE_SKILLS) {
    const text = await skill(name);
    assert.doesNotMatch(text, /\]\((?:\.\.\/|\/)/, `${name} stays self-contained`);
    assert.doesNotMatch(text, /^(?:Work as a leaf|Act as a leaf|You are a leaf)/m, name);
    if (!FRONT_SKILLS.includes(name) && !name.startsWith('orchestrate')) assert.match(text, /(?:agent profile|Your profile)/, name);
  }
  for (const name of ['orchestrate', 'orchestrate-reference']) assert.match(await skill(name), /Concierge worker/, name);
  assert.match(await skill('orchestrate'), /If you are a sub-agent, finish your assignment/);
});

test('the entry agent answers simple questions itself and hands everything else over', async () => {
  const { concierge } = await profiles();
  const section = concierge.body.match(/## Answer or hand over\n([\s\S]*?)\n## Always/)[1];
  for (const pattern of [
    /Answer it yourself, briefly, when you can do so correctly from this conversation and general knowledge alone/,
    /greetings, thanks and small talk/,
    /what Concierge is, what it can do and how to phrase a request/,
    /a general question about a concept, command or practice that does not depend on the user's project/,
    /progress or results so far, from the latest report and task list you already hold/,
    /Hand over everything else with `brief`/,
    /anything that needs a file, repository, ticket, link or command/,
    /every request to remember, correct or forget something/,
    /Never guess about the user's project; when unsure, hand it over/,
    /Do not screen, refuse or demand more detail/,
    /A direct answer starts no objective and writes no to-do item/,
  ]) assert.match(section, pattern);
  assert.match(concierge.body, /You never do the work: no reading of repositories, files or tickets, no planning, coding or reviewing/);
  // The entry agent has no tool that could read the project to back a guess.
  assert.doesNotMatch(concierge.tools, /\b(view|rg|grep|glob|bash|powershell|edit|create|web_fetch|sql)\b/);
});

// Recorded sessions on 0.11.0: 4 of 18 dispatches sent only description and
// prompt and were rejected; none that began with agent_type failed.
test('the dispatch call is shown as ordered arguments with agent_type first', async () => {
  const brief = await skill('brief');
  const call = brief.match(/call `task` with these five arguments, written in this order:\n\n```\n([\s\S]*?)\n```/)[1];
  assert.deepEqual(call.split('\n').map(line => line.split(':')[0]), ['agent_type', 'mode', 'name', 'description', 'prompt']);
  assert.match(call, /^agent_type: "copilot-concierge:worker"$/m);
  assert.match(call, /^mode: "background"$/m);
  assert.match(brief, /Write `agent_type` first and `prompt` last/);
  assert.match(brief, /The host rejects a call that has only `description` and `prompt`/);
});

test('the brief, handoff and report templates agree with the handoff reference', async () => {
  const { worker } = await profiles();
  const handoff = await read('references/handoff.md');
  const brief = await skill('brief');
  const orchestrate = await skill('orchestrate');
  const briefFields = fields(brief, 'CONCIERGE-BRIEF');
  assert.deepEqual(briefFields, ['objective', 'objective-id', 'user request (verbatim)', 'understanding', 'acceptance criteria', 'references',
    'plan approval stated by user', 'autonomy stated by user', 'file-write restrictions stated by user', 'earlier context', 'progress']);
  assert.deepEqual(fields(handoff, 'CONCIERGE-BRIEF'), briefFields);
  const handoffFields = fields(orchestrate, 'CONCIERGE-HANDOFF');
  assert.deepEqual([...handoffFields].sort(), [...fields(handoff, 'CONCIERGE-HANDOFF')].sort());
  for (const field of ['objective-id', 'handoff-id', 'delegation reason', 'learning', 'git', 'rules', 'return']) {
    assert.ok(handoffFields.includes(field), field);
    const line = text => text.match(/CONCIERGE-HANDOFF\n([\s\S]*?)\n```/)[1].match(new RegExp(`^${field}: .+$`, 'm'))[0];
    if (['objective-id', 'handoff-id', 'rules', 'return', 'learning'].includes(field)) assert.equal(line(orchestrate), line(handoff), field);
  }
  const reportFields = fields(worker.body, 'CONCIERGE-REPORT');
  assert.deepEqual(reportFields, ['status', 'objective', 'objective-id', 'plan approval', 'autonomy', 'decided for the user', 'tasks', 'progress', 'suggestions', 'message']);
  assert.deepEqual(fields(handoff, 'CONCIERGE-REPORT'), reportFields);
  for (const text of [worker.body, handoff]) {
    assert.match(text, /^status: needs_input \| needs_approval \| checkpoint \| done \| blocked \| cancelled$/m);
    assert.match(text, /^objective-id: <stable ID, unchanged across rollover\/resume>$/m);
  }
  // The template is in the skill only; the profile points at it.
  assert.doesNotMatch(worker.body, /^handoff-id: </m);
  assert.match(worker.body, /Before your first `task` call in an objective, load `orchestrate`/);
});

test('progress is one JSON object that carries the objective across calls, rollover and resume', async () => {
  const { concierge, worker } = await profiles();
  const handoff = await read('references/handoff.md');
  const brief = await skill('brief');
  const relay = await skill('relay');
  const template = JSON.parse(worker.body.match(/```json\n(\{"request"[\s\S]*?)\n```/)[1]);
  const keys = ['request', 'follow_ups', 'decisions', 'outcome', 'playbook', 'repo_summary', 'tasks', 'facts', 'error_signatures', 'done', 'open', 'uncommitted', 'counts', 'depth_limited'];
  assert.deepEqual(Object.keys(template), keys);
  for (const key of keys) assert.ok(handoff.includes(`\`${key}\``), `handoff reference documents ${key}`);
  assert.deepEqual(Object.keys(template.repo_summary), ['stack', 'test_commands', 'build_commands', 'conventions']);
  assert.deepEqual(Object.keys(template.counts), ['settled', 'assumptions', 'subagents']);
  for (const pattern of [
    /You keep no notes file/,
    /one JSON object in every report/,
    /about 4,000 characters at most/,
    /Never put secrets, tokens or environment values in it/,
    /`progress` is your memory of earlier work \(`ROLLOVER`, `RESUMED`\)/,
    /do not redo what it lists as done, and check it against the working tree before continuing/,
    /After `RESUMED`, inspect what already exists before repeating any change/,
  ]) assert.match(worker.body, pattern);
  for (const pattern of [
    /Keep the latest one for each objective and pass it on unchanged\. Never edit, summarise or show it/,
    /has reported `done` or `blocked`, has reached 10 turns/,
    /Never roll over for answers, approvals or `CONTINUE`/,
    /`ROLLOVER from <old name>: continue from the progress and do not repeat finished work\.`/,
    /`progress`: the old worker's latest progress object, copied verbatim/,
    /keep the original objective-id/,
    /`RESUMED from <old name>: check what already exists before repeating any change\.`/,
    /Never start a second worker for an objective because the first one is blocked/,
  ]) assert.match(brief, pattern);
  assert.match(relay, /Keep the `progress` object for follow-ups, rollover and resume; never show it to the user/);
  // The discovery skill's summary has the shape progress stores.
  const summary = JSON.parse((await skill('discovery')).match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepEqual(Object.keys(summary), Object.keys(template.repo_summary));
  // The retired handover block is not half-present.
  for (const text of [concierge.body, worker.body, brief, relay, handoff]) assert.doesNotMatch(text, /^handover:|handover block/m);
});

test('the entry agent tracks several workers and never treats a continuation as new work', async () => {
  const { concierge } = await profiles();
  const brief = await skill('brief');
  const relay = await skill('relay');
  assert.match(concierge.body, /One worker per independent objective/);
  assert.match(brief, /several can work at the same time/);
  assert.match(brief, /`list_agents` with `scope: "children"`/);
  assert.match(brief, /`write_agent` to that worker with `USER FOLLOW-UP: <exact words>`, even while it is still working/);
  assert.match(brief, /Never treat a continuation as new work/);
  assert.match(brief, /Never reuse an objective-id for independent work/);
  assert.match(relay, /so one report never erases another objective's items/);
  assert.match(relay, /Match the report to its objective-id before changing anything/);
});

test('a brief quotes the user, marks inferences and authorizes only ordinary scoped work', async () => {
  const brief = await skill('brief');
  for (const pattern of [
    /Your job here is prompting/,
    /Quote, do not paraphrase, in `user request`/,
    /mark the ones you inferred as assumptions/,
    /request to make a change authorizes the ordinary work/,
    /it does not authorize unrelated consequential actions/,
    /Ask the user first only when the answer materially changes the outcome and cannot reasonably be inferred/,
    /Never put secrets, tokens or environment values in a brief/,
  ]) assert.match(brief, pattern);
});

test('small work takes a fast path and procedures load on demand', async () => {
  const { worker } = await profiles();
  for (const pattern of [
    /## Small, clear work first/,
    /Load no skill, apart from a saved workflow or routing skill whose description covers this work/,
    /Start no sub-agent and ask for no review, unless the change is risky or the user asked for one/,
    /Write the task list twice: once when you start and once with the result/,
    /Leave the fast path as soon as the work proves larger, riskier or less clear/,
    /only when it changes shape or you report/,
    /a turn that only updates the list is wasted/,
    /at those same moments, in the same turn and in one `sql` call/,
    /Run one command per shell call, exactly as the task or repository names it/,
    /never a chained, piped or multi-statement line/,
    /Try a denied action once more in its plain form and never the same call twice/,
  ]) assert.match(worker.body, pattern);
  const orchestrate = await skill('orchestrate');
  assert.ok(Buffer.byteLength(orchestrate) < 13000, 'the orchestrate skill stays small');
  assert.doesNotMatch(orchestrate, /## Routing tables|## Todo rows/);
  for (const name of ['discovery', 'development', 'test']) assert.ok(Buffer.byteLength(await skill(name)) < 4000, `${name} stays small`);
});

test('the worker works directly and starts a sub-agent only for a stated boundary', async () => {
  const { worker } = await profiles();
  const orchestrate = await skill('orchestrate');
  for (const pattern of [
    /may investigate, plan, implement and verify directly within the approved scope/,
    /You do the work yourself by default/,
    /Self-checking is not independent review/,
    /Never start `copilot-concierge:worker` or `copilot-concierge:concierge`/,
    /do not mark a task done merely because it finished/,
    /If the `task` tool is unavailable, do all the work yourself and set `depth_limited` in progress/,
    /Follow applicable repository instructions/,
  ]) assert.match(worker.body, pattern);
  assert.doesNotMatch(worker.body, /Delegate everything substantive|Never do the work yourself|The only tools you call/);
  for (const pattern of [
    /Tracking a task does not require a sub-agent/,
    /Two or more pieces are independent and touch disjoint files/,
    /Hand off at a task boundary, never mid-edit/,
    /Give a cohesive feature and its tests one owner/,
    /Concierge ships no specialist agents/,
    /No more than three sub-agents at once/,
    /say plainly that the review was not independent/,
    /A planning-only or not-approved handoff does not authorize implementation/,
    /A reviewer stays read-only/,
    /retry once with a fresh handoff-id/,
    /reconcile any uncertain effects/,
    /Do not replay uncertain effects/,
    /Inspect decisive artifacts/,
    /otherwise judge it with `escalate`/,
    /Concierge has no route for a session whose result you cannot read with your own agent tools/,
    /stop direct work and dispatching, send `STOP` to running sub-agents/,
  ]) assert.match(orchestrate, pattern);
});

test('blockers are typed and settled through the escalate checklist, never guessed past', async () => {
  const { worker } = await profiles();
  const escalate = await skill('escalate');
  const handoff = await read('references/handoff.md');
  const kinds = [...worker.body.match(/## Blockers\n([\s\S]*?)\n## Shell commands/)[1].matchAll(/^\| `([a-z_]+)` \|/gm)].map(match => match[1]);
  assert.deepEqual(kinds, ['question', 'permission', 'repeated_failure', 'missing_dependency', 'ambiguity', 'stall']);
  for (const kind of kinds) assert.ok(handoff.includes(`\`${kind}\``), `handoff reference names ${kind}`);
  assert.match(worker.body, /You never guess past a blocker/);
  assert.match(worker.body, /Do not raise a blocker for something you can find out by reading the repository, the brief or a log/);
  const outcomes = [...escalate.match(/## The checklist\n([\s\S]*?)\n## Rules/)[1].matchAll(/^\| (\d) \| .+ \| `([a-z_]+)`/gm)].map(match => match[2]);
  assert.deepEqual(outcomes, ['answer', 'retry_with_hint', 'mock_and_continue', 'use_ci', 'assume_and_flag', 'ask', 'abort']);
  for (const pattern of [
    /Stop at the first step that settles it/,
    /Re-read every source you cite/,
    /Inference alone never settles an `ambiguity` or `permission` blocker/,
    /Never `assume_and_flag` for permission, security, authentication, data migrations, a public API/,
    /A mock's boundary must sit outside the unit under change/,
    /Never allow deleting a test, adding a skip or changing an expected value unless the request says the behavior changed/,
    /Your own first preference is one option to check, never the default/,
    /At most ten assumptions per objective; the next is `ask`/,
    /At most two outcomes other than `ask` per fingerprint/,
    /\| `ask` \| Report `needs_input` with the question \| Report `blocked` once/,
    /\| `assume_and_flag` \| Not used \|/,
    /Park only the tasks that depend on the answer/,
  ]) assert.match(escalate, pattern);
  const test_ = await skill('test');
  assert.match(test_, /The same signature twice in a row on the same step is a `repeated_failure` blocker/);
  assert.match(test_, /Report a step as passed without having run it in this objective/);
  assert.match(test_, /Take every command from `progress\.repo_summary`; never guess one/);
  assert.match(await skill('development'), /Do not guess past a blocker/);
});

test('ordinary scoped work proceeds by default while explicit approval remains available', async () => {
  const { worker } = await profiles();
  assert.match(worker.body, /then the default `auto`/);
  assert.match(worker.body, /With `ask`, report `needs_approval` and wait/);
  assert.match(worker.body, /Question-only and planning-only requests stop before implementation/);
});

test('plain installs honor environment autonomy before file defaults in both directions', async () => {
  const { worker } = await profiles();
  const settings = worker.body.match(/## Settings\n([\s\S]*?)\n## Blockers/)[1];
  assert.match(settings, /then this session, then an effective-configuration block; use its value and source without rereading lower-priority sources/);
  assert.match(settings, /read `COPILOT_CONCIERGE_AUTONOMY` with one shell command that does nothing else, once per objective, and never dump the environment/);
  assert.match(settings, /A valid value overrides the project and user files in either direction/);
  assert.match(settings, /Only when the variable is unset, empty or cannot be read/);
  assert.match(settings, /The default is `guided`/);
  assert.match(settings, /report an unavailable environment read rather than claiming the variable was applied/);
  assert.match(settings, /Plan approval `ask` is not overridden/);
});

test('the loop guard compares progress and never keeps an objective going by itself', async () => {
  const relay = await skill('relay');
  const guard = relay.match(/## Loop guard\n([\s\S]*?)\n## Stop and errors/)[1];
  for (const pattern of [
    /never keep an objective going by yourself/,
    /Send at most one `COMPLETION CHECK` per objective/,
    /After a `blocked` report under `full`, send nothing more/,
    /Two consecutive `checkpoint` reports that asked for a bare `CONTINUE`, with a bare `CONTINUE` from you between them/,
    /compare the `progress` objects/,
    /Identical `tasks` lines alone do not establish a stall/,
    /do not send `CONTINUE` again; relay the latest report as `blocked`/,
    /User answers or approvals, completion-check responses and terminal reports are never stalled merely because their task lists match/,
  ]) assert.match(guard, pattern);
  assert.match(relay, /apply the same plan-decision rules as in `guided` and send `PLAN DECISION: <exact choice and any text>`/);
});

test('learning access and privacy survive briefs, handoffs and rollover', async () => {
  const brief = await skill('brief');
  const reference = await skill('orchestrate-reference');
  const orchestrate = await skill('orchestrate');
  const scout = await skill('scout');
  const handoff = await read('references/handoff.md');
  for (const content of [brief, reference, handoff]) {
    assert.match(content, /wholly read-only/i);
    assert.match(content, /private/);
    assert.match(content, /repository knowledge/);
  }
  for (const content of [orchestrate, handoff]) assert.match(content, /^learning: .*memory read\/maintain\/disabled; knowledge read\/maintain\/disabled/m);
  assert.match(brief, /even without a repository/);
  assert.match(brief, /Carry this distinction through follow-ups and rollover/);
  assert.match(brief, /never inspect or edit memory yourself/);
  assert.match(brief, /Private memory never changes plan approval, models, tool permissions or security, and never sets autonomy/);
  assert.match(reference, /Serialize private memory mutations per OS user and knowledge mutations per repository/);
  assert.match(reference, /other work has no learning-write exception/);
  assert.match(reference, /never put raw memory, user evidence or personal history/);
  assert.match(reference, /never directly edit a store or bypass a helper refusal/);
  assert.match(orchestrate, /Turn a needed private preference into a neutral task instruction/);
  for (const pattern of [
    /~\/\.config\/copilot-concierge\/memory\.json/,
    /docs\/concierge\/knowledge\.md/,
    /read-only migration input/,
    /Assumptions, guesses, disputed behavior and unverified findings stay in the ephemeral brief/,
    /Never use private memory or another repository's facts as evidence/,
    /A correction replaces the same ID/,
    /Do not reconstruct forgotten preferences/,
    /preserves the original file byte-for-byte/,
    /Do not bypass a helper rejection by directly editing/,
    /A question or a learning write alone does not authorize a Git commit/,
    /repository-only restriction disables knowledge writes/,
    /an inference: return a short suggested question/,
  ]) assert.match(scout, pattern);
});

test('commits, pushes and pull requests are ordinary requests, never refused as a Concierge rule', async () => {
  const { concierge } = await profiles();
  const development = await skill('development');
  const orchestrate = await skill('orchestrate');
  for (const pattern of [
    /Commits, pushes, branches and pull requests are ordinary repository work/,
    /Concierge adds no extra consent step and has no rule against committing or pushing/,
    /Never tell the user that Concierge cannot commit, push or open a pull request/,
    /report that exact cause and how to fix it/,
    /Without such a request, leave changes uncommitted and say so/,
    /Do not force-push, rewrite published history, merge or delete branches unless the user asks/,
    /List pushes and pull requests in a plan's `Watch-outs`/,
    /include the relevant knowledge file deliberately/,
    /absence of private data/,
  ]) assert.match(development, pattern);
  assert.match(concierge.body, /Never tell the user that Concierge cannot commit, push or open a pull request/);
  assert.match(orchestrate, /^git: <what the user asked for/m);
  assert.match(orchestrate, /Never answer that the Concierge workflow cannot commit or push/);
  assert.match(await skill('scout'), /Scout may perform specifically requested Git actions/);
  for (const text of [development, orchestrate, concierge.body]) {
    assert.doesNotMatch(text, /Do not authorize commits|no-commit\/push|never merge or push|publication consent|ship-it|Ship it/);
  }
  assert.ok(!(await readdir(new URL('../skills/', import.meta.url))).includes('ship-it'));
});

test("the worker mirrors its checklist into the session todos that Copilot's todo view reads", async () => {
  const { concierge, worker } = await profiles();
  const contract = `${worker.body}\n${await skill('orchestrate-reference')}`;
  for (const pattern of [
    /read the session's `todos` and `todo_deps` tables/,
    /`id` `<objective>\/<short-slug>`/,
    /`pending` for `- \[ \]`, `in_progress` for `- \[\/\]`, `done` for `- \[x\]` and `blocked` for `- \[-\]`/,
    /ON CONFLICT\(id\) DO UPDATE/,
    /Never create, alter or drop the tables/,
    /Never edit another objective's rows/,
    /keep the earlier ids/,
    /Sub-agents never write todos/,
    /continue with the checklist alone/,
  ]) assert.match(contract, pattern);
  assert.match(await skill('relay'), /you do not write those/);
  assert.doesNotMatch(concierge.tools, /\bsql\b/);
});

test('suggestions are grounded offers and every follow-up gets an outcome', async () => {
  const { worker } = await profiles();
  const orchestrate = await skill('orchestrate');
  const relay = await skill('relay');
  assert.match(worker.body, /^suggestions:\n- <a follow-up worth offering, with its one-line reason; or none>$/m);
  assert.match(worker.body, /do not report `done` while a follow-up has no outcome/);
  assert.match(worker.body, /never start one until the user accepts it/);
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
  ]) assert.match(orchestrate, pattern);
  assert.match(relay, /"Next steps you might want:"/);
  assert.match(relay, /do not ask them with `ask_user`/);
  assert.match(relay, /never start one yourself/);
  assert.match(relay, /\(accepted suggestion: <the full suggestion text>\)/);
});

test('customer routing still works and retired built-in agents migrate to the worker with a skill', async () => {
  const { worker } = await profiles();
  const reference = await skill('orchestrate-reference');
  assert.match(worker.body, /a `copilot-concierge-routing` row is a delegation instruction/);
  assert.match(worker.body, /never rewrite the user's routing files silently/);
  assert.match(worker.body, /Never bypass host permissions or a user restriction/);
  for (const pattern of [
    /## Routing tables/,
    /skills named `copilot-concierge-routing-<something>`/,
    /Role keys describe kinds of work, not shipped agents/,
    /model pin is a preference, not an eligibility requirement/,
    /available custom agent named by a row still wins/,
    /A row naming `copilot-concierge:worker` means you do that work yourself, loading all row skills/,
    /`scout` for `copilot-concierge:scout`, `plan` for `copilot-concierge:product-manager`, `review` or `grill-plan` for `copilot-concierge:reviewer`/,
    /A retired reviewer row still asks for independent review/,
    /execute directly within scope/,
    /Never rewrite the user's routing files silently/,
    /Never bypass host permissions or a user restriction/,
  ]) assert.match(reference, pattern);
});

test('removed agents are named only where a routing row is migrated', async () => {
  const all = await profiles();
  const retired = /copilot-concierge:(?:orchestrator|scout|product-manager|reviewer|escalation)\b/;
  for (const [name, profile] of Object.entries(all)) {
    assert.doesNotMatch(profile.body, retired, name);
    assert.doesNotMatch(profile.body, /\borchestrator\b|\bSol\b|\bLuna\b/, name);
  }
  for (const name of CONCIERGE_SKILLS) {
    const text = await skill(name);
    assert.doesNotMatch(text, /\bSol\b|\bLuna\b/, name);
    if (name !== 'orchestrate-reference') {
      assert.doesNotMatch(text, retired, name);
      assert.doesNotMatch(text, /\borchestrator\b/, name);
    }
  }
});

// The external-session protocol never ran live and was retired after 0.10.0.
test('external sessions are retired and archived, not half-present', async () => {
  const all = await profiles();
  const handoff = await read('references/handoff.md');
  for (const [name, text] of [['concierge', all.concierge.body], ['worker', all.worker.body], ['brief', await skill('brief')], ['relay', await skill('relay')], ['orchestrate', await skill('orchestrate')], ['handoff', handoff]]) {
    assert.doesNotMatch(text, /owner binding|owner-binding|collector|return route|result collected|owner accepted|Quarantine/i, name);
    assert.doesNotMatch(text, /load (the )?`external-sessions`/, name);
  }
  const archive = new URL('../docs/archive/external-sessions/', import.meta.url);
  assert.match(await readFile(new URL('external-sessions.skill.md', archive), 'utf8'), /^name: external-sessions$/m);
  assert.match(await readFile(new URL('README.md', archive), 'utf8'), /not loaded, validated or supported/);
  await assert.rejects(readFile(new URL('../skills/external-sessions/SKILL.md', import.meta.url)), /ENOENT/);
});
