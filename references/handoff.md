# Handoff contract

Concierge's roles talk through plain-text briefs, handoffs and reports carried by Copilot's own agent tools (`task`, `write_agent`, `read_agent`). External coding sessions are not supported; the retired protocol is archived in `docs/archive/external-sessions/`. There is no separate transport or scheduler. Sol using Scout guidance or a Scout worker curates two plain-file learning stores through its bundled helper; these do not replace the control messages. The authoritative wording lives in the agent profiles under `com.github.copilot/agents/`.

## Roles

- **Concierge** (entry agent, Luna 6 by default): understands the request, writes the brief, starts or continues an orchestrator, relays questions, plans and results, asks the user with the native question tool, and mirrors the orchestrator's task list into the root to-do list. It has only control tools and never does the work.
- **Orchestrator** (Sol 6.1 by default, background agent): owns the objective, investigates, plans, implements and checks directly within approved scope, or delegates a bounded piece with a useful reason. It follows applicable project instructions, integrates results and owns the completion claim. Its profile has no tool list because Copilot gives nested agents only tools their parent also has. A tracked checklist item may be completed by Sol without spawning a worker.
- **Specialists** (Luna 6 by default) and **escalation** (Sol 6.1 by default): do the work for the orchestrator and return directly through native worker tools. The orchestrator accepts their evidence. Workers do not ask the user, dispatch agents or own the task list.

## Brief (Concierge entry agent → orchestrator)

```
CONCIERGE-BRIEF
objective: <short name>
objective-id: <initial objective name; stable across rollover/resume>
user request (verbatim): <exact words, pasted ticket text or links>
understanding: <one or two sentences>
acceptance criteria: <observable outcomes inferred from the request, marking assumptions; or none>
references: <ticket keys, URLs, repositories, paths, or none>
plan approval stated by user: <exact words, or none>
autonomy stated by user: <exact words about being consulted or left alone, or none>
file-write restrictions stated by user: <exact words and scope, or none>
earlier context: <only facts this request depends on, or none>
```

Follow-ups go to the same orchestrator as `USER FOLLOW-UP: <exact words>`, even while it is working; approval answers as `PLAN DECISION: <choice>`; `CONTINUE`, `COMPLETION CHECK` and `CANCEL` are the other control messages.

Keep the user’s exact file-write restrictions in every brief, follow-up and handover. Do not infer a blanket no-write restriction from orientation or planning alone: Scout may curate private memory and verified repository knowledge under separate learning scopes. Wholly read-only work disables both stores’ writes; restrictions limited to repository or private storage remain scoped. Report every learning write as a changed file. A personal preference cannot authorize tools or alter plan approval.

## Autonomy

`autonomy` is `guided` (the default) or `full`. The user's current words and session preference take precedence, then `COPILOT_CONCIERGE_AUTONOMY` when a permitted shell read can see it, then the project and user files. The optional configured-copy launcher resolves these before the session and includes the effective value and source in each profile. The orchestrator states the selected value and source on every report's `autonomy:` line. See [autonomy](autonomy.md) for the exact precedence and [SDK automation](sdk-automation.md) for unattended runs.

With `full` the run is treated as unattended. The orchestrator settles ordinary questions itself and records each as `decided for the user: <choice>: <why>` in the handover's `decisions`; it sends no `needs_input` and no plan or phase checkpoint, and stops only for `done`, `cancelled`, a hard stop reported as `blocked`, or `needs_approval` when plan approval is `ask`. The Concierge entry agent ends its turn while the background orchestrator works and is woken by the host's notification; it does not poll or call `ask_user`. After collecting the report, it ends its reply with `CONCIERGE-RESULT: <status> <objective-id>`. External-session control checkpoints still obtain the binding or supported return action described below.

