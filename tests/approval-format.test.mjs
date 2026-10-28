import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Native agent instructions are the implementation. These source-contract
// regressions do not simulate an LLM, tool execution or rendered Copilot UI.
const read = async file => (await readFile(new URL(`../${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const orchestrator = await read('com.github.copilot/agents/orchestrator.agent.md');
const concierge = await read('com.github.copilot/agents/concierge.agent.md');
const guide = await read('references/approval-preference.md');
const approval = concierge.match(/^3\. `needs_approval`: (.+)$/m)?.[1];

test('approval plans require separated plain-text sections, actions, checks and material risks', () => {
  assert.match(orchestrator, /sections `Plan`, `Scope`, `Steps`, `Checks` and optional `Watch-outs`/);
  assert.match(orchestrator, /each section on its own line, separated by blank lines/);
  assert.match(orchestrator, /3–5 short numbered steps where appropriate/);
  assert.match(orchestrator, /about 120 words, but never omit material scope or risks/);
  assert.match(orchestrator, /concrete actions and observable checks/);
  assert.match(orchestrator, /Explicitly identify publishing, deployment, deletion or other consequential actions/);
  assert.match(orchestrator, /Never compress the plan into a paragraph/);
  assert.match(orchestrator, /Resolve blocking questions through `needs_input` before requesting approval/);
});

test('report template and user example retain section spacing and numbered steps', () => {
  for (const [name, source] of [['report', orchestrator], ['guide', guide]]) {
    const plan = source.match(/```text\n(Plan:[\s\S]*?)\n```/)?.[1];
    assert.ok(plan, `${name}: plain-text plan example`);
    assert.match(plan, /^Plan: [^\n]+\n\nScope: [^\n]+\n\nSteps:\n1\. [^\n]+\n2\. [^\n]+\n3\. [^\n]+\n\nChecks: [^\n]+\n\nWatch-outs: [^\n]+/);
    assert.doesNotMatch(plan, /\|/, `${name}: no Markdown table dependency`);
  }
  assert.match(guide, /\n\nApprove this plan\?\nApprove\nChange something\nCancel\n```/);
});

test('Concierge preserves the plan in the supported question field or immediately before it', () => {
  assert.ok(approval);
  assert.match(approval, /preserve the plan's labels, numbering and line breaks, including blank lines and any revision details/);
  assert.match(approval, /Include the structured plan in the approval question when the existing `ask_user` schema supports it; otherwise show it immediately before the short question/);
  assert.match(approval, /Ask "Approve this plan\?" with choices "Approve", "Change something", "Cancel"/);
  assert.match(approval, /Do not invent schema fields or rely on Markdown tables or cards rendering/);
  assert.match(approval, /Send `PLAN DECISION: <exact choice and any text>` back to the same orchestrator, associated with the displayed plan/);
});

test('Approve alone authorizes the displayed plan; missing or ambiguous replies do not', () => {
  assert.match(approval, /Only "Approve" authorizes that displayed plan/);
  assert.match(approval, /A missing or ambiguous answer is not approval: clarify and wait/);
  assert.match(orchestrator, /Only `PLAN DECISION: Approve` approves the displayed plan/);
  assert.match(orchestrator, /A missing or ambiguous answer is not approval/);
});

test('Change something keeps work unapproved and a revision requires fresh approval', () => {
  assert.match(approval, /"Change something" requests revision without authorizing work/);
  assert.match(approval, /relay any requested changes verbatim, using `needs_input` to resolve missing details/);
  assert.match(approval, /Revisions require a new approval; an earlier approval does not carry over/);
  assert.match(orchestrator, /A revised plan must identify what changed/);
  assert.match(orchestrator, /return as a new `needs_approval` when approval is required/);
  assert.match(orchestrator, /`PLAN DECISION: Change something` leaves it unapproved/);
  assert.match(orchestrator, /an earlier approval does not authorize a revision/);
});

test('Cancel is relayed through PLAN DECISION and stops the objective', () => {
  assert.match(approval, /"Cancel" cancels that objective without authorizing work/);
  assert.match(orchestrator, /`PLAN DECISION: Cancel` cancels the objective: stop direct work and dispatching, send `STOP` to running workers and report `cancelled`/);
});

test('without ask_user the same multiline plan, exact question and choices wait for a reply', () => {
  const fallback = concierge.match(/If `ask_user` is unavailable, (.+)/)?.[1];
  assert.ok(fallback);
  assert.match(fallback, /same structured plan with its labels, numbering and line breaks/);
  assert.match(fallback, /"Approve this plan\?" and the same choices "Approve", "Change something", "Cancel"/);
  assert.match(fallback, /end the turn and wait/);
  assert.match(fallback, /Apply the same decision rules to the user's answer/);
  assert.match(fallback, /never assume approval or send `CONTINUE` while waiting/);
});

test('formatting keeps auto preference and separate publication consent boundaries', () => {
  assert.match(orchestrator, /With `auto`, report a `checkpoint` that shows the plan and source, and continue on `CONTINUE`/);
  assert.match(concierge, /plan approval, `auto`, earlier go-ahead, `CONTINUE` and tool permission are not publication consent/);
  assert.match(orchestrator, /Use `needs_input`, not `needs_approval` or an auto-continuing `checkpoint`, for that decision/);
});
