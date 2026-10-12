import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { checkRoots, frontmatter } from '../scripts/check-custom.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const starter = path.join(root, 'examples/customization-starter');
const agentFile = '.github/agents/team-reviewer.agent.md';
const rulesFile = '.github/skills/team-review-rules/SKILL.md';
const routeFile = '.github/skills/copilot-concierge-routing/SKILL.md';

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'concierge-customization-guide-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function put(directory, relative, content) {
  await mkdir(path.dirname(path.join(directory, relative)), { recursive: true });
  await writeFile(path.join(directory, relative), content);
}

const guides = { 'references/custom-agents.md': agentFile, 'references/custom-skills.md': rulesFile, 'references/routing-charters.md': routeFile };

test('copyable guide examples match the starter and resolve through the actual custom checker', async t => {
  const directory = await fixture(t);
  for (const [guide, relative] of Object.entries(guides)) {
    const text = await readFile(path.join(root, guide), 'utf8');
    const snippets = [...text.matchAll(/<!-- example: ([^\n]+) -->\n```markdown\n([\s\S]*?)\n```/g)];
    assert.deepEqual(snippets.map(([, file]) => file), [relative], `${guide} has one copyable example`);
    const content = snippets[0][2] + '\n';
    assert.equal(content, await readFile(path.join(starter, relative), 'utf8'), `${relative} must match ${guide}`);
    await put(directory, relative, content);
  }
  const result = await checkRoots([directory]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.agents, ['team-reviewer']);
  assert.deepEqual(result.skills.sort(), ['copilot-concierge-routing', 'team-review-rules']);
  const { fields } = frontmatter(await readFile(path.join(directory, agentFile), 'utf8'));
  assert.equal(fields.model, 'gpt-6-luna');
  assert.equal(fields['model-policy'], 'required');
  assert.equal(fields['user-invocable'], 'false');
  assert.doesNotMatch(fields.tools, /\b(task|write_agent|ask_user|update_todo)\b/);
});

test('documented team-plugin conversion resolves namespaced agents and suffixed routing', async t => {
  const directory = await fixture(t);
  await put(directory, 'plugin.json', JSON.stringify({
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
    name: 'team-concierge-tools', version: '0.1.0',
  }));
  await put(directory, 'com.github.copilot/agents/team-reviewer.agent.md', await readFile(path.join(starter, agentFile)));
  await put(directory, 'skills/team-review-rules/SKILL.md', await readFile(path.join(starter, rulesFile)));
  const route = (await readFile(path.join(starter, routeFile), 'utf8'))
    .replace('name: copilot-concierge-routing\n', 'name: copilot-concierge-routing-team\n')
    .replace('| reviewer | team-reviewer |', '| reviewer | team-concierge-tools:team-reviewer |');
  await put(directory, 'skills/copilot-concierge-routing-team/SKILL.md', route);
  const result = await checkRoots([directory]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.agents, ['team-concierge-tools:team-reviewer']);
  assert.deepEqual(result.skills.sort(), ['copilot-concierge-routing-team', 'team-review-rules']);
  assert.equal(result.routing.length, 1);
});

test('README and the customization hub link every extension guide', async () => {
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  const hub = await readFile(path.join(root, 'references/customizing.md'), 'utf8');
  for (const guide of ['customizing.md', ...Object.keys(guides).map(file => path.basename(file))]) {
    assert.ok(readme.includes(`](references/${guide}`), `README links ${guide}`);
    if (guide !== 'customizing.md') assert.ok(hub.includes(`](${guide}`), `hub links ${guide}`);
  }
});

test('quick-start copy commands and expected checker output match the real checker', async t => {
  const hub = await readFile(path.join(root, 'references/customizing.md'), 'utf8');
  for (const file of [agentFile, path.dirname(rulesFile), path.dirname(routeFile)]) {
    assert.ok(hub.includes(`examples/customization-starter/${file.split(path.sep).join('/')}`), `quick start copies ${file}`);
  }
  // Run the actual CLI on a copy of the starter, as the quick start does.
  const directory = await fixture(t);
  for (const relative of [agentFile, rulesFile, routeFile]) await put(directory, relative, await readFile(path.join(starter, relative)));
  const output = execFileSync(process.execPath, [path.join(root, 'scripts/check-custom.mjs'), '.'], { cwd: directory, encoding: 'utf8' }).replace(/\\/g, '/');
  const expected = hub.match(/Expect:\n\n```text\n([\s\S]*?)\n```/)[1];
  assert.equal(output.trim(), expected);
});
