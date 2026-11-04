import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkRoots, agentId, routingRows, CONCIERGE_ROLES, CONCIERGE_WORKERS, CONCIERGE_SKILLS } from '../scripts/check-custom.mjs';

async function project(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'copilot-concierge-custom-'));
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

test('routing rows resolve against discovered agents, Concierge roles and skills', async t => {
  const root = await project(t, {
    '.github/agents/acme-react.agent.md': agent('"Acme React."'),
    '.github/skills/acme-ui/SKILL.md': skill('acme-ui'),
    '.github/skills/copilot-concierge-routing/SKILL.md': `${skill('copilot-concierge-routing')}\n| Role | Agent | Skills | Use when |\n| --- | --- | --- | --- |\n| react-frontend | acme-react | acme-ui | UI |\n| graphql | copilot-concierge:worker | graphql, missing-skill | APIs |\n| payments | acme-payments | | |\n`,
  });
  const result = await checkRoots([root]);
  assert.deepEqual(result.errors, []);
  const warnings = result.warnings.join('\n');
  assert.doesNotMatch(warnings, /"acme-react"|"copilot-concierge:worker"|"acme-ui"/);
  assert.match(warnings, /skill "missing-skill"/);
  assert.match(warnings, /agent "acme-payments" was not found/);
  assert.match(warnings, /new role "payments" needs a "Use when"/);
});

test('skill names must match their folder', async t => {
  const root = await project(t, { '.github/skills/acme-ui/SKILL.md': skill('acme-other') });
  assert.match((await checkRoots([root])).errors.join('\n'), /name must match its folder/);
});

test('a leftover ship-it route is reported, not treated as a built-in role', async t => {
  const root = await project(t, {
    '.github/skills/copilot-concierge-routing/SKILL.md': `${skill('copilot-concierge-routing')}\n| Role | Agent | Skills | Use when |\n|---|---|---|---|\n| ship-it | copilot-concierge:ship-it | ship-it | |\n`,
  });
  const result = await checkRoots([root]);
  assert.deepEqual(result.errors, []);
  assert.match(result.warnings.join('\n'), /agent "copilot-concierge:ship-it" was not found/);
});
test('plugin routing uses the manifest namespace, never a matching agent basename alone', async t => {
  const root = await project(t, {
    'plugin.json': JSON.stringify({ name: 'copilot-concierge' }),
    'com.github.copilot/agents/worker.agent.md': agent('"Implementation worker."'),
    'skills/copilot-concierge-routing/SKILL.md': `${skill('copilot-concierge-routing')}\n| Role | Agent | Skills | Use when |\n|---|---|---|---|\n| graphql | copilot-concierge:worker | graphql | APIs |\n| graphql | zilot:graphql | graphql | Legacy migration check |\n| graphql | another-plugin:graphql | graphql | Other plugin |\n| graphql | copilot-concierge:missing | graphql | Missing role |\n`,
  });
  const result = await checkRoots([root]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.agents, ['copilot-concierge:worker']);
  const warnings = result.warnings.join('\n');
  assert.doesNotMatch(warnings, /agent "copilot-concierge:worker"/);
  for (const id of ['zilot:graphql', 'another-plugin:graphql', 'copilot-concierge:missing']) {
    assert.ok(warnings.includes(`agent "${id}" was not found`));
  }
});

test('routing table parsing ignores the header and divider and trims backticks', () => {
  assert.deepEqual(routingRows('| Role | Agent | Skills | Use when |\n|---|---|---|---|\n| `reviewer` | `acme-review` | a, `b` | always |'), [
    { role: 'reviewer', agent: 'acme-review', skills: ['a', 'b'], when: 'always' },
  ]);
});

test('documented .claude and .agents project locations are checked too', async t => {
  const root = await project(t, {
    '.claude/agents/claude-reviewer.agent.md': agent('"Reviewer."'),
    '.agents/skills/agents-rules/SKILL.md': skill('agents-rules'),
    '.claude/skills/claude-rules/SKILL.md': skill('claude-rules'),
  });
  const result = await checkRoots([root]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.agents, ['claude-reviewer']);
  assert.deepEqual(result.skills.sort(), ['agents-rules', 'claude-rules']);
});

test('duplicate agent IDs and skill names are reported because Copilot keeps only the first', async t => {
  const root = await project(t, {
    '.github/agents/team-reviewer.agent.md': agent('"Reviewer."'),
    '.claude/agents/team-reviewer.agent.md': agent('"Other reviewer."'),
    '.github/skills/team-rules/SKILL.md': skill('team-rules'),
    '.claude/skills/team-rules/SKILL.md': skill('team-rules'),
  });
  const warnings = (await checkRoots([root])).warnings.join('\n');
  assert.match(warnings, /duplicate agent ID "team-reviewer"/);
  assert.match(warnings, /duplicate skill "team-rules"/);
});