Before relaying `done` under `full`, the entry agent compares the report with the brief's acceptance criteria and the follow-up outcomes. If one lacks stated verification it sends `COMPLETION CHECK: <items>` once. That message is control metadata: the orchestrator verifies or finishes each item within scope, or says exactly why it cannot, and reports again. The entry agent compares reports only; it reads no files.

Autonomy changes who answers ordinary questions. It does not change scope, plan approval, Git requests, file-write restrictions, learning scopes, review or Copilot's permissions.

## Commits, pushes and pull requests

These are ordinary requests, not a separate stage. The Concierge entry agent puts them in the brief or sends them as `USER FOLLOW-UP`, even after an objective is done. Sol carries the request in the handoff's `git` line, and the execution owner commits, pushes or opens the pull request with the available Git and provider tools. Copilot's own permissions decide each command. Without a request, changes stay uncommitted and the result says so. Force-pushes, history rewrites, merges and branch deletions need a specific request. Concierge never answers that it cannot commit or push; a host permission or missing tool is reported as that exact cause.

## Follow-ups and suggestions

Every `USER FOLLOW-UP` gets an outcome in the handover's `follow-ups` line (`applied`, `deferred: why` or `no change: why`), and the report's `message` says how each was handled. An objective is not `done` while a follow-up has no outcome.

Reports for `done`, `blocked`, `checkpoint` and a partly finished `cancelled` carry a `suggestions` block: at most three next steps grounded in the objective's evidence, each with a one-line reason, or `none`. The Concierge entry agent shows them as a numbered "Next steps you might want" list without `ask_user`. A suggestion starts only when the user accepts it; the acceptance travels as `USER FOLLOW-UP` with the full suggestion text and follows the normal scope and approval rules.

The Concierge entry agent runs one orchestrator per independent objective, and several can work at once. It knows each by the `name` it gave `task`, which every report repeats on its `objective:` line; if it loses an `agent_id`, `list_agents` with `scope: "children"` finds it by name.

Initial names/objective-ids are unique across the conversation, including completed objectives. Never reuse a stable objective-id for independent work; suffix a new name when necessary and reserve rollover names for the same objective.

A fresh orchestrator continues an objective in two cases, with the last report's `handover` block as its `earlier context`:

