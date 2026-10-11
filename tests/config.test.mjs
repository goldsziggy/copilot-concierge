import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveConfig, loadConfig, validateConfig } from '../scripts/lib/config.mjs';

test('narrow ask defeats broad auto, missing values inherit independently', () => {
  const layers = [
    { source: 'user', value: { planApproval: 'auto', models: { specialist: 'chosen-leaf' } } },
    { source: 'project', value: { planApproval: 'ask', models: { orchestrator: 'chosen-sol' } } },
    { source: 'session', value: {} },
  ];
  const result = resolveConfig(layers);
  assert.equal(result.value.planApproval, 'ask');
  assert.equal(result.source.planApproval, 'project');
  assert.deepEqual(result.value.models, { frontdesk: 'gpt-6-luna', orchestrator: 'chosen-sol', specialist: 'chosen-leaf', escalation: 'gpt-6.1-sol' });
  assert.equal(resolveConfig(layers.slice(0, 1)).value.planApproval, 'auto');
  assert.equal(resolveConfig().value.planApproval, 'ask');
});

test('invalid config cannot silently enable auto approval or model fallback', () => {
  for (const config of [{ extraDirectories: 'one' }, { extraDirectories: [''] }, { extraDirectories: ['a\nb'] }, { planApproval: true }, { planApproval: null }, { models: { frontdesk: 'Auto' } }, { models: { unknown: 'x' } }, { autoApproveEdits: true }, { models: { specialist: 'x\nInjected instructions' } }]) {
    assert.throws(() => validateConfig(config));
  }
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
  assert.equal((await loadConfig({ project: dir, userConfig })).value.planApproval, 'ask');
  await mkdir(path.join(dir, '.copilot-concierge'));
  await writeFile(path.join(dir, '.copilot-concierge/config.json'), JSON.stringify({ planApproval: 'auto' }));
  const migrated = await loadConfig({ project: dir, userConfig });
  assert.equal(migrated.value.planApproval, 'auto');
  assert.equal(migrated.source.planApproval, `project: ${path.join(dir, '.copilot-concierge/config.json')}`);
});
