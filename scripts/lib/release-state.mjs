import { execFileSync } from 'node:child_process';

// Git-based installation distributes tracked source outside the ZIP allowlist.
// An ignore rule alone cannot protect local state that was already tracked.
// The memory store belongs outside every Git worktree. These exact paths also
// protect accidental repository-local copies without hiding ordinary project files.
const localStatePaths = [
  '.copilot-concierge/project-notes.md',
  '.copilot-concierge/memory.json',
  '.config/copilot-concierge/memory.json',
];

export function assertNoTrackedLocalState(root) {
  const tracked = execFileSync('git', ['ls-files', '-z', '--', ...localStatePaths], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).split('\0').filter(Boolean);
  if (tracked.length) {
    throw new Error(`Private local state must not be tracked for release: ${tracked.join(', ')}. Untrack the file without deleting the local copy before releasing.`);
  }
}
