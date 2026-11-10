import { extraDirectoryArguments } from './config.mjs';

// The launcher owns these native flags; a forwarded copy would silently change
// which agent, model or prompt the run uses.
const OWNED = ['--agent', '--model', '--plugin-dir', '--prompt', '--interactive', '-p', '-i'];
const RESULT = /CONCIERGE-RESULT:\s*`?(done|blocked|cancelled|needs_approval)\b/g;
export const MAX_TASK_BYTES = 16384;

// Split launcher arguments into the configuration options that configure.mjs
// understands, an optional one-shot task, and native flags after `--` that the
// person running the job chose to forward. Nothing is forwarded implicitly.
export function parseLaunchArguments(argv) {
  const separator = argv.indexOf('--');
  const own = separator < 0 ? argv : argv.slice(0, separator);
  const forwarded = separator < 0 ? [] : argv.slice(separator + 1);
  const configure = [];
  let task;
  let taskFile;
  for (let i = 0; i < own.length; i++) {
    if (own[i] === '--task' || own[i] === '--task-file') {
      if (task !== undefined || taskFile !== undefined) throw new Error('Give one task: --task TEXT or --task-file FILE, once');
      if (own[i + 1] === undefined) throw new Error(`Incomplete option: ${own[i]}`);
      if (own[i] === '--task') task = own[++i];
      else taskFile = own[++i];
    } else configure.push(own[i]);
  }
  if (task !== undefined && !task.trim()) throw new Error('--task must not be empty');
  const oneShot = task !== undefined || taskFile !== undefined;
  if (forwarded.length && !oneShot) throw new Error('Native flags after -- are forwarded only with --task or --task-file');
  for (const flag of forwarded) {
    if (OWNED.some(owned => flag === owned || flag.startsWith(`${owned}=`))) throw new Error(`The launcher sets ${flag.split('=')[0]} itself; do not forward it`);
  }
  // Prompts can ask an agent not to loop; only the host's spend cap guarantees
  // it. An unattended run without one is refused rather than given a default.
  if (oneShot && !forwarded.some(flag => flag === '--max-ai-credits' || flag.startsWith('--max-ai-credits='))) {
    throw new Error('An unattended run needs a spend cap: forward --max-ai-credits N after --');
  }
  return { configure, task, taskFile, forwarded, oneShot };
}

// Full autonomy disables the question tool at the host as well as in the
// profiles. Permission flags are never added here: a one-shot run gets only the
// ones forwarded by whoever started it.
export function nativeArguments(configured, { task, forwarded = [] } = {}) {
  const args = [
    '--no-auto-update', '--plugin-dir', configured.pluginDirectory,
    ...extraDirectoryArguments(configured.value.extraDirectories),
    '--agent', 'copilot-concierge:concierge', '--model', configured.value.models.concierge,
  ];
  if (configured.value.autonomy === 'full') args.push('--no-ask-user');
  if (task !== undefined) args.push('-p', task, ...forwarded);
  return args;
}

// Exit status for a one-shot run: the child's own failure wins; otherwise the
// last CONCIERGE-RESULT line decides. A run with no result line is not a success.
export function resultExitCode(output, childCode) {
  if (childCode) return { code: childCode, status: 'host-error' };
  const status = [...output.matchAll(RESULT)].at(-1)?.[1];
  if (status === 'done') return { code: 0, status };
  if (status) return { code: 2, status };
  return { code: 3, status: 'unknown' };
}
