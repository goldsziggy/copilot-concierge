# Plan approval preference

Plan approval is the pause between Concierge's short plan and the work. It is a workflow preference only: Copilot's own tool, path and URL permissions always stay in force, and `auto` never turns them off.

| Value | Behavior |
| --- | --- |
| `ask` (default) | Show the plan and ask "Approve this plan?" with Approve / Change something / Cancel. Only an explicit choice approves. |
| `auto` | Show the plan, say where `auto` came from, and continue within the requested scope. |

The nearest setting wins:

1. The user's words for this request ("go ahead without asking", "ask me first").
2. The user's words earlier in this session, or a launcher `--session-config` file.
3. The project file `.copilot-concierge/config.json`.
4. The user file `~/.config/copilot-concierge/config.json`.
5. The default, `ask`.

The scout reads the project file during context gathering, and the user file only if the project file sets nothing. When `scripts/launch.mjs` starts the session, it resolves the files and any `--plan-approval` flag in advance and writes the result into the profiles.

A materially larger scope gets a revised plan and the preference again. Question-only and planning-only requests stop before implementation. Invalid values in a file are configuration errors reported by the launcher, never an implicit `auto`.

In the unreleased development version, Scout may save an explicitly stated personal preference or maintain verified repository knowledge during normal research before product implementation approval. These are narrow learning writes, not permission to change product files. Saying “just explain the code; do not implement a change” does not by itself disable learning. Saying “do not write any files” or “no changes” disables both memory and knowledge writes. A repository-only restriction, such as “keep the repository read-only,” disables knowledge writes; it does not broaden or change the rules for private memory. A specific refusal to remember or document something takes precedence. See [memory and knowledge](memory-and-knowledge.md).

Memory does not store plan approval, tool permissions, security preferences or model permissions. Existing conversation/configuration precedence above remains authoritative. Saving a preference cannot grant approval, and `auto` never overrides an explicit no-write instruction. Private memory may be inspected when permitted even if writes are disabled; “do not use saved memories” also disables reading and applying them for the request.

Verified knowledge updates are reported and reviewed like other documentation changes. They may be included deliberately in a relevant commit only when committing is authorized. Scout does not stage, commit, push or alter ignore rules.

Ship it has a separate decision. Accepting its offer permits read-only preflight only; creating a draft PR/MR needs explicit confirmation of the exact publication proposal. Plan approval, `auto`, an earlier go-ahead and Copilot tool permission do not supply that confirmation. See [Ship it decisions](handoff.md#optional-ship-it-decisions).
