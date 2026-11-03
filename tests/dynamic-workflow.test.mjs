import test from 'node:test';
import assert from 'node:assert/strict';
import { meta, runPilot } from '../examples/dynamic-workflow/workflow.mjs';

function context(args, responses = []) {
  const calls = [], phases = [], logs = [];
  return { args, runId: 'run-1', calls, phases, logs,
    phase: x => phases.push(x), log: x => logs.push(x),
    parallel: async jobs => Promise.all(jobs.map(job => job())),
    agent: async (prompt, options) => { calls.push({ prompt, options }); return responses[calls.length - 1]; },
    pause: async key => { calls.push({ pause: key }); },
    step: async (key, fn) => { calls.push({ step: key }); return fn(); },
  };
}
const ok = { status: 'completed', summary: 'Found entry', evidence: ['src/a.js:1'], uncertainties: [] };

test('stages fan out with unique labels, then join structured results', async () => {
  const ctx = context({ objective: 'Explore', pieces: ['one', 'two'] }, [ok, ok]);
  const result = await runPilot(ctx);
  assert.equal(meta.name, 'concierge-explore-pilot');
  assert.deepEqual(ctx.phases, ['Intake', 'Explore', 'Join']);
  assert.deepEqual(ctx.calls.slice(0, 2).map(c => c.options.label), ['piece-1', 'piece-2']);
  assert.match(ctx.calls[0].prompt, /Read only/);
  assert.equal(result.status, 'completed');
  assert.equal(result.pieces.length, 2);
  assert.equal(result.checks.status, 'not_run');
  assert.equal(result.runId, 'run-1');
});

test('missing or malformed worker output is blocked and checkpoint precedes join', async () => {
  const ctx = context({ objective: 'Explore', pieces: ['one', 'two'], checkpoint: true }, [null, { status: 'completed' }]);
  const result = await runPilot(ctx);
  assert.equal(result.status, 'partial');
  assert.deepEqual(result.pieces.map(p => p.status), ['blocked', 'blocked']);
  assert.ok(ctx.calls.findIndex(c => c.pause) < ctx.calls.findIndex(c => c.step));
});

test('validates semantic limits without relying on SDK schema', async () => {
  for (const args of [{}, { objective: ' ', pieces: ['x'] }, { objective: 'x', pieces: [] }, { objective: 'x', pieces: Array(7).fill('x') }, { objective: 'x', pieces: ['x'], checkpoint: 'yes' }, { objective: 'x', pieces: ['x'], surprise: true }]) {
    const ctx = context(args);
    await assert.rejects(runPilot(ctx));
    assert.equal(ctx.calls.length, 0);
  }
});

test('hard host failure propagates rather than becoming a success', async () => {
  const ctx = context({ objective: 'Explore', pieces: ['x'] });
  ctx.parallel = async () => { throw new Error('host unavailable'); };
  await assert.rejects(runPilot(ctx), /host unavailable/);
  assert.ok(!ctx.calls.some(c => c.step));
});

test('pause stops before join and resumed run can reuse host-memoized agent results', async () => {
  const args = { objective: 'Explore', pieces: ['one'], checkpoint: true };
  let agents = 0, paused = false;
  const cache = new Map();
  const make = () => {
    const ctx = context(args);
    ctx.agent = async (_prompt, options) => {
      if (!cache.has(options.label)) { agents++; cache.set(options.label, ok); }
      return cache.get(options.label);
    };
    ctx.pause = async () => { if (!paused) { paused = true; throw new Error('paused'); } };
    return ctx;
  };
  const first = make();
  await assert.rejects(runPilot(first), /paused/);
  assert.ok(!first.calls.some(c => c.step));
  const resumed = await runPilot(make());
  assert.equal(resumed.status, 'completed');
  assert.equal(agents, 1); // This models documented host behavior, not a live-host test.
});
