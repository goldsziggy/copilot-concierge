# Plan approval preference

Plan approval is the pause between Concierge's short plan and the work. It is a workflow preference only: Copilot's own tool, path and URL permissions always stay in force, and `auto` never turns them off.

| Value | Behavior |
| --- | --- |
| `ask` (default) | Show the plan and ask "Approve this plan?" with Approve / Change something / Cancel. Only Approve authorizes the displayed plan. |
| `auto` | Show the plan, say where `auto` came from, and continue within the requested scope. |

The nearest setting wins:

1. The user's words for this request ("go ahead without asking", "ask me first").
2. The user's words earlier in this session, or a launcher `--session-config` file.
3. The project file `.copilot-concierge/config.json`.
4. The user file `~/.config/copilot-concierge/config.json`.
5. The default, `ask`.

The scout reads the project file during context gathering, and the user file only if the project file sets nothing. When `scripts/launch.mjs` starts the session, it resolves the files and any `--plan-approval` flag in advance and writes the result into the profiles.

A materially larger scope gets a revised plan and the preference again. Question-only and planning-only requests stop before implementation. Invalid values in a file are configuration errors reported by the launcher, never an implicit `auto`.

## What the approval looks like

The orchestrator uses plain text with `Plan`, `Scope`, `Steps`, `Checks` and optional `Watch-outs`, separated by blank lines. Plans aim for about 120 words and 3–5 short numbered steps where appropriate; material scope and risks take priority over length. Actions and checks are concrete, and publishing, deployment, deletion or other consequential actions are explicit. Blocking questions are resolved through `needs_input` first.

Concierge preserves labels, numbering and line breaks. It includes the plan in the existing `ask_user` question when supported, or displays it immediately before the short question. It does not require tables, cards or new tool fields. For example:

```text
Plan: Make basket quantity errors understandable.

Scope: Basket form and its tests. Keep checkout and pricing unchanged.

Steps:
1. Check the existing validation and error styles.
2. Add an inline quantity error using those styles.
3. Test invalid quantities and a successful basket update.

Checks: Invalid quantities show an error; valid updates still work; focused tests pass.

Watch-outs: Preserve keyboard focus and existing screen-reader announcements.

Approve this plan?
Approve
Change something
Cancel
```

With `ask`, the decision always belongs to the displayed plan:

| Response or condition | Expected handling |
| --- | --- |
| Approve | Relay `PLAN DECISION: Approve`; proceed only with the displayed plan's scope. |
| Change something | Relay `PLAN DECISION: Change something` and the user's exact text; keep implementation unapproved and clarify missing details through `needs_input`. |
| Revised plan | Identify what changed, show the complete revised plan and request a new approval. Earlier approval does not carry over. |
| Cancel | Relay `PLAN DECISION: Cancel`; stop dispatching, stop running workers cooperatively and report cancellation. |
| Missing or ambiguous answer | Clarify and wait; no approval is inferred. |
| `ask_user` unavailable | Show the same structured plan, question and all three choices in the reply; end the turn and wait. Apply the same decision rules to the reply. |

For a revision, the Scope line could be `Scope: Changed from the previous plan: also cover the mobile basket. Keep checkout and pricing unchanged.` The rest of the plan, including updated steps and checks, is shown again. A publishing example must name the action, such as `Steps: ... publish the approved version to the existing marketplace`, and its observable check, such as a public release with matching assets. This formatting does not replace Ship it's separate publication confirmation below.

These are instruction contracts. `tests/approval-format.test.mjs` checks both profiles and the example; it does not demonstrate model compliance or actual host rendering. See [runtime verification](runtime-verification.md) for observed host evidence and remaining limits.

## Learning and separate permissions

Scout may save an explicitly stated personal preference or maintain verified repository knowledge during normal research before product implementation approval. These are narrow learning writes, not permission to change product files. Saying “just explain the code; do not implement a change” does not by itself disable learning. Saying “do not write any files” or “no changes” disables both memory and knowledge writes. A repository-only restriction, such as “keep the repository read-only,” disables knowledge writes; it does not broaden or change the rules for private memory. A specific refusal to remember or document something takes precedence. See [memory and knowledge](memory-and-knowledge.md).

Memory does not store plan approval, tool permissions, security preferences or model permissions. Existing conversation/configuration precedence above remains authoritative. Saving a preference cannot grant approval, and `auto` never overrides an explicit no-write instruction. Private memory may be inspected when permitted even if writes are disabled; “do not use saved memories” also disables reading and applying them for the request.

Verified knowledge updates are reported and reviewed like other documentation changes. They may be included deliberately in a relevant commit only when committing is authorized. Scout does not stage, commit, push or alter ignore rules.

Ship it has a separate decision. Accepting its offer permits read-only preflight only; creating a draft PR/MR needs explicit confirmation of the exact publication proposal. Plan approval, `auto`, an earlier go-ahead and Copilot tool permission do not supply that confirmation. See [Ship it decisions](handoff.md#optional-ship-it-decisions).
