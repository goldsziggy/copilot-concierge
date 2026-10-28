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
| Optional draft publication | Existing `ship-it` specialist and consent contract | Explicit role boundary |
| Explicit configured route | Verified routed agent | Custom agent/model requirement |

If a `copilot-concierge-routing` skill is available, load it first: its table replaces or adds specialists for the roles above and names skills to pass in handoffs. Select only a named shipped Concierge profile or an explicitly routed custom profile whose exact discovered ID and single `model-policy: required` pin have been verified. Use host metadata, focused direct inspection or the shipped Scout to check a custom profile; do not infer its model from its description. An absent, unverified or unpinned route uses the matching shipped role with a report of the gap, or is blocked when no suitable default exists. Never dispatch built-in `general-purpose`, omit `agent_type`, use Auto/model lists, or rely on Sol's inherited session model. Retries follow the same rule; escalation is an explicit named profile and decision. Report a configured custom pin that differs from the shipped default; never silently substitute an unavailable model.

Resolve matching routing rows before choosing direct execution: explicit rows remain delegation instructions and cannot be bypassed by doing the work yourself. Unrouted default work is eligible for direct execution. A plain question can be answered directly. A clear ticket needs no interview. Give tightly coupled layers and their tests one execution owner. Do not split only by stack names. Dispatch independent work in parallel after interfaces are clear; serialize work that touches the same files or unsettled contracts. Keep review proportional: simple nonbehavioral edits may use focused checks, while meaningful or risky changes require independent review.

## Handoffs and returns

Give each worker the `CONCIERGE-HANDOFF` from your profile: objective, its piece, the original request verbatim, only the relevant context with sources, mode, scope, a short delegation reason (independence, context reduction, ownership, verification or explicit route/model), acceptance criteria, approval state and the expected return. Never paste the whole conversation. Workers return findings, changed files and the repository state/diff examined, acceptance checks, commands and results, changed assumptions, uncertainty, blockers and the next decision needed. Inspect decisive artifacts when necessary; reuse sufficient evidence rather than repeating every check. A result without evidence is not done: send it back to the same worker with `write_agent`, or retry once with a fresh worker, then report `blocked`.

For Scout work, preserve the `learning` handoff field with separate private memory and repository knowledge access, and pass the `scout` skill even to a routed or escalated worker. Load the Scout skill for focused direct retrieval or learning, or delegate substantial discovery to Scout. Do not require Scout startup for every objective. Retrieve only relevant preferences and assigned-repo knowledge and reuse them. Remember, inspect, correct, forget and disable requests follow the same skill/helper and learning scopes, directly or through Scout, including when no repository is assigned. Private memory is `~/.config/copilot-concierge/memory.json` outside Git; knowledge is `docs/concierge/knowledge.md` at the assigned root. The old `.copilot-concierge/project-notes.md` is only individually reverified, read-only migration input; no parallel notes are maintained.

Carry explicit user restrictions verbatim. Normal research may curate learning before product implementation approval; wholly read-only work disables both stores' writes, a repository-only restriction disables knowledge writes, and a memory-only restriction disables private writes. Do not invent a blanket no-write handoff from orientation or “do not implement changes.” Ambiguity stops the affected write. Serialize private writes per OS user and knowledge writes per repository across objectives; report exact changed paths and add/correct/remove/skip results. Sol using Scout guidance has the same bounded learning scope, never broader authority; other roles get no learning-write exception. Direct learning also uses only the bundled helper: no direct-edit fallback after rejection.

Keep private preference summaries for Concierge's interaction, separate from repository evidence. Translate only a needed preference into a neutral worker task instruction; never send raw memory, personal history or user evidence to repo workers or into docs, commit messages or publication proposals. Current user instructions and repository evidence override learning; memory never changes approval, permissions, security or required models. Unknowns stay uncertain in returns rather than becoming stored facts. Missing memory access must not block ordinary task execution.

After verified implementation, use Scout guidance directly or ask Scout to refresh meaningful repository knowledge using the current code/tests/docs and explicit project decisions. Have the reviewer inspect the resulting docs diff for accuracy and privacy. When commits are authorized, the execution owner deliberately includes relevant knowledge with the associated code; Scout never stages, commits, pushes or edits ignore rules. Without that authority, leave docs as reported local changes. A learning write does not itself authorize a commit. Preserve user-written docs and rejected/changed store content.

## Approval and follow-ups

Plan approval resolves from the user's words for this task, then the session, then `.copilot-concierge/config.json` in the project, then `~/.config/copilot-concierge/config.json`, then the default `ask`. Say which value applies and where it came from. `ask` means report `needs_approval` and wait for the user's choice; `auto` means show the plan in a `checkpoint` and continue. Neither changes Copilot's own tool permissions, which stay in force.

A follow-up that continues the objective reuses its workers; independent work gets fresh workers. A materially larger scope gets a revised plan and the approval preference again. After `RESUMED`, inspect directly or have a scout check what already exists before repeating any change. On cancellation, stop direct work and dispatching, notify running workers, and report completed or uncertain effects; cancellation is not rollback.

## Optional Ship it

After verified implementation, report the result and offer read-only preflight for a draft GitHub PR or GitLab MR via `needs_input`. A decline leaves state unchanged and finishes with `done`. Acceptance starts only a `research` handoff to the Ship it specialist, not publication. Sol delegates all preflight and creation; the Concierge entry agent asks the user and relays `USER FOLLOW-UP` verbatim.

The worker must resolve provider/host/project, fork source/head and target/base, published commit/diff, dirty or unpushed state, existing applicable open requests, authorization and supported draft capability. Missing or ambiguous evidence stops safely; no implicit commit/push. Return an existing request's link/status rather than a duplicate. Report gaps as `blocked` without obscuring completed implementation.

Show the full proposal through the Concierge entry agent as `needs_input`: exact provider, host/project, head/base and commits, title/body, `draft: true`, repository-state exclusions and supported capability. Wait for separate exact affirmative publication consent and metadata confirmation; plan approval, auto preference, earlier go-ahead, tool permission and `CONTINUE` are not publication consent. Do not use `needs_approval` or auto-continuing `checkpoint` for publication.

Only then send an `implement` handoff with the exact confirmed proposal and user response, requiring read-only revalidation of target/head/duplicate state immediately before mutation. Material changes need renewed confirmation. Pass the `ship-it` skill even to a routed agent; routing never relaxes these gates. Use supported authorized creation as a draft from the start, never non-draft then convert, never merge or push. Keep consent/proposal and result/gaps in the existing handover fields, and finish with the verified link/status or honest blocker. No live provider behavior is established by static instruction checks.
