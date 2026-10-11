import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkRoots, agentId, routingRows } from '../scripts/check-custom.mjs';

async function project(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zilot-custom-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [file, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), text);
  }
  return root;
}

const agent = (description, extra = '') => `---\nname: x\ndescription: ${description}\nmodel: gpt-6-luna\nmodel-policy: required\n${extra}---\n\nCharter.\n`;
const skill = name => `---\nname: ${name}\ndescription: A skill for testing the checker.\n---\n\nBody.\n`;

test('agent IDs follow Copilot: file name, subdirectories joined by --', () => {
  assert.equal(agentId('/r/.github/agents', '/r/.github/agents/acme-react.agent.md'), 'acme-react');
  assert.equal(agentId('/r/.github/agents', '/r/.github/agents/security/auditor.agent.md'), 'security--auditor');
});

test('an unquoted ": " in frontmatter is an error, because Copilot silently drops the agent', async t => {
  const root = await project(t, { '.github/agents/bad.agent.md': agent('Internal: does things') });
  const result = await checkRoots([root]);
  assert.match(result.errors.join('\n'), /quote the value of "description"/);
});

test('routing rows resolve against discovered agents, Zilot roles and skills', async t => {
  const root = await project(t, {
    '.github/agents/acme-react.agent.md': agent('"Acme React."'),
    '.github/skills/acme-ui/SKILL.md': skill('acme-ui'),
    '.github/skills/zilot-routing/SKILL.md': `${skill('zilot-routing')}\n| Role | Agent | Skills | Use when |\n| --- | --- | --- | --- |\n| react-frontend | acme-react | acme-ui | UI |\n| graphql | zilot:graphql | missing-skill | APIs |\n| payments | acme-payments | | |\n`,
  });
  const result = await checkRoots([root]);
  assert.deepEqual(result.errors, []);
  const warnings = result.warnings.join('\n');
  assert.doesNotMatch(warnings, /"acme-react"|"zilot:graphql"|"acme-ui"/);
  assert.match(warnings, /skill "missing-skill"/);
  assert.match(warnings, /agent "acme-payments" was not found/);
  assert.match(warnings, /new role "payments" needs a "Use when"/);
});

test('skill names must match their folder', async t => {
  const root = await project(t, { '.github/skills/acme-ui/SKILL.md': skill('acme-other') });
  assert.match((await checkRoots([root])).errors.join('\n'), /name must match its folder/);
});

test('routing table parsing ignores the header and divider and trims backticks', () => {
  assert.deepEqual(routingRows('| Role | Agent | Skills | Use when |\n|---|---|---|---|\n| `reviewer` | `acme-review` | a, `b` | always |'), [
    { role: 'reviewer', agent: 'acme-review', skills: ['a', 'b'], when: 'always' },
  ]);
});
