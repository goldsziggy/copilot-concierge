#!/usr/bin/env node
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { copyPackage } from './lib/package.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let stage;
try {
  execFileSync(process.execPath, [path.join(root, 'scripts/validate.mjs')], { stdio: 'inherit' });
  stage = await mkdtemp(path.join(os.tmpdir(), 'zilot-release-'));
  await copyPackage(root, stage);
  const { version } = JSON.parse(await readFile(path.join(root, 'plugin.json'), 'utf8'));
  const destination = path.join(root, 'dist');
  await mkdir(destination, { recursive: true });
  const archive = path.join(destination, `zilot-${version}.zip`);
  // Refuse to overwrite a previous release accidentally; delete it explicitly to rebuild.
  execFileSync('python3', [path.join(root, 'scripts/archive.py'), stage, archive], { stdio: 'inherit' });
  const sha256 = createHash('sha256').update(await readFile(archive)).digest('hex');
  await writeFile(`${archive}.sha256`, `${sha256}  ${path.basename(archive)}\n`);
  console.log(JSON.stringify({ archive, sha256 }, null, 2));
} catch (error) { console.error(`Packaging failed: ${error.message}`); process.exitCode = 1; }
finally { if (stage) await rm(stage, { recursive: true, force: true }); }
