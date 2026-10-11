import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DEFAULTS } from '../scripts/lib/config.mjs';

const agents = fileURLToPath(new URL('../com.github.copilot/agents/', import.meta.url));

async function profiles() {
  const result = {};
  for (const file of await readdir(agents)) {
    if (!file.endsWith('.agent.md')) continue;
    const text = (await readFile(path.join(agents, file), 'utf8')).replace(/\r\n/g, '\n');
    const header = text.match(/^---\n([\s\S]*?)\n---\n/)[1];
    const value = key => header.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1];
    result[value('name')] = { model: value('model'), policy: value('model-policy'), tools: value('tools'), header, body: text.slice(header.length) };
  }
  return result;
}

// Regression: in Copilot CLI 1.0.93 a nested agent receives only tools that its
// parent agent also has. A control-only orchestrator left every specialist
// without `view`, so the scout could not read its fixture.
test('orchestrator passes specialist tools through instead of narrowing them', async () => {
  const { orchestrator } = await profiles();
  assert.equal(orchestrator.tools, undefined);
  assert.match(orchestrator.body, /The only tools you call are `task`, `read_agent`, `write_agent`, `list_agents`, `update_todo` and `skill`/);
  assert.match(orchestrator.body, /does not apply to you/);
});

test('front desk is control-only; the root list does not restrict its children', async () => {
  const { frontdesk } = await profiles();
  const tools = frontdesk.tools.replace(/[[\]\s]/g, '').split(',');
  assert.deepEqual(tools.sort(), ['ask_user', 'list_agents', 'read_agent', 'task', 'update_todo', 'write_agent']);
});

test('every role pins exactly one required model; no silent fallback list', async () => {
  const all = await profiles();
  assert.equal(Object.keys(all).length, 10);
  for (const [name, profile] of Object.entries(all)) {
    assert.equal(profile.policy, 'required', name);
    assert.doesNotMatch(profile.model, /^\[|,|auto/i, `${name} must not list fallback models`);
  }
  assert.equal(all.frontdesk.model, DEFAULTS.models.frontdesk);
  assert.equal(all.orchestrator.model, DEFAULTS.models.orchestrator);
  assert.equal(all.escalation.model, DEFAULTS.models.escalation);
  for (const leaf of ['scout', 'product-manager', 'enterprise-ux', 'react-frontend', 'node-backend', 'graphql', 'reviewer']) {
    assert.equal(all[leaf].model, DEFAULTS.models.specialist, leaf);
  }
});

test('specialists cannot dispatch agents or own the task list through their tool lists', async () => {
  const all = await profiles();
  for (const [name, profile] of Object.entries(all)) {
    if (['frontdesk', 'orchestrator'].includes(name) || !profile.tools) continue;
    assert.doesNotMatch(profile.tools, /\b(task|read_agent|write_agent|list_agents|update_todo|ask_user)\b/, name);
    // Host tool names differ by model family; list both so neither is dropped.
    assert.match(profile.tools, /\bview\b/, name);
    assert.match(profile.tools, /\brg\b.*\bgrep\b/, name);
  }
});

// Regression: unquoted 'Internal to Zilot: ...' descriptions made the YAML
// invalid, and Copilot dropped every internal agent ("Unknown agent_type").
test('frontmatter values containing ": " are quoted so Copilot can parse them', async () => {
  for (const [name, profile] of Object.entries(await profiles())) {
    for (const line of profile.header.split('\n')) {
      const value = line.match(/^[a-z-]+: (.*)$/)?.[1];
      if (value && /: | #/.test(value)) assert.match(value, /^["'[]/, `${name}: ${line}`);
    }
  }
});

test('reports carry a handover a fresh orchestrator can continue from', async () => {
  const { orchestrator } = await profiles();
  for (const field of ['request', 'follow-ups', 'decisions', 'done', 'open', 'sources']) {
    assert.match(orchestrator.body, new RegExp(`^- ${field}: `, 'm'), field);
  }
  assert.match(orchestrator.body, /objective: <objective name from the brief>/);
  assert.match(orchestrator.body, /`ROLLOVER`/);
  assert.match(orchestrator.body, /`RESUMED`/);
});

test('front desk tracks several orchestrators and rolls long ones over', async () => {
  const { frontdesk } = await profiles();
  assert.match(frontdesk.body, /several can work at the same time/);
  assert.match(frontdesk.body, /`list_agents` with `scope: "children"`/);
  assert.match(frontdesk.body, /has reported `done` or `blocked`, has reached 10 turns/);
  assert.match(frontdesk.body, /Never roll over for answers, approvals or `CONTINUE`/);
  assert.match(frontdesk.body, /ROLLOVER from <old name>: continue from the handover/);
  assert.match(frontdesk.body, /earlier context: <the old report's handover block, copied verbatim>/);
  assert.match(frontdesk.body, /never erases another objective's items|so one report never erases another objective's items/);
});

// Regression: the front desk once wrote "go ahead (implementation explicitly
// requested)" for an ordinary change request, and Sol skipped plan approval.
test('plan approval is never inferred from an ordinary request', async () => {
  const { frontdesk, orchestrator } = await profiles();
  assert.match(frontdesk.body, /is not a statement about plan approval; never infer one/);
  assert.match(orchestrator.body, /only words that clearly waive or require approval count/);
});

test('orchestrator follows a customer zilot-routing skill without changing its rules', async () => {
  const { orchestrator } = await profiles();
  assert.match(orchestrator.body, /lists `zilot-routing` or skills named `zilot-routing-<something>`, load them before choosing specialists/);
  assert.match(orchestrator.body, /Routing changes who does the work, never the rules/);
});
