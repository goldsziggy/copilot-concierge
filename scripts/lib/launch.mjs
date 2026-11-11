import { extraDirectoryArguments } from './config.mjs';

// The launcher owns these native flags; a forwarded copy would silently change
// which agent, model, prompt or result format the run uses.
const OWNED = ['--agent', '--model', '--plugin-dir', '--prompt', '--interactive', '--output-format', '--silent', '--no-color', '--color', '--no-ask-user', '-p', '-i', '-s'];
const OTHER_MODES = ['--help', '-h', '--version', '-v', '--acp', '--server', '--headless'];
const RESULT = /^CONCIERGE-RESULT:[ \t]+(`?)(done|blocked|cancelled|needs_approval)\1[ \t]+([^\s`<>]{1,256})[ \t]*$/;
const MAX_RESULT_LINE = 65536;
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
    const owned = OWNED.find(option => flag === option || flag.startsWith(`${option}=`) || (option.length === 2 && flag.startsWith(option)));
    if (owned) throw new Error(`The launcher sets ${owned} itself; do not forward it`);
    if (OTHER_MODES.some(option => flag === option || flag.startsWith(`${option}=`))) throw new Error(`A one-task run cannot forward ${flag.split('=')[0]}`);
  }
  // Require an explicit host budget. Copilot documents this as a soft
  // per-response limit, not a guaranteed ceiling for the whole job.
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
  if (task !== undefined) args.push('--silent', '--output-format', 'text', '--no-color', '-p', task, ...forwarded);
  return args;
}

// Track the last nonblank line with bounded memory, including fenced examples
// that start before the end of a long answer. Only a complete, unfenced final
// record is a result; a quoted or earlier marker never establishes success.
export function createResultTracker() {
  let line = '';
  let oversized = false;
  let fence;
  let status;

  function finishLine() {
    const text = line.replace(/\r$/, '');
    if (oversized || text.trim()) {
      status = undefined;
      const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text);
      if (fence) {
        if (!oversized && delimiter && delimiter[1][0] === fence.character && delimiter[1].length >= fence.length && !delimiter[2].trim()) fence = undefined;
      } else if (delimiter) {
        fence = { character: delimiter[1][0], length: delimiter[1].length };
      } else if (!oversized) {
        status = RESULT.exec(text)?.[2];
      }
    }
    line = '';
    oversized = false;
  }

  return {
    write(chunk) {
      const pieces = chunk.split('\n');
      for (let index = 0; index < pieces.length; index++) {
        if (index) finishLine();
        const remaining = MAX_RESULT_LINE - line.length;
        line += pieces[index].slice(0, remaining);
        if (pieces[index].length > remaining) oversized = true;
      }
    },
    finish(childCode) {
      finishLine();
      if (childCode) return { code: childCode, status: 'host-error' };
      if (status === 'done') return { code: 0, status };
      if (status) return { code: 2, status };
      return { code: 3, status: 'unknown' };
    },
  };
}

export function resultExitCode(output, childCode) {
  const tracker = createResultTracker();
  tracker.write(output);
  return tracker.finish(childCode);
}
