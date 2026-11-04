import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const skill = name => readFile(new URL(`../skills/${name}/SKILL.md`, import.meta.url), 'utf8');

// Source-contract regressions, not live model acceptance or a permission boundary.
test('plan carries a compact structured outcome without inventing requirements', async () => {
  const text = await skill('plan');
  for (const field of [
    'original intent', 'objective', 'acceptance criteria', 'constraints and non-goals',
    'decisions and inferences', 'dependencies and ownership', 'verification',
    'consequential open questions',
  ]) assert.match(text, new RegExp(`^${field}: <`, 'm'), field);
  for (const pattern of [
    /original request verbatim or an accessible exact source/,
    /short entries for a small clear change/,
    /Do not invent requirements to fill a field/,
    /not a requirement to create a separate file, service or approval stage/,
    /separately labeled recommendations, assumptions and unknowns/,
    /an inference is not a user decision or authorization/,
  ]) assert.match(text, pattern);
});

test('plan connects measurable acceptance, dependencies and consequential questions to verification', async () => {
  const text = await skill('plan');
  for (const pattern of [
    /observable pass\/fail conditions/,
    /Do not invent numerical targets or silently weaken acceptance/,
    /real prerequisites, execution steps, owners, owned files\/resources and shared-contract conflicts/,
    /each acceptance criterion mapped to a check, expected evidence/,
    /only decisions that could change outcome, scope, risk or verification/,
    /evidence checked, recommendation and what can proceed/,
    /passed, failed, blocked and not-run checks/,
    /A clear ticket needs no generic discovery interview/,
  ]) assert.match(text, pattern);
});

test('planning preserves outcome continuity and the existing presentation and approval boundaries', async () => {
  const text = await skill('plan');
  for (const pattern of [
    /`Plan`, `Scope`, `Steps`, `Checks` and optional `Watch-outs`/,
    /does not replace that format or the existing `ask`\/`auto` approval behavior/,
    /Retain unchanged criteria, settled decisions and unresolved findings/,
    /existing handover for resume or rollover/,
    /a leaf returns it to Sol and does not edit parent state/,
    /Preserve the original request and amendment history/,
    /Never treat planning completion as implementation completion/,
  ]) assert.match(text, pattern);
});

test('grill findings include consequence-based severity, evidence, resolution and disposition', async () => {
  const text = await skill('grill-plan');
  for (const field of ['Finding', 'Severity', 'Failure case', 'Evidence', 'Resolution', 'Disposition']) {
    assert.match(text, new RegExp(`^- ${field}:`, 'm'), field);
  }
  for (const pattern of [
    /high, medium or low/,
    /Severity describes impact, not certainty or permission/,
    /an explicitly unverified inference/,
    /the evidence that would demonstrate resolution/,
    /open, resolved with evidence, or accepted\/deferred by the authorized owner/,
    /Do not invent a resolution or acceptance that has not occurred/,
    /Sol owns finding disposition/,
    /not authorization to implement it or waive a user requirement/,
  ]) assert.match(text, pattern);
});

test('grill stays proportional, avoids repetitive review and keeps unresolved findings', async () => {
  const text = await skill('grill-plan');
  for (const pattern of [
    /not a mandatory stage for every plan/,
    /not to manufacture an objection quota or approval gate/,
    /“No material findings” is a valid result/,
    /your review adds no approval step/,
    /does not create a new gate or change `ask`\/`auto` approval behavior/,
    /focus on changed decisions and unresolved findings/,
    /reopen a finding only when new evidence or a changed assumption/,
    /Do not demand an endless re-review loop/,
    /amendments, resume and rollover do not lose them/,
    /a clean review is not proof of implementation completion/,
  ]) assert.match(text, pattern);
});

test('plan and grill retain profile identity, leaf limits and self-contained guidance', async () => {
  const plan = await skill('plan');
  const grill = await skill('grill-plan');
  assert.match(plan, /Your agent profile controls identity, model, tools, reporting and delegation/);
  assert.match(plan, /Planning\/review scope does not authorize implementation/);
  assert.match(plan, /A leaf planner does not update the parent checklist, approve the plan, recruit workers or dispatch implementation/);
  assert.match(grill, /Your profile determines identity and delegation/);
  assert.match(grill, /self-checking, never independent review/);
  assert.match(grill, /Do not implement fixes during assessment/);
  assert.match(grill, /A leaf reviewer must not recruit another reviewer/);
  for (const text of [plan, grill]) {
    assert.doesNotMatch(text, /enterprise-ux/);
    assert.doesNotMatch(text, /\]\((?:\.\.\/|\/)/, 'skill is self-contained');
  }
});