- **Rollover:** the old orchestrator has reported `done` or `blocked` and has reached 10 turns (from `read_agent`'s `total_turns`) when a new request for the same objective arrives; answers and approvals mid-work never trigger it. The brief starts `ROLLOVER from <old name>`; the new orchestrator keeps the handover's request, follow-ups, decisions and approvals, starts its task list with the finished items, and does not redo them. This keeps Sol's context small without measuring tokens, which no Copilot tool or hook exposes.
- **Resume:** the old orchestrator is gone, for example after a restart. The brief starts `RESUMED from <old name>`, and the new orchestrator inspects directly or has a scout check what already exists before repeating anything, including Sol-owned changes. Check uncertain effects before replay; cancellation stops direct work and workers, not just dispatch.

## Handoff (orchestrator → specialist)

```
CONCIERGE-HANDOFF
objective: <objective name>; task: <this worker's piece>
objective-id: <stable ID from the brief>
handoff-id: <unique ID for this assignment/attempt; never reused for a retry>
delegation reason: <independent investigation, context reduction, separate ownership, independent verification, or explicit route/model>
original request (verbatim): <...>
relevant context and sources: <facts with paths and links; no transcript>
mode: research | plan | implement | review
scope: <what to do, files owned, what not to touch>
acceptance criteria: <observable checks>
approval: <approved by user | auto (source) | not approved: research and planning only>
git: <what the user asked for: commit, push, branch or pull request; or none: leave changes uncommitted>
learning: <Scout only: memory read/maintain/disabled; knowledge read/maintain/disabled; exact user restrictions and assigned root, or none; other roles: not applicable>
skills to load: <optional>
return: echo objective-id and handoff-id; findings, changes (files and repository state/diff), acceptance checks, verification (commands and results), changed assumptions, uncertainty, blockers, next decision needed
```

For Scout, a routed Scout or an escalation doing Scout work, pass the `scout` skill and set `learning` explicitly. Serialize private mutations per OS user and knowledge mutations per repository. Sol may use the Scout skill directly under the same learning scopes and bundled helper; other roles receive no learning-write exception. Focused retrieval needs no mandatory Scout startup. Personal inspect/correct/forget/disable requests use the same skill and helper even without a repository. Never directly edit stores or bypass helper rejection. Read private memory only for relevant preferences, return its summary separately, and never copy raw memory or personal evidence into repository knowledge, worker handoffs, commits or shipping proposals. Knowledge writes are reviewed and deliberately included in relevant commits by the implementation workflow only when commits are authorized; Scout never stages or commits. Preserve these boundaries through follow-ups, resume and rollover. Prefer available named routes and report substitutions. If a route or preferred model is unavailable, use a suitable host-supported worker or execute directly within scope, preserving skills and restrictions; report an exact blocker when no permitted capability remains. Apply the documented migration for retired built-in domain IDs without rewriting user routing files.

## Execution ownership and evidence

Resolve explicit custom routing rows before choosing direct work; a matching row still requires its verified named agent. Otherwise Sol can execute a cohesive feature with multiple domain skills and own its tests. Delegate only for a useful independent boundary and state why. Serialize overlapping files or unsettled contracts; independent pieces can run in parallel after agreeing interfaces.

The agent profile controls identity, tools, model and delegation; a skill is a procedure and does not promote a leaf worker or demote Sol. Plan approval, host permissions and file restrictions apply identically to direct and delegated work. Meaningful or risky behavior changes, including those authored by Sol, receive independent review; small nonbehavioral edits can use proportional focused checks unless requested review or routing requires more.

Inspect decisive artifacts and the relevant diff before acceptance where needed. Reuse adequate evidence rather than repeatedly reopening every source. Record commands and outcomes, acceptance results, changed assumptions and unresolved uncertainty for recovery. Do not claim independent review from self-review or live behavior from static contracts.

## Report (orchestrator → Concierge entry agent)

```
CONCIERGE-REPORT
status: needs_input | needs_approval | checkpoint | done | blocked | cancelled
objective: <objective name>: <one line>
objective-id: <stable ID, unchanged across rollover/resume>
plan approval: <ask|auto>: <source>
autonomy: <guided|full>: <source>
decided for the user:
- <full autonomy: every ordinary question you settled, one per line as <choice>: <why>; write none when there were none or autonomy is guided>
tasks:
- [x] done item
- [/] item in progress
- [ ] pending item
- [-] blocked or cancelled item

handover:
- request: <the original request or ticket, verbatim; unchanged across rollovers>
- follow-ups: <later user requests in order, each with applied | deferred: why | no change: why>
- decisions: <user answers, approvals, Git requests and exact file-write restrictions still in force; under full autonomy also each `decided for the user: <choice>: <why>`>
- outcome: <current structured outcome or accessible reference: intent, objective, acceptance-to-verification mapping, constraints, decisions versus inferences, dependencies, consequential questions and grill findings/dispositions; preserve through amendments and rollover>
- done: <results and changed files, each with how it was verified>
- open: <remaining items, questions, blockers and unanswered suggestions>
- sources: <key files and links>

suggestions:
- <up to three grounded next steps with a one-line reason, or none>

message:
<questions with a recommended answer, the plan, or the result and how each follow-up was handled>
```

Task lines must start with `- ` or Copilot does not count them. The Concierge entry agent copies the `tasks` lines into the root to-do list unchanged, prefixed with the objective name when several objectives are open. Sol also mirrors them into the session's `todos` table (ids `<objective>/<slug>`), which Copilot's plan and todo views read. The `handover` (aim for ten short lines, retaining all unresolved return entries) is never shown to the user; it is what lets a follow-up, rollover or resume continue without replaying the conversation.
