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
    assert.match(result.stdout, /Package checks passed: 20 skills, 2 agents/);
  });
}

test('CRLF frontmatter accepts a preferred model without a required policy', async t => {
  const directory = await fixture(t, '\r\n');
  const result = validate(directory);
  assert.equal(result.status, 0, result.stderr);
});

test('validator rejects a missing renamed entry, a second visible agent, a narrowed worker or a third agent', async t => {
  const directory = await fixture(t, '\n');
  const entry = path.join(directory, 'com.github.copilot/agents/concierge.agent.md');
  const original = await readFile(entry, 'utf8');
  await writeFile(entry, original.replace('name: concierge', 'name: frontdesk'));
  assert.match(validate(directory).stderr, /Expected one Concierge entry agent/);
  await writeFile(entry, original);
  const worker = path.join(directory, 'com.github.copilot/agents/worker.agent.md');
  const back = await readFile(worker, 'utf8');
  await writeFile(worker, back.replace('user-invocable: false', 'user-invocable: true'));
  assert.match(validate(directory).stderr, /only Concierge may be user-invocable/);
  // The worker passes its tools to sub-agents, so a tool list on it is rejected.
  await writeFile(worker, back.replace('user-invocable: false', 'user-invocable: false\ntools: [view, bash]'));
  assert.match(validate(directory).stderr, /worker must not restrict tools/);
  await writeFile(worker, back);
  // A third shipped agent would bring back a tier; a new capability is a skill.
  await writeFile(path.join(directory, 'com.github.copilot/agents/reviewer.agent.md'), back.replace('name: worker', 'name: reviewer'));
  const third = validate(directory).stderr;
  assert.match(third, /Concierge ships two agents, concierge and worker/);
  assert.match(third, /Expected 20 skills and 2 agents; found 20 and 3/);
  await rm(path.join(directory, 'com.github.copilot/agents/reviewer.agent.md'));
  // A bundled SOP is run step by step, so a malformed or unlisted one fails the package.
  const bugFix = path.join(directory, 'skills/sops/procedures/bug-fix.md');
  await writeFile(bugFix, (await readFile(bugFix, 'utf8')).replace('## Done when', '## Finished'));
  assert.match(validate(directory).stderr, /bug-fix\.md: add a "## Done when" section/);
  await writeFile(bugFix, (await readFile(bugFix, 'utf8')).replace('## Finished', '## Done when').replace('Article 5', 'Article 11'));
  assert.match(validate(directory).stderr, /bug-fix\.md: cites unknown Article 11/);
  await rm(path.join(directory, 'skills/constitution/articles/10-guard-attention.md'));
  assert.match(validate(directory).stderr, /Expected 10 Articles; found 9/);
  await writeFile(path.join(directory, 'skills/sops/procedures/deploy.md'), '# Deploy\n');
  assert.match(validate(directory).stderr, /Bundled SOPs differ from BUNDLED_SOPS/);
});
