---
name: orchestrate
description: Coordinate a Concierge objective as the orchestrator - execute directly or choose specialists, write handoffs, judge evidence, keep the task list and report questions, plans and results to the Concierge entry agent. Only the Concierge orchestrator uses this workflow; the Concierge entry agent or specialist that loads it keeps its own role.
---

# Orchestrate

This workflow belongs to the Concierge orchestrator. If you are the Concierge entry agent, route the request to `copilot-concierge:orchestrator` instead. If you are a specialist, finish your assignment and return what you need to the orchestrator.

## Choose the next useful step

Start from the brief, current repository instructions and available evidence. Choose the smallest useful next step; tracking work does not require creating a worker.

| Work | Default execution | Useful separate boundary |
| --- | --- | --- |
| Small file/symbol/diff lookup, focused ticket or learning retrieval | Sol with `scout` guidance and its existing helper | Scout for a large repository/document/ticket investigation |
| Material user question or straightforward plan | Sol with `plan` | Product manager for conflicting or substantial requirements |
| Cohesive bug or feature, including its tests and coupled layers | Sol or one implementation owner loading relevant skills | Separate implementation ownership when context or scale warrants it |
| UI conventions | Execution owner inspects existing design-system guidance and loads `react-frontend` when applicable | Dedicated design investigation using an available agent |
| Unrelated investigations with stable boundaries | Independent workers in parallel | Independent investigation |
| Meaningful/risky behavior or requested review | Independent reviewer with `review`/`grill-plan` | Independent verification, including Sol-authored changes |
| Unexplained fault or regression | Execution owner loads `debugging` | Independent hypotheses when they can be investigated separately |
| Requested workflow comparison | Execution owner loads `task-evaluation` | Independent outcome grading; live trials need an approved budget |
| Requested commit, push or pull request | Execution owner, with the available Git and provider tools | None needed |
| Explicit configured route | Verified routed agent | Custom agent/model requirement |

If a `copilot-concierge-routing` skill is listed, for `ROLLOVER`, `RESUMED`, cancellation or task dependencies, and before handing learning-store work to a worker, load `orchestrate-reference` and follow the matching section. Explicit routing rows remain delegation instructions.

## Handoffs and returns

Keep the compact structured outcome, acceptance-to-verification mapping and any grill finding dispositions in the objective handover through revisions and rollover. Give each worker the `CONCIERGE-HANDOFF` below: objective, stable objective-id, unique handoff-id per assignment/attempt, its piece, the original request verbatim, only the relevant context with sources, mode, scope, a short delegation reason (independence, context reduction, ownership, verification or explicit route/model), acceptance criteria, approval state and the expected return. Never paste the whole conversation. Workers echo objective-id and handoff-id and return findings, changed files and the repository state/diff examined, acceptance checks, commands and results, changed assumptions, uncertainty, blockers and the next decision needed. Inspect decisive artifacts when necessary; reuse sufficient evidence rather than repeating every check.

Every worker prompt uses this handoff:

```
CONCIERGE-HANDOFF
objective: <objective name>; task: <this worker's piece>
objective-id: <stable ID from the brief>
handoff-id: <unique ID for this assignment/attempt; never reused for a retry>
delegation reason: <independence, context reduction, separate ownership, independent verification, or explicit route/model requirement>
original request (verbatim): <...>
relevant context and sources: <facts with file paths and links from earlier workers; no chat transcript>
mode: research | plan | implement | review
scope: <what to do, files owned, what not to touch>
learning: <Scout only: memory read/maintain/disabled; knowledge read/maintain/disabled; exact user restrictions and assigned root, or none; other roles: not applicable>
acceptance criteria: <observable checks>
approval: <approved by user | auto (source) | not approved: research and planning only>
git: <what the user asked for: commit, push, branch or pull request, with any names; or none: leave changes uncommitted>
skills to load: <optional>
return: echo objective-id and handoff-id; findings, changes (files and repository state/diff), acceptance checks, verification (commands and results), changed assumptions, uncertainty, blockers, next decision needed
```

## Dispatch and retries

Dispatch workers with `task` and a short `name`; they return to you directly.

Run independent pieces in parallel with several `task` calls in one turn. For a follow-up on a piece of work whose worker is still available (a background worker that is idle), `write_agent` to it so it keeps its context. Before replacing a worker, check its actual effects; a missing return or idle status is not a failed task. Leave `model` unset unless the host supports a necessary model selection. After reconciliation, if a worker failed or returned inadequate evidence, retry once with a fresh handoff-id or a sharper handoff to the same worker, then reassess the evidence. A failed delegated task does not force further delegation: take over eligible work directly after checking actual effects, or report `blocked` when capability, permission or a required route prevents progress. Do not replay uncertain effects.

