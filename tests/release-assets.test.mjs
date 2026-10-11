import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, mkdir, writeFile, access, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { copyPackage } from '../scripts/lib/package.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('release copies include the logo and Apache license and exclude local state and legacy outputs', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'copilot-concierge-release-assets-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const source = path.join(temporary, 'source');
  const output = path.join(temporary, 'output');
  await copyPackage(root, source);
  await writeFile(path.join(source, '.env'), 'EXAMPLE_TOKEN=not-a-real-secret\n');
  for (const directory of ['bench/results', '.git', '.generated/session-example', 'verification/raw']) {
    await mkdir(path.join(source, directory), { recursive: true });
    await writeFile(path.join(source, directory, 'excluded.txt'), 'synthetic local state\n');
  }
  await copyPackage(source, output);
  const logo = 'assets/concierge-copilot.png';
  assert.deepEqual(await readFile(path.join(output, logo)), await readFile(path.join(root, logo)));
  assert.match(await readFile(path.join(output, 'README.md'), 'utf8'), /\]\(assets\/concierge-copilot\.png\)/);
  for (const file of ['LICENSE', 'NOTICE']) {
    assert.deepEqual(await readFile(path.join(output, file)), await readFile(path.join(root, file)));
  }
  assert.match(await readFile(path.join(output, 'LICENSE'), 'utf8'), /Apache License[\s\S]*Version 2\.0, January 2004/);
  for (const file of ['plugin.json', 'package.json']) {
    assert.equal(JSON.parse(await readFile(path.join(output, file), 'utf8')).license, 'Apache-2.0');
  }
  for (const excluded of ['.env', 'bench', '.git', '.generated', 'verification']) {
    await assert.rejects(access(path.join(output, excluded)), { code: 'ENOENT' });
  }
});
