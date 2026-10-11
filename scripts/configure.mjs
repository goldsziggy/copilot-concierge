#!/usr/bin/env node
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadConfig } from './lib/config.mjs';
import { copyPackage, configureProfiles } from './lib/package.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const names = { '--project': 'project', '--user-config': 'userConfig', '--project-config': 'projectConfig', '--session-config': 'sessionConfig', '--plan-approval': 'planApproval', '--output-parent': 'outputParent' };
const options = {};
try {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Configure a fresh session-local plugin copy. No installation or model calls.\n\nnode scripts/configure.mjs [--project DIR] [--user-config FILE] [--project-config FILE]\n  [--session-config FILE] [--plan-approval ask|auto] [--output-parent DIR] [--print-only]\n\nFiles default to ~/.config/zilot/config.json and PROJECT/.zilot/config.json.\nMissing defaults inherit. Explicit missing files and invalid settings fail.\nGenerated files default to .generated/session-* under this package.');
  } else {
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--print-only') { options.printOnly = true; continue; }
      const key = names[args[i]];
      if (!key || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Unknown or incomplete option: ${args[i]}`);
      if (Object.hasOwn(options, key)) throw new Error(`Repeated option: ${args[i]}`);
      options[key] = args[++i];
    }
    const config = await loadConfig(options);
    if (options.printOnly) console.log(JSON.stringify(config, null, 2));
    else {
      const parent = path.resolve(options.outputParent ?? path.join(root, '.generated'));
      await mkdir(parent, { recursive: true });
      const destination = await mkdtemp(path.join(parent, 'session-'));
      try {
        await copyPackage(root, destination);
        await configureProfiles(destination, config);
        console.log(JSON.stringify({ pluginDirectory: destination, ...config, next: 'Load this directory with copilot --plugin-dir, or use scripts/launch.mjs.' }, null, 2));
      } catch (error) { await rm(destination, { recursive: true, force: true }); throw error; }
    }
  }
} catch (error) {
  console.error(`Configuration failed: ${error.message}`);
  process.exitCode = 1;
}
