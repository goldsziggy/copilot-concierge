import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['distribution/marketplace.json', '.github/plugin/marketplace.json'];

// This is Zilot's deliberately small catalog shape, not a replacement for the
// host's complete marketplace schema. Relative source paths use repository root.
export function createCatalog(manifest) {
  if (manifest.name !== 'zilot') throw new Error('Expected plugin identity zilot.');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.version ?? '')) {
    throw new Error('plugin.json must declare a semantic version.');
  }
  if (typeof manifest.description !== 'string' || !manifest.description.trim() || manifest.description.length > 1024) {
    throw new Error('plugin.json must declare a nonempty description of at most 1024 characters.');
  }
  return {
    name: 'zilot',
    owner: { name: 'goldsziggy' },
    metadata: { description: 'Concierge Copilot: the native Zilot plugin for GitHub Copilot.' },
    plugins: [{
      name: manifest.name,
      source: './',
      version: manifest.version,
      description: manifest.description,
      repository: manifest.repository,
      strict: true,
    }],
  };
}

export function validateCatalog(catalog, manifest) {
  if (!isDeepStrictEqual(catalog, createCatalog(manifest))) {
    throw new Error('Catalog differs from the Zilot manifest or supported catalog shape. Run node distribution/catalog.mjs --write.');
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || !['--check', '--write'].includes(args[0] ?? '--check')) {
    throw new Error('Usage: node distribution/catalog.mjs [--check|--write]');
  }
  const manifest = JSON.parse(await readFile(resolve(root, 'plugin.json'), 'utf8'));
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  if (pkg.name !== manifest.name || pkg.version !== manifest.version) {
    throw new Error('package.json and plugin.json identities/versions must match.');
  }
  const expected = createCatalog(manifest);
  for (const target of targets) {
    const path = resolve(root, target);
    if (args[0] === '--write') {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, `${JSON.stringify(expected, null, 2)}\n`);
    } else {
      validateCatalog(JSON.parse(await readFile(path, 'utf8')), manifest);
    }
  }
  console.log(`Zilot ${manifest.version}: both marketplace catalogs ${args[0] === '--write' ? 'written' : 'valid and synchronized'}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
