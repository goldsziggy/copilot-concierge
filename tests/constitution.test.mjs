import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { ARTICLE_COUNT, CONCIERGE_SKILLS } from '../scripts/check-custom.mjs';

// Source contracts only: no model applies an Article here.
const read = async file => (await readFile(new URL(`../${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const dir = new URL('../skills/constitution/articles/', import.meta.url);

test('the constitution is eleven numbered Articles, each with a rule, a trigger, actions and a check', async () => {
  const skill = await read('skills/constitution/SKILL.md');
  const files = (await readdir(dir)).sort();
  assert.equal(ARTICLE_COUNT, 11);
  assert.equal(files.length, ARTICLE_COUNT);
  const rows = [...skill.matchAll(/^\| (\d+) \| ([^|]+) \| ([^|]+) \| `articles\/([^`]+)` \|$/gm)];
  assert.deepEqual(rows.map(row => row[4]), files, 'the table lists the files in order');
  for (const [index, file] of files.entries()) {
    const text = (await readFile(new URL(file, dir), 'utf8')).replace(/\r\n/g, '\n');
    const [, number, title, rule] = text.match(/^# Article (\d+): (.+)\n\n(.+)\n\n## Applies when\n\n.+\n\n## Do\n\n(?:- .+\n)+\n## Check\n\n.+\n$/) ?? [];
    assert.equal(Number(number), index + 1, file);
    assert.ok(file.startsWith(`${String(index + 1).padStart(2, '0')}-`), file);
    // The table's one-line rule is the Article's own, so neither drifts.
    assert.equal(rows[index][2], title, file);
    assert.equal(rows[index][3], rule, file);
    assert.ok(Buffer.byteLength(text) < 1200, `${file} stays slim`);
  }
  assert.match(rows[0][2], /Keep It Simple, Stupid \(KISS\)/);
});

test('the constitution is judgment, never permission, and is reachable from the worker', async () => {
  const skill = await read('skills/constitution/SKILL.md');
  const worker = await read('com.github.copilot/agents/worker.agent.md');
  assert.ok(CONCIERGE_SKILLS.includes('constitution'));
  assert.match(worker, /\| Designing, changing or reviewing code beyond the fast path, or a step cites an Article \| `constitution` \|/);
  for (const pattern of [
    /The constitution is judgment, never permission/,
    /scope, plan approval, autonomy, file-write restrictions and Copilot's permissions come first/,
    /so do the repository's own instructions and conventions/,
    /An Article never justifies widening scope/,
    /Small, clear work needs only the three rules above, and no file read/,
    /name each Article that changed a decision and what it changed\. Name none that did not/,
    /Do not copy its text/,
  ]) assert.match(skill, pattern);
  // Asking less is scoped to full autonomy; guided stays the default.
  const attention = await read('skills/constitution/articles/10-guard-attention.md');
  assert.match(attention, /Under `full` autonomy, proceed on reversible work/);
  assert.match(attention, /Under `guided`, ask only what changes the outcome\. Hard stops are always asked/);
});

// The user's three working rules are stated verbatim and anchored to Articles.
test('the constitution embodies how to work: one system, smallest change, lean verification', async () => {
  const skill = await read('skills/constitution/SKILL.md');
  const how = skill.match(/## How to work\n([\s\S]*?)\n## Using it/)[1];
  assert.match(how, /\*\*One system at a time\.\*\* Finish it before opening the next\. \(Article 7\)/);
  assert.match(how, /\*\*Smallest change that works\.\*\* No speculative abstractions, no configuration for cases that do not exist, no framework before the second use\. \(Article 1\)/);
  assert.match(how, /\*\*Testing and verification: keep it lean\.\*\* Focus on business logic and not the machinery around it\./);
  assert.match(how, /do not verify for verification's sake\. \(Articles 6 and 11\)/);
  assert.match(how, /apply to everything, the fast path included/);
  const one = await read('skills/constitution/articles/01-keep-it-simple.md');
  assert.match(one, /^Make the smallest change that works\. No speculative abstractions, no configuration for cases that do not exist, no framework before the second use\.$/m);
  assert.match(await read('skills/constitution/articles/07-one-system-at-a-time.md'), /^One system at a time\. Finish it and check it before opening the next\.$/m);
  const enough = await read('skills/constitution/articles/11-enough-then-stop.md');
  for (const pattern of [
    /Read only what the change needs and verify only what could be wrong/,
    /Stop reading when you can name the change/,
    /cover the business logic \(rules, calculations, decisions\), not the machinery around it/,
    /Do not repeat a passing check or add a second check that proves the same thing/,
    /Would the result differ if you had skipped this read or this check\? If not, skip it/,
  ]) assert.match(enough, pattern);
  // The procedures the worker loads for code say the same, so the Article is not contradicted.
  assert.match(await read('skills/test/SKILL.md'), /Test the business logic you changed.+Do not write tests for the machinery around it/);
  const development = await read('skills/development/SKILL.md');
  assert.match(development, /One system at a time: finish it before opening the next/);
  assert.match(development, /Read what the change needs and stop; do not survey the repository/);
  assert.doesNotMatch(development, /tests for every behavior you change/);
  assert.match(await read('skills/constitution/articles/06-prove-it-works.md'), /more checks of the same thing add nothing/);
});

test('SOPs and the builder cite Articles by a number that exists', async () => {
  const procedures = new URL('../skills/sops/procedures/', import.meta.url);
  let cited = 0;
  for (const file of await readdir(procedures)) {
    for (const [, number] of (await readFile(new URL(file, procedures), 'utf8')).matchAll(/Article (\d+)/g)) {
      cited++;
      assert.ok(Number(number) >= 1 && Number(number) <= ARTICLE_COUNT, `${file} cites Article ${number}`);
    }
  }
  assert.ok(cited >= 5, 'bundled SOPs reuse the Articles');
  assert.match(await read('skills/skill-builder/SKILL.md'), /A step may cite one of the constitution's Articles by number and title/);
  const guide = await read('references/constitution.md');
  for (let number = 1; number <= ARTICLE_COUNT; number++) assert.match(guide, new RegExp(`^\\| ${number} \\| `, 'm'));
});
