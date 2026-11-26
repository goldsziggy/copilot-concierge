import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { ARTICLE_COUNT, CONCIERGE_SKILLS } from '../scripts/check-custom.mjs';

// Source contracts only: no model applies an Article here.
const read = async file => (await readFile(new URL(`../${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const dir = new URL('../skills/constitution/articles/', import.meta.url);

test('the constitution is ten numbered Articles, each with a rule, a trigger, actions and a check', async () => {
  const skill = await read('skills/constitution/SKILL.md');
  const files = (await readdir(dir)).sort();
  assert.equal(ARTICLE_COUNT, 10);
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
    /Small, clear work needs only Article 1 and Article 6, and no file read/,
    /name each Article that changed a decision and what it changed\. Name none that did not/,
    /Do not copy its text/,
  ]) assert.match(skill, pattern);
  // Asking less is scoped to full autonomy; guided stays the default.
  const attention = await read('skills/constitution/articles/10-guard-attention.md');
  assert.match(attention, /Under `full` autonomy, proceed on reversible work/);
  assert.match(attention, /Under `guided`, ask only what changes the outcome\. Hard stops are always asked/);
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
  assert.match(await read('skills/skill-builder/SKILL.md'), /A step may cite one of the constitution's ten Articles by number and title/);
  const guide = await read('references/constitution.md');
  for (let number = 1; number <= ARTICLE_COUNT; number++) assert.match(guide, new RegExp(`^\\| ${number} \\| `, 'm'));
});
