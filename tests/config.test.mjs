import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig, loadConfig, validateConfig } from '../scripts/lib/config.mjs';

test('narrow ask defeats broad auto, missing values inherit independently', () => {
  const layers = [
    { source: 'user', value: { planApproval: 'auto', models: { concierge: 'chosen-front' } } },
    { source: 'project', value: { planApproval: 'ask', models: { worker: 'chosen-sol' } } },
    { source: 'session', value: {} },
  ];
  const result = resolveConfig(layers);
  assert.equal(result.value.planApproval, 'ask');
  assert.equal(result.source.planApproval, 'project');
  assert.deepEqual(result.value.models, { concierge: 'chosen-front', worker: 'chosen-sol' });
  assert.deepEqual(resolveConfig().value.models, { concierge: 'auto', worker: 'auto' });
  assert.equal(resolveConfig(layers.slice(0, 1)).value.planApproval, 'auto');
  assert.equal(resolveConfig().value.planApproval, 'auto');
});

test('invalid config cannot silently enable auto approval or model fallback', () => {
  for (const config of [{ extraDirectories: 'one' }, { extraDirectories: [''] }, { extraDirectories: ['a\nb'] }, { planApproval: true }, { planApproval: null }, { models: { unknown: 'x' } }, { autoApproveEdits: true }, { models: { specialist: 'x\nInjected instructions' } }]) {
    assert.throws(() => validateConfig(config));
  }
});

test('legacy entry-model key resolves with normal scope precedence and rejects ambiguity', () => {
  const result = resolveConfig([
    { source: 'user', value: { models: { concierge: 'user-root' } } },
    { source: 'project', value: { models: { frontdesk: 'legacy-project-root' } } },
  ]);
  assert.equal(result.value.models.concierge, 'legacy-project-root');
  assert.equal(result.source.models.concierge, 'project');
  assert.equal(Object.hasOwn(result.value.models, 'frontdesk'), false);
  const reverse = resolveConfig([
    { source: 'user', value: { models: { frontdesk: 'legacy-user-root' } } },
    { source: 'project', value: { models: { concierge: 'project-root' } } },
  ]);
  assert.equal(reverse.value.models.concierge, 'project-root');
  assert.throws(() => validateConfig({ models: { frontdesk: 'one', concierge: 'two' } }), /not both/);
  assert.doesNotThrow(() => validateConfig({ models: { concierge: 'fusion' } }));
  assert.doesNotThrow(() => validateConfig({ models: { frontdesk: 'auto' } }));
  // Every role may prefer Copilot Fusion or pin one explicit model.
  for (const role of ['concierge', 'worker', 'orchestrator']) {
    for (const model of ['auto', 'fusion', 'gpt-6.1-sol']) assert.doesNotThrow(() => validateConfig({ models: { [role]: model } }), `${role}: ${model}`);
  }
  assert.equal(resolveConfig([{ source: 'user', value: { models: { worker: 'gpt-6.1-sol' } } }]).value.models.worker, 'gpt-6.1-sol');
});

// The three-tier layout had orchestrator, specialist and escalation roles.
test('older model roles keep working: orchestrator is the worker, retired roles are ignored', () => {
  const result = resolveConfig([
    { source: 'user', value: { models: { worker: 'user-worker', specialist: 'old-leaf', escalation: 'old-strong' } } },
    { source: 'project', value: { models: { orchestrator: 'legacy-project-sol' } } },
  ]);
  assert.deepEqual(result.value.models, { concierge: 'auto', worker: 'legacy-project-sol' });
  assert.equal(result.source.models.worker, 'project');
  assert.deepEqual(Object.keys(result.source.models).sort(), ['concierge', 'worker']);
  const reverse = resolveConfig([
    { source: 'user', value: { models: { orchestrator: 'legacy-user-sol' } } },
    { source: 'project', value: { models: { worker: 'project-worker' } } },
  ]);
  assert.equal(reverse.value.models.worker, 'project-worker');
  assert.throws(() => validateConfig({ models: { orchestrator: 'one', worker: 'two' } }), /use models\.worker or its deprecated models\.orchestrator alias, not both/);
  // A retired role is still checked, so a broken old file is reported rather than half-read.
  assert.throws(() => validateConfig({ models: { specialist: 'x\nInjected instructions' } }), /must name one model ID/);
  assert.throws(() => validateConfig({ models: { reviewer: 'x' } }), /unknown model role reviewer/);
});

test('files resolve user → project → session → task; explicit missing config fails', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'copilot-concierge-config-'));
  try {
    const userConfig = path.join(dir, 'user.json');
    const sessionConfig = path.join(dir, 'session.json');
    await mkdir(path.join(dir, '.copilot-concierge'));
    await writeFile(userConfig, JSON.stringify({ planApproval: 'auto' }));
    await writeFile(path.join(dir, '.copilot-concierge/config.json'), JSON.stringify({ planApproval: 'ask' }));
    await writeFile(sessionConfig, JSON.stringify({ planApproval: 'auto' }));
    assert.equal((await loadConfig({ project: dir, userConfig })).value.planApproval, 'ask');
    const result = await loadConfig({ project: dir, userConfig, sessionConfig, planApproval: 'ask' });
    assert.equal(result.value.planApproval, 'ask');
    assert.equal(result.source.planApproval, 'task: --plan-approval');
    await assert.rejects(loadConfig({ project: dir, userConfig: path.join(dir, 'absent.json') }), { code: 'ENOENT' });
    await writeFile(sessionConfig, 'not json');
    await assert.rejects(loadConfig({ project: dir, userConfig, sessionConfig }), /invalid JSON/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('extra directories accumulate across scopes and resolve relative to their config file', () => {
  const fixture = path.join(os.tmpdir(), 'copilot-concierge-directory-resolution');
  const userBase = path.join(fixture, 'home', 'u', '.config', 'copilot-concierge');
  const projectBase = path.join(fixture, 'repo', '.copilot-concierge');
  const shared = path.join(fixture, 'shared', 'team');
  const result = resolveConfig([
    { source: 'user', base: userBase, value: { extraDirectories: ['agents', shared] } },
    { source: 'project', base: projectBase, value: { extraDirectories: ['../team-agents', shared] } },
  ]);
  assert.deepEqual(result.value.extraDirectories, [path.join(userBase, 'agents'), shared, path.join(fixture, 'repo', 'team-agents')]);
  assert.deepEqual(result.source.extraDirectories, ['user', 'user', 'project']);
  assert.deepEqual(resolveConfig().value.extraDirectories, []);
});

test('the renamed project configuration is explicit and legacy configuration is not inherited', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'concierge-config-migration-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const userConfig = path.join(dir, 'user.json');
  await writeFile(userConfig, '{}');
  await mkdir(path.join(dir, '.zilot'));
  await writeFile(path.join(dir, '.zilot/config.json'), JSON.stringify({ planApproval: 'auto' }));
  assert.equal((await loadConfig({ project: dir, userConfig })).value.planApproval, 'auto');
  await mkdir(path.join(dir, '.copilot-concierge'));
  await writeFile(path.join(dir, '.copilot-concierge/config.json'), JSON.stringify({ planApproval: 'auto' }));
  const migrated = await loadConfig({ project: dir, userConfig });
  assert.equal(migrated.value.planApproval, 'auto');
  assert.equal(migrated.source.planApproval, `project: ${path.join(dir, '.copilot-concierge/config.json')}`);
});
