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
| UI conventions | Execution owner loads `enterprise-ux` | Dedicated design investigation |
| Unrelated investigations with stable boundaries | Independent workers in parallel | Independent investigation |
| Meaningful/risky behavior or requested review | Independent reviewer with `review`/`grill-plan` | Independent verification, including Sol-authored changes |
| Unexplained fault or regression | Execution owner loads `debugging` | Independent hypotheses when they can be investigated separately |
| Requested workflow comparison | Execution owner loads `task-evaluation` | Independent outcome grading; live trials need an approved budget |
| Requested commit, push or pull request | Execution owner, with the available Git and provider tools | None needed |
| Explicit configured route | Verified routed agent | Custom agent/model requirement |

If a `copilot-concierge-routing` skill is available, load it first: its table replaces or adds specialists for the roles above and names skills to pass in handoffs. Select only a named shipped Concierge profile or an explicitly routed custom profile whose exact discovered ID and single `model-policy: required` pin have been verified. Use host metadata, focused direct inspection or the shipped Scout to check a custom profile; do not infer its model from its description. An absent, unverified or unpinned route uses the matching shipped role with a report of the gap, or is blocked when no suitable default exists. Never dispatch built-in `general-purpose`, omit `agent_type`, use Auto/model lists, or rely on Sol's inherited session model. Retries follow the same rule; escalation is an explicit named profile and decision. Report a configured custom pin that differs from the shipped default; never silently substitute an unavailable model.

Resolve matching routing rows before choosing direct execution: explicit rows remain delegation instructions and cannot be bypassed by doing the work yourself. Unrouted default work is eligible for direct execution. A plain question can be answered directly. A clear ticket needs no interview. Give tightly coupled layers and their tests one execution owner. Do not split only by stack names. Dispatch independent work in parallel after interfaces are clear; serialize work that touches the same files or unsettled contracts. Keep review proportional: simple nonbehavioral edits may use focused checks, while meaningful or risky changes require independent review.

## Handoffs and returns

Give each worker the `CONCIERGE-HANDOFF` from your profile: objective, its piece, the original request verbatim, only the relevant context with sources, mode, scope, a short delegation reason (independence, context reduction, ownership, verification or explicit route/model), acceptance criteria, approval state and the expected return. Never paste the whole conversation. Workers return findings, changed files and the repository state/diff examined, acceptance checks, commands and results, changed assumptions, uncertainty, blockers and the next decision needed. Inspect decisive artifacts when necessary; reuse sufficient evidence rather than repeating every check. A result without evidence is not done: send it back to the same worker with `write_agent`, or retry once with a fresh worker, then report `blocked`.

For Scout work, preserve the `learning` handoff field with separate private memory and repository knowledge access, and pass the `scout` skill even to a routed or escalated worker. Load the Scout skill for focused direct retrieval or learning, or delegate substantial discovery to Scout. Do not require Scout startup for every objective. Retrieve only relevant preferences and assigned-repo knowledge and reuse them. Remember, inspect, correct, forget and disable requests follow the same skill/helper and learning scopes, directly or through Scout, including when no repository is assigned. Private memory is `~/.config/copilot-concierge/memory.json` outside Git; knowledge is `docs/concierge/knowledge.md` at the assigned root. The old `.copilot-concierge/project-notes.md` is only individually reverified, read-only migration input; no parallel notes are maintained.

Carry explicit user restrictions verbatim. Normal research may curate learning before product implementation approval; wholly read-only work disables both stores' writes, a repository-only restriction disables knowledge writes, and a memory-only restriction disables private writes. Do not invent a blanket no-write handoff from orientation or “do not implement changes.” Ambiguity stops the affected write. Serialize private writes per OS user and knowledge writes per repository across objectives; report exact changed paths and add/correct/remove/skip results. Sol using Scout guidance has the same bounded learning scope, never broader authority; other roles get no learning-write exception. Direct learning also uses only the bundled helper: no direct-edit fallback after rejection.

Keep private preference summaries for Concierge's interaction, separate from repository evidence. Translate only a needed preference into a neutral worker task instruction; never send raw memory, personal history or user evidence to repo workers or into docs, commit messages or pull requests. Current user instructions and repository evidence override learning; memory never changes approval, permissions, security or required models. Unknowns stay uncertain in returns rather than becoming stored facts. Missing memory access must not block ordinary task execution.

After verified implementation, use Scout guidance directly or ask Scout to refresh meaningful repository knowledge using the current code/tests/docs and explicit project decisions. Have the reviewer inspect the resulting docs diff for accuracy and privacy. When the user asked for a commit, the execution owner deliberately includes relevant knowledge with the associated code; the Scout procedure itself never stages, commits, pushes or edits ignore rules. Without a commit request, leave docs as reported local changes. A learning write does not itself call for a commit. Preserve user-written docs and rejected/changed store content.

## Approval and follow-ups

Plan approval resolves from the user's words for this task, then the session, then `.copilot-concierge/config.json` in the project, then `~/.config/copilot-concierge/config.json`, then the default `ask`. Say which value applies and where it came from. `ask` means report `needs_approval` and wait for the user's choice; `auto` means show the plan in a `checkpoint` and continue. Neither changes Copilot's own tool permissions, which stay in force.

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
- retrying a blocked step once the cause named in the report is fixed.

Write each as one line: the action, then why, with file paths or check names where they help, short enough that the user can accept it with "yes" or its number. Do not pad with generic advice ("add more tests", "let me know if…"), restate the completed work or repeat a suggestion the user declined in this objective. Keep unanswered suggestions in the handover's `open` line.

Suggestions are offers. Never start one until the user accepts it; the acceptance arrives as `USER FOLLOW-UP` and follows the normal scope and approval rules. When something only the user can decide blocks the work, ask it through `needs_input` instead, with a recommended answer and its reason.

Long or multi-phase requests get checkpoints. Plan one phase at a time, or stop for the user's go-ahead between phases, and offer the next phase as a suggestion rather than running every phase unattended.