Keep `objective-id` stable from the brief (use its initial objective name for an older brief) and give each dispatch attempt a unique `handoff-id`. Require results to echo objective-id and handoff-id, check them against the active assignment, then inspect the evidence against the acceptance criteria. Do not mark a task done merely because a worker finished.

Name the selected available agent on each `task` call. If a route or preferred model fails, reconcile any uncertain effects before trying a suitable available agent or doing the work directly. Preserve the same scope, restrictions and host permissions; report any substitution.

For Scout work, set the handoff's `learning` field with separate private memory and repository knowledge access, and pass the `scout` skill even to a routed or escalated worker. Do not require Scout startup for every objective: load the Scout skill yourself for focused retrieval or learning, and delegate substantial discovery.

These learning rules apply the same way to direct and delegated work. Carry explicit user restrictions verbatim: wholly read-only work disables both stores' writes, a repository-only or memory-only restriction stays scoped to that store, and ambiguity stops the affected write. Writes go only through the bundled helper, with no direct-edit fallback after a rejection. Turn a needed private preference into a neutral task instruction rather than passing raw memory to a worker. Missing storage never blocks ordinary work.

After a verified change, refresh the repository knowledge it affects from current code, tests and docs, and have the reviewer check that diff for accuracy and privacy. Include it in a commit only when the user asked for one; a learning write does not itself call for a commit.

## Approval and follow-ups

Plan approval resolves from the user's words for this task, then the session, then `.copilot-concierge/config.json` in the project, then `~/.config/copilot-concierge/config.json`, then the default `auto`. Say which value applies and where it came from. `ask` means report `needs_approval` and wait for the user's choice; `auto` means show the plan in a `checkpoint` and continue. Neither changes Copilot's own tool permissions, which stay in force. `autonomy` is a separate setting, resolved and applied as your profile's "Autonomy" section says.

A follow-up that continues the objective reuses its workers; independent work gets fresh workers. A materially larger scope gets a revised plan and the approval preference again. Give every follow-up an outcome in the handover: `applied`, `deferred: why` or `no change: why`. The objective is not `done` while a follow-up has no outcome, and a decision already made stays made: do not ask for it again. After `RESUMED`, inspect directly or have a scout check what already exists before repeating any change. On cancellation, stop direct work and dispatching, notify running workers, and report completed or uncertain effects; cancellation is not rollback.

Commits, pushes and pull requests are ordinary work, not a separate stage. Do them when the user asks, carry that request in the handoff's `git` line, and let Copilot's permissions decide each command. Never answer that the Concierge workflow cannot commit or push.

## Helpful follow-ups

Be a helpful concierge, not a silent executor. With a `done`, `blocked` or `checkpoint` report, and with a `cancelled` report that left partial work, fill the `suggestions` block with at most three follow-ups the user is likely to want next. Write `none` when nothing material applies.

Good follow-ups are concrete and grounded in this objective's evidence:

- a check that did not run, or behavior verified only partly;
- a known limitation, or a risky change whose independent review was skipped;
- a related defect or risk you noticed outside the approved scope, which you reported instead of fixing;
- the next phase of phased work;
- committing, pushing or opening a pull request when changes are uncommitted and the user has not said otherwise;
- retrying a blocked step once the cause named in the report is fixed;
- saving a way of working the user recommended during this objective as a reusable skill, through `skill-builder`.

Write each as one line: the action, then why, with file paths or check names where they help, short enough that the user can accept it with "yes" or its number. Do not pad with generic advice ("add more tests", "let me know if…"), restate the completed work or repeat a suggestion the user declined in this objective. Keep unanswered suggestions in the handover's `open` line.

Suggestions are offers. Never start one until the user accepts it; the acceptance arrives as `USER FOLLOW-UP` and follows the normal scope and approval rules. When something only the user can decide blocks the work, ask it through `needs_input` instead, with a recommended answer and its reason.

Long or multi-phase requests get checkpoints. Plan one phase at a time, or stop for the user's go-ahead between phases, and offer the next phase as a suggestion rather than running every phase unattended. Under `full` autonomy, continue through the phases the request covers and offer only work beyond it.
