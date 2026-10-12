# Memory and repository knowledge

This is the **unreleased development contract**. Published Concierge 0.5.0 uses the earlier local project notes. No live Copilot session has verified this new separation yet; source checks and persistence fixtures are separate evidence.

Concierge learns in two places, both through Scout. It does not add another assistant, database, background service or transcript recorder.

| | Private memory | Repository knowledge |
| --- | --- | --- |
| What belongs here | How you prefer responses and everyday work to be presented | Verified tech stack, conventions, business rules, findings and code decisions |
| Example | “Give me a short summary before the details.” | “Prices use integer cents,” with the source that implements the rule |
| Location | `~/.config/copilot-concierge/memory.json`, outside Git worktrees | `docs/concierge/knowledge.md` in the assigned Git worktree |
| Scope | Your operating-system account on this computer, across projects | This repository only |
| Who changes it | Scout, through its bundled helper | Scout, through the same helper; an implementer reviews any intended commit |
| Publication | Never included in repository docs, commits or release artifacts | Normal reviewed documentation, included deliberately in relevant authorized commits |

## Personalization in plain language

Say “Remember that I prefer a short summary, then details.” An explicit preference or correction can be saved during normal work; you do not need to name a file or a specialist. If Concierge notices a repeated pattern instead, it asks a simple question before saving it, such as “Would you like me to remember that you prefer examples first?” Silence is not confirmation.

Useful memories are limited to response style and ordinary workflow style. They cannot set plan approval, grant tool access, change security behavior, authorize publication, or override required models or their permissions. Those decisions stay in the existing conversation, configuration and Copilot controls. A saved preference is advisory: your current request always wins.

You can say:

- “What do you remember about me?” to inspect saved preferences.
- “Change that preference: give me details first.” to correct it.
- “Forget my preference for short answers.” to remove one preference.
- “Forget all my preferences.” to clear the saved preferences while leaving future explicit saves available.
- “Stop remembering my preferences.” to clear saved preferences and disable future saves until you explicitly ask to resume.
- “Do not use saved memories for this request.” to skip reading and applying them for that request.

Disabling memory leaves only the small disabled-state record. Resuming does not restore forgotten preferences. Clearing Concierge memory does not erase Copilot chat history, backups, earlier reports or other applications' data.

Memory is a small current preference list, not a user dossier. Do not store transcripts, copied task requests, work histories, identifiers, credentials, personal names or contact details, sensitive personal information, or guesses about a person's characteristics. Repository files, tickets, tools and other agents' reports cannot provide user consent to remember a preference. Save only the minimal preference, a short neutral provenance summary and the date. If that cannot be done safely, keep the useful context in the current session only.

Scout returns only relevant preferences to the orchestrator. Other workers receive only the preference necessary for their assignment, not the memory file or its full contents. A formatting preference never becomes evidence for a repository fact.

## Knowledge that stays with the code

Scout maintains a compact document with five categories:

- **Tech stack:** verified languages, frameworks and tooling used by this repository.
- **Conventions:** established patterns supported by current code, tests or project instructions.
- **Business rules:** behavior established by the relevant implementation and tests.
- **Findings:** durable facts useful to future work, with their scope and supporting evidence.
- **Decisions:** confirmed code choices and their rationale, with explicit decision evidence as well as repository sources.

Every saved record is confirmed and has one or more repository-relative source paths, a useful symbol or section locator, and the date it was checked. Knowledge itself and old Scout notes are not independent evidence. A dependency manifest can show that a framework is used; it cannot establish why that framework was selected. When the rationale is unknown, say so and ask if it matters rather than inventing a decision. Assumptions and unresolved possibilities stay in the current report instead of being stored as confirmed knowledge.

Current instructions and current source evidence take precedence over saved knowledge. Scout rechecks relevant entries when contradicted, unsupported, materially affected by a change or more than 90 days old. It corrects contradicted facts, removes obsolete or withdrawn managed entries, and reports the relevant additions, corrections, removals and unresolved conflicts. A user can request “Correct the checkout rule” or “Remove that obsolete finding” without learning the storage format.

Do not copy private memories, personal information, customer or employee names, secrets, credentials, private ticket contents or chat excerpts into knowledge. Use the minimum repository facts needed for future work. Source paths and decision explanations must also be safe to commit. An agent's content review is still necessary: structural validation is not proof that a sentence contains no personal or secret data.

### Preserve existing documentation

