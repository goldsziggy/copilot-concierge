import { readdir, mkdir, readFile, writeFile, lstat, copyFile, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

export const PACKAGE_FILES = [
  '.github', '.gitignore', '.gitattributes', '.editorconfig', '.nvmrc', 'AGENTS.md', 'distribution',
  'plugin.json', 'package.json', 'README.md', 'CHANGELOG.md', 'LICENSE', 'NOTICE',
  'skills', 'references', 'com.github.copilot', 'examples', 'assets',
  'scripts/configure.mjs', 'scripts/launch.mjs', 'scripts/validate.mjs', 'scripts/package.mjs', 'scripts/release-check.mjs', 'scripts/check-custom.mjs',
  'scripts/archive.py', 'scripts/test.mjs', 'scripts/lib', 'tests',
];

async function canonicalPath(file) {
  try { return await realpath(file); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const parent = path.dirname(file);
    if (parent === file) throw error;
    return path.join(await canonicalPath(parent), path.basename(file));
  }
}

export async function copyEntry(source, destination) {
  const info = await lstat(source);
  if (info.isSymbolicLink()) throw new Error(`Package must not contain symbolic links: ${source}`);
  const origin = await realpath(source);
  const target = await canonicalPath(path.resolve(destination));
  if (target === origin || target.startsWith(origin + path.sep)) throw new Error('Package destination must not be inside source');
  if (info.isDirectory()) {
    await mkdir(destination, { recursive: true });
    for (const name of await readdir(source)) await copyEntry(path.join(source, name), path.join(destination, name));
  } else if (info.isFile()) {
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination, constants.COPYFILE_EXCL);
  } else throw new Error(`Unsupported package entry: ${source}`);
}

export async function copyPackage(source, destination) {
  for (const relative of PACKAGE_FILES) await copyEntry(path.join(source, relative), path.join(destination, relative));
}

export function configureProfile(content, filename, config) {
  const begin = '<!-- copilot-concierge:effective-config:start -->';
  const end = '<!-- copilot-concierge:effective-config:end -->';
  if (content.includes(begin)) {
    const at = content.indexOf(begin);
    if (content.indexOf(begin, at + begin.length) !== -1 || content.slice(at + begin.length).trimEnd().endsWith(end) === false) {
      throw new Error(`${filename}: malformed generated configuration block`);
    }
    content = content.slice(0, at).trimEnd() + '\n';
  }
  const role = { 'frontdesk.agent.md': 'frontdesk', 'orchestrator.agent.md': 'orchestrator', 'escalation.agent.md': 'escalation' }[filename] ?? 'specialist';
  const header = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!header) throw new Error(`${filename}: missing profile frontmatter`);
  if ((header[1].match(/^model:.*$/gm) ?? []).length !== 1) throw new Error(`${filename}: expected one authored model`);
  if (!/^(modelPolicy|model-policy):\s*["']?required["']?\s*$/m.test(header[1])) throw new Error(`${filename}: required model policy is missing`);
  const rewritten = header[0].replace(/^model:.*$/m, `model: ${JSON.stringify(config.value.models[role])}`) + content.slice(header[0].length);
  const policy = {
    planApproval: config.value.planApproval,
    planApprovalSource: config.source.planApproval,
    roleModel: config.value.models[role],
    roleModelSource: config.source.models[role],
  };
  return `${rewritten.trimEnd()}\n\n${begin}\n## Effective session configuration\n\n${JSON.stringify(policy, null, 2)}\n\nThis launch resolved the plan-approval preference from the user, project and session files and any task flag. The user's own words in this conversation still take precedence. Automatic plan approval never changes Copilot's tool permissions. Use the exact configured model; never substitute or use Auto.\n${end}\n`;
}

export async function configureProfiles(destination, config) {
  const agents = path.join(destination, 'com.github.copilot/agents');
  for (const filename of await readdir(agents)) {
    if (!filename.endsWith('.agent.md')) continue;
    const file = path.join(agents, filename);
    await writeFile(file, configureProfile(await readFile(file, 'utf8'), filename, config));
  }
  await writeFile(path.join(destination, 'effective-config.json'), JSON.stringify(config, null, 2) + '\n');
}
