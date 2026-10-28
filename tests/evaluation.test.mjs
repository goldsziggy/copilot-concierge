import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readJson = async name => JSON.parse(await readFile(new URL(`fixtures/${name}`, import.meta.url), 'utf8'));
const scenarios = await readJson('scenarios.json');
const protocol = await readJson('evaluation-protocol.json');
const template = await readJson('evaluation-run-template.json');

test('comparative protocol covers twelve outcome scenarios and retains existing regression seeds', () => {
  const ids = scenarios.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['vague-request', 'bare-jira', 'clear-change', 'followup', 'cancel-resume', 'unavailable-model']) assert.ok(ids.includes(id));
  assert.equal(protocol.scenarioIds.length, 12);
  assert.equal(new Set(protocol.scenarioIds).size, 12);
  for (const id of [...protocol.scenarioIds, ...protocol.additionalRegressionIds]) {
    const scenario = scenarios.find(s => s.id === id);
    assert.ok(scenario, id);
    assert.equal(typeof scenario.input, 'string');
    assert.ok(scenario.requires.length >= 3);
  }
  for (const id of protocol.scenarioIds) {
    const scenario = scenarios.find(s => s.id === id);
    assert.equal(typeof scenario.setup, 'string', id);
    assert.ok(scenario.acceptance.length >= 2, id);
  }
});

test('comparison controls include repeat runs and hold non-topology conditions comparable', () => {
  assert.match(protocol.baseline.revision, /^[a-f0-9]{40}$/);
  assert.equal(protocol.baseline.version, '0.6.1');
  assert.equal(protocol.candidate.version, '0.7.0');
  assert.ok(protocol.repetitionsPerScenarioPerArm >= 3);
  for (const pattern of [/fixture/, /follow-ups/, /approval/, /host/, /permissions/, /verification/]) {
    assert.ok(protocol.controls.some(control => pattern.test(control)), String(pattern));
  }
  assert.match(protocol.modelComparison, /matched-model/);
});

test('unexecuted evaluation records do not claim results or replace unavailable metrics with zeros', () => {
  assert.equal(protocol.status, 'not-run');
  assert.deepEqual(protocol.runs, []);
  assert.equal(protocol.candidate.revision, null);
  assert.equal(template.recordKind, 'unexecuted-template');
  assert.equal(template.status, 'not-run');
  for (const metric of protocol.requiredMetrics) assert.ok(Object.hasOwn(template, metric), metric);
  for (const metric of ['acceptedCompletion', 'unsupportedCompletionClaims', 'lostConstraints', 'unintendedWrites', 'humanCorrections', 'delegations', 'retries', 'repeatedDiscovery', 'executionSeconds', 'approvalWaitSeconds']) {
    assert.equal(template[metric], null, metric);
  }
  assert.deepEqual(template.actualModels, []);
  assert.equal(template.usage.coverage, 'unavailable');
  for (const key of ['source', 'includesFailedAttempts', 'inputTokens', 'outputTokens', 'credits', 'cost', 'currency']) assert.equal(template.usage[key], null, key);
  for (const key of ['acceptanceResults', 'artifactEvidence', 'commandEvidence', 'constraintEvidence']) assert.deepEqual(template[key], []);
});

test('evaluation guidance distinguishes fixtures from observed behavior and defines regression gates', async () => {
  const guide = await readFile(new URL('../references/comparative-evaluation.md', import.meta.url), 'utf8');
  for (const text of ['No live comparative runs', 'cost per accepted task', 'approval wait', 'failed attempts', 'per-scenario', 'No paid trials', 'unavailable', 'independent reviewer']) assert.ok(guide.includes(text), text);
  assert.match(guide, /do not publish private memory/i);
  assert.match(guide, /not evidence that a model/i);
});

test('task evaluation is a self-contained on-demand procedure without new authority', async () => {
  const skill = await readFile(new URL('../skills/task-evaluation/SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /^---\nname: task-evaluation\ndescription: .+\n---/);
  for (const phrase of ['on demand', 'current execution owner', 'never recruit agents', 'Sol retains objective ownership', 'No paid trials', 'Actual models observed', 'human approval wait', 'failed attempts', 'cost per accepted task', 'per-scenario', 'unknown', 'explicit scope', 'custom review routes remain authoritative']) assert.ok(skill.includes(phrase), phrase);
  assert.match(skill, /Evaluation alone does not authorize implementation/);
  assert.match(skill, /do not publish private memory/i);
  assert.doesNotMatch(skill, /\]\(\.\.\//);
  for (const match of skill.matchAll(/\]\((references\/[^)]+)\)/g)) {
    const referenced = new URL(`../skills/task-evaluation/${match[1]}`, import.meta.url);
    assert.ok((await readFile(referenced)).length > 0, match[1]);
  }
});

test('bundled evaluation references stay aligned with tested comparison fixtures', async () => {
  const resource = async name => JSON.parse(await readFile(new URL(`../skills/task-evaluation/references/${name}`, import.meta.url), 'utf8'));
  assert.deepEqual(await resource('protocol.json'), protocol);
  assert.deepEqual(await resource('run-template.json'), template);
  assert.deepEqual(await resource('scenarios.json'), scenarios);
});


test('explicit Scout routing overrides the otherwise eligible direct-read default', () => {
  assert.ok(protocol.additionalRegressionIds.includes('custom-scout-route'));
  const scenario = scenarios.find(s => s.id === 'custom-scout-route');
  assert.match(scenario.setup, /one required model/);
  assert.ok(scenario.requires.includes('dispatch exact agent and required model'));
  assert.ok(scenario.requires.includes('load routing-row skills'));
  assert.ok(scenario.requires.includes('no direct-work bypass of custom route'));
  assert.ok(scenario.acceptance.some(item => /Host evidence/.test(item)));
});
