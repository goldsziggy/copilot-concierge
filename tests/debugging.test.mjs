import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CONCIERGE_SKILLS } from '../scripts/check-custom.mjs';

test('debugging is a role-neutral bounded procedure with causal and regression evidence', async () => {
  const text = await readFile(new URL('../skills/debugging/SKILL.md', import.meta.url), 'utf8');
  for (const pattern of [
    /^name: debugging$/m,
    /Your agent profile determines identity/,
    /a specialist remains a leaf/,
    /diagnosis-only request remains read-only/,
    /expected versus observed behavior/,
    /disconfirming observation/,
    /Do not call correlation a root cause/,
    /actual effects are reconciled/,
    /regression check that fails on the known-bad behavior/,
    /including after subsequent edits/,
    /self-checking cannot supply independence/,
    /Do not claim resolution from a successful build alone/,
  ]) assert.match(text, pattern);
  assert.doesNotMatch(text, /\]\((?:\.\.\/|\/)/, 'skill is self-contained');
  assert.ok(CONCIERGE_SKILLS.includes('debugging'));
  assert.ok(CONCIERGE_SKILLS.includes('task-evaluation'));
});