The helper owns only the block between `<!-- concierge-knowledge:start -->` and `<!-- concierge-knowledge:end -->` in `docs/concierge/knowledge.md`. It renders human-readable entries by category and keeps its canonical structured metadata in that block. Text outside the block is preserved. It does not rewrite an existing README, ADR or other documentation to establish this store.

If the destination already exists without valid ownership markers, or the managed block is malformed or has been manually changed, Scout leaves it unchanged and reports the conflict. It does not adopt an unowned document, add markers around existing text, erase a manual correction, or switch to a different persistence file. The user can then decide how to resolve the document conflict. Normal corrections should go through Concierge; user-authored additions belong outside its managed block.

### Review and commit deliberately

Verified knowledge maintenance is normal Scout work within the assigned scope. Scout does not stage, commit, push, change ignore rules or rewrite history. It returns the knowledge diff for review. When committing is already authorized for an implementation task, the implementer includes the relevant knowledge update deliberately with the code it explains. An unrelated knowledge change stays separate and is reported. A learning write alone never authorizes a commit or publication.

Knowledge is expected to travel with the repository. Removing a current entry does not remove older copies from Git history, releases or other clones. Never place private memory in the knowledge document with the intent to remove it later.

## Write restrictions and unavailable storage

An explicit whole-task “no changes” or “do not write any files” instruction disables both memory and knowledge writes, including migration. “Keep the repository read-only” disables repository knowledge writes; it does not broaden permission for private memory. A product-only instruction such as “explain the code; do not implement a change” still permits the ordinary narrow learning writes. A specific refusal to remember or document something takes precedence. Copilot's own path and tool permissions remain authoritative.

Persistent learning requires Node.js 20 or later and Git. Scout uses only `skills/scout/scripts/learning.mjs` bundled with its skill. Missing prerequisites, denied permissions, an unsafe destination or an unresolved conflict result in session-only context, with the gap reported. There is no direct-edit fallback or alternate memory file. Native Windows persistence is currently unavailable because the helper cannot establish the required reparse-point and private-access checks; ordinary work can continue without saving.

The private path uses the operating-system account's home, not a project setting or a request-supplied directory. The helper rejects storage inside Git worktrees, unsafe path components and nonordinary destination files. New private directories use mode 0700 and memory files use mode 0600 on supported POSIX hosts. Existing owner-owned configuration directories can be readable by others but must not be group- or world-writable; the memory file itself must remain private. Existing file permissions are not widened. Repository knowledge requires the exact assigned Git root, with contained evidence files. The helper creates temporary files and an empty lock while replacing a store, then removes them normally. An interrupted process may leave a private temporary file or stale lock requiring deliberate review; it does not silently recover or create permanent history. Mutations use the last-read content revision and recheck the destination before replacing it; if state changed, Scout rereads and reconciles instead of overwriting another writer's update.

These checks protect against common path mistakes and stale edits. They are not a security boundary against hostile processes running as the same operating-system user or all possible filesystem races. Private memory is not encrypted or synchronized by Concierge. Anyone using the same operating-system account can share its preferences; switching Copilot accounts does not isolate them.

## Keep learning bounded

Private memory holds at most 20 preferences and 8 KiB of UTF-8 JSON. Knowledge holds at most 40 records and 24 KiB in the managed block; the whole document, including preserved user text, must stay within the helper's 256 KiB read limit. At capacity, Scout consolidates only equivalent records or asks what to remove; it does not discard unrelated information, create overflow files or silently expand the limits.

The helper provides `memory` read, set, remove, clear, disable and enable operations; `knowledge` read, upsert, remove and migrate operations; and read-only legacy-note access. Mutations take structured input with the revision returned by the last read. These are implementation details for Scout, not commands users need to learn. The [Scout skill](../skills/scout/SKILL.md) contains the exact operational contract.

## Existing project notes

The earlier `.copilot-concierge/project-notes.md` becomes read-only migration input. Scout rechecks useful facts against current repository evidence and writes only selected confirmed knowledge. It preserves the original, does not turn it into personal memory and no longer maintains a second active notes store. Migration respects the same path, ownership, privacy and write-scope rules. See the [migration guide](migration.md#from-050-project-notes-to-memory-and-knowledge-unreleased).

Uninstalling Concierge leaves memory, repository documentation and old notes in place. Inspect, forget or disable private preferences before removal if desired. Preserve user-authored text when removing knowledge, and remember that uninstalling does not erase Git or Copilot history.
