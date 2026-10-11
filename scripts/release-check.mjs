#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const git = (...parameters) => execFileSync('git', parameters, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

try {
  let tag;
  let artifacts = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tag' && tag === undefined && args[i + 1]) tag = args[++i];
    else if (args[i] === '--artifacts' && !artifacts) artifacts = true;
    else throw new Error('Usage: node scripts/release-check.mjs --tag v<version> [--artifacts]');
  }
  if (!tag) throw new Error('An existing --tag v<version> is required; this check never creates tags');

  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const plugin = JSON.parse(await readFile(path.join(root, 'plugin.json'), 'utf8'));
  if (pkg.name !== 'zilot' || plugin.name !== 'zilot' || pkg.version !== plugin.version) {
    throw new Error('package.json and plugin.json must have matching zilot identity and version');
  }
  if (typeof pkg.version !== 'string' || !semver.test(pkg.version) || tag !== `v${pkg.version}`) {
    throw new Error('Tag must be v followed by the exact valid SemVer in package.json and plugin.json');
  }
  const commit = git('rev-parse', '--verify', `refs/tags/${tag}^{commit}`);
  if (commit !== git('rev-parse', '--verify', 'HEAD')) throw new Error('Release tag does not point to the checked-out commit');
  if (git('status', '--porcelain', '--untracked-files=normal')) throw new Error('Release source must be clean, including nonignored untracked files');

  const archive = `dist/zilot-${pkg.version}.zip`;
  let sha256;
  if (artifacts) {
    sha256 = createHash('sha256').update(await readFile(path.join(root, archive))).digest('hex');
    const checksum = await readFile(path.join(root, `${archive}.sha256`), 'utf8');
    if (checksum !== `${sha256}  ${path.basename(archive)}\n`) throw new Error('Release ZIP checksum does not match its SHA-256 file');
  }
  console.log(JSON.stringify({ tag, version: pkg.version, commit, archive, ...(sha256 && { sha256 }) }, null, 2));
} catch (error) {
  console.error(`Release check failed: ${error.message}`);
  process.exitCode = 1;
}
