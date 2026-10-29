import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { copyPackage } from '../scripts/lib/package.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

async function convertMarkdown(directory, eol) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await convertMarkdown(file, eol);
    else if (entry.name.endsWith('.md')) {
      const text = (await readFile(file, 'utf8')).replace(/\r\n/g, '\n');
      await writeFile(file, text.replace(/\n/g, eol));
    }
  }
}

async function fixture(t, eol) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'copilot-concierge-validation-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await copyPackage(root, directory);
  await convertMarkdown(directory, eol);
  return directory;
}

function validate(directory) {
  return spawnSync(process.execPath, [path.join(root, 'scripts/validate.mjs'), directory], { encoding: 'utf8' });
}

for (const [name, eol] of [['LF', '\n'], ['CRLF', '\r\n']]) {
  test(`package validator accepts ${name} skill and agent frontmatter`, async t => {
    const directory = await fixture(t, eol);
    const result = validate(directory);
    assert.equal(result.status, 0, result.error?.message ?? result.stderr);
    assert.match(result.stdout, /Package checks passed: 11 skills, 10 agents/);
  });
}

test('CRLF frontmatter still enforces the required model policy', async t => {
  const directory = await fixture(t, '\r\n');
  const file = path.join(directory, 'com.github.copilot/agents/concierge.agent.md');
  await writeFile(file, (await readFile(file, 'utf8')).replace('model-policy: required', 'model-policy: preferred'));
  const result = validate(directory);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /concierge\.agent\.md: required policy missing/);
});

test('validator rejects a missing renamed entry or a second visible agent', async t => {
  const directory = await fixture(t, '\n');
  const entry = path.join(directory, 'com.github.copilot/agents/concierge.agent.md');
  const original = await readFile(entry, 'utf8');
  await writeFile(entry, original.replace('name: concierge', 'name: frontdesk'));
  assert.match(validate(directory).stderr, /Expected one Concierge entry agent/);
  await writeFile(entry, original);
  const worker = path.join(directory, 'com.github.copilot/agents/scout.agent.md');
  await writeFile(worker, (await readFile(worker, 'utf8')).replace('user-invocable: false', 'user-invocable: true'));
  assert.match(validate(directory).stderr, /only Concierge may be user-invocable/);
});
