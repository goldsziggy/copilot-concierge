import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { configureProfile, copyEntry } from '../scripts/lib/package.mjs';
import { resolveConfig } from '../scripts/lib/config.mjs';

const profile = '---\nname: example\nmodel: authored-model\nmodel-policy: required\ntools: [task]\n---\nDo only assigned work.\n';

test('configuration pins each native tier and preserves role tool boundary', () => {
  const config = resolveConfig([{ source: 'session', value: { models: { orchestrator: 'explicit-sol' }, planApproval: 'auto' } }]);
  for (const [file, model] of [['frontdesk.agent.md', 'gpt-6-luna'], ['orchestrator.agent.md', 'explicit-sol'], ['graphql.agent.md', 'gpt-6-luna'], ['escalation.agent.md', 'gpt-6.1-sol']]) {
    const output = configureProfile(profile, file, config);
    assert.ok(output.includes(`model: ${JSON.stringify(model)}\n`));
    assert.ok(output.includes('model-policy: required\ntools: [task]'));
    assert.ok(output.includes('"planApprovalSource": "session"'));
    assert.ok(output.includes("Automatic plan approval never changes Copilot's tool permissions"));
  }
  assert.throws(() => configureProfile(profile.replace('required', 'preferred'), 'frontdesk.agent.md', config), /required model policy/);
  assert.throws(() => configureProfile(profile.replace('model: authored-model', 'model: a\nmodel: b'), 'frontdesk.agent.md', config), /one authored model/);
  const once = configureProfile(profile, 'frontdesk.agent.md', config);
  assert.equal(configureProfile(once, 'frontdesk.agent.md', config), once);
  for (const model of ['null', 'false', '123']) {
    const typedConfig = resolveConfig([{ source: 'session', value: { models: { frontdesk: model } } }]);
    assert.ok(configureProfile(profile, 'frontdesk.agent.md', typedConfig).includes(`model: "${model}"\n`));
  }
});

test('package copying rejects symlinks instead of embedding unrelated content', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'copilot-concierge-package-'));
  try {
    await mkdir(path.join(dir, 'source'));
    await writeFile(path.join(dir, 'source/safe.txt'), 'fixture');
    await assert.rejects(copyEntry(path.join(dir, 'source'), path.join(dir, 'source/recursive')), /inside source/);
    await copyEntry(path.join(dir, 'source'), path.join(dir, 'copy'));
    assert.equal(await readFile(path.join(dir, 'copy/safe.txt'), 'utf8'), 'fixture');
    const outside = path.join(dir, 'outside');
    await mkdir(outside);
    await writeFile(path.join(outside, 'unrelated.txt'), 'must not be packaged');
    // A Windows directory junction exercises link rejection without requiring
    // the elevated permission needed to create a file symlink.
    await symlink(outside, path.join(dir, 'source/link'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(copyEntry(path.join(dir, 'source'), path.join(dir, 'other')), /symbolic links/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