test('custom files cannot silently take over Concierge skill or agent names', async t => {
  const root = await project(t, {
    '.github/agents/scout.agent.md': agent('"Team scout."'),
    '.github/skills/review/SKILL.md': skill('review'),
  });
  const result = await checkRoots([root]);
  assert.match(result.errors.join('\n'), /"review" is a Concierge skill name/);
  assert.match(result.errors.join('\n'), /agent ID "scout" is a Concierge agent name/);
  const shipped = await project(t, {
    'plugin.json': JSON.stringify({ name: 'copilot-concierge' }),
    'com.github.copilot/agents/scout.agent.md': agent('"Scout."'),
    'skills/review/SKILL.md': skill('review'),
  });
  const own = await checkRoots([shipped]);
  assert.deepEqual(own.errors, []);
  assert.doesNotMatch(own.warnings.join('\n'), /is a Concierge (skill|agent) name/);
});


test('routing role keys remain distinct from shipped agent IDs and skills', () => {
  for (const role of ['enterprise-ux', 'react-frontend', 'node-backend', 'graphql']) {
    assert.ok(CONCIERGE_ROLES.includes(role), role);
    assert.ok(!CONCIERGE_WORKERS.includes(role), role);
  }
  assert.ok(CONCIERGE_WORKERS.includes('worker'));
  assert.ok(!CONCIERGE_SKILLS.includes('enterprise-ux'));
  for (const skill of ['react-frontend', 'node-backend', 'graphql']) assert.ok(CONCIERGE_SKILLS.includes(skill), skill);
});

test('legacy built-in IDs warn with an explicit worker and skill migration, without changing routes', async t => {
  const rows = ['react-frontend', 'node-backend', 'graphql', 'enterprise-ux']
    .map(role => `| ${role} | copilot-concierge:${role} | team-rules | |`).join('\n');
  const route = `${skill('copilot-concierge-routing')}\n| Role | Agent | Skills | Use when |\n|---|---|---|---|\n${rows}\n`;
  const root = await project(t, {
    '.github/skills/team-rules/SKILL.md': skill('team-rules'),
    '.github/skills/copilot-concierge-routing/SKILL.md': route,
  });
  const result = await checkRoots([root]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 4);
  for (const role of ['react-frontend', 'node-backend', 'graphql', 'enterprise-ux']) {
    assert.ok(result.warnings.some(warning => warning.includes(`legacy agent "copilot-concierge:${role}"`) && warning.includes('"copilot-concierge:worker"') && warning.includes(`skill "${role === 'enterprise-ux' ? 'plan' : role}"`)));
  }
  assert.doesNotMatch(result.warnings.join('\n'), /new role/);
  const { readFile } = await import('node:fs/promises');
  assert.equal(await readFile(path.join(root, '.github/skills/copilot-concierge-routing/SKILL.md'), 'utf8'), route);
});

test('legacy role keys preserve exact custom IDs and do not demand new-role descriptions', async t => {
  const root = await project(t, {
    'plugin.json': JSON.stringify({ name: 'team-tools' }),
    'com.github.copilot/agents/graphql.agent.md': agent('"Team GraphQL."'),
    '.github/agents/enterprise-ux.agent.md': agent('"Team design."'),
    '.github/skills/team-rules/SKILL.md': skill('team-rules'),
    '.github/skills/copilot-concierge-routing/SKILL.md': `${skill('copilot-concierge-routing')}\n| Role | Agent | Skills | Use when |\n|---|---|---|---|\n| graphql | team-tools:graphql | graphql, team-rules | |\n| enterprise-ux | enterprise-ux | plan, team-rules | |\n`,
  });
  const result = await checkRoots([root]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.agents.sort(), ['enterprise-ux', 'team-tools:graphql']);
});

test('removed design skill warns unless that exact skill is discovered from a custom source', async t => {
  const route = `${skill('copilot-concierge-routing')}\n| Role | Agent | Skills | Use when |\n|---|---|---|---|\n| enterprise-ux | copilot-concierge:worker | enterprise-ux | Design |\n`;
  const root = await project(t, { '.github/skills/copilot-concierge-routing/SKILL.md': route });
  const result = await checkRoots([root]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /former built-in skill "enterprise-ux" is no longer shipped/);
  const customRoot = await project(t, { '.github/skills/enterprise-ux/SKILL.md': skill('enterprise-ux') });
  assert.deepEqual((await checkRoots([root, customRoot])).warnings, []);
});

test('new worker ID is reserved without reserving every legacy role as an agent', async t => {
  const root = await project(t, {
    '.github/agents/worker.agent.md': agent('"Team worker."'),
    '.github/agents/node-backend.agent.md': agent('"Team Node."'),
  });
  const result = await checkRoots([root]);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /agent ID "worker" is a Concierge agent name/);
});
