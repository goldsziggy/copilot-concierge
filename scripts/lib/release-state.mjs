import { execFileSync } from 'node:child_process';

// Git-based installation distributes tracked source outside the ZIP allowlist.
// An ignore rule alone cannot protect a note that was already tracked.
export function assertNoTrackedLocalState(root) {
  const tracked = execFileSync('git', ['ls-files', '-z', '--', '.copilot-concierge/project-notes.md'], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).split('\0').filter(Boolean);
  if (tracked.length) {
    throw new Error(`Local Scout notes must not be tracked for release: ${tracked.join(', ')}. Untrack the file without deleting the local copy before releasing.`);
  }
}
