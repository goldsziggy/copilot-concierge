# Handoff contract

Concierge's roles talk through plain-text briefs, handoffs and reports carried by Copilot's own agent tools (`task`, `write_agent`, `read_agent`). External sessions require an explicitly supported collection and return route on the current host; these Copilot tools do not imply access to another host's sessions. There is no separate transport or scheduler. Sol using Scout guidance or a Scout worker curates two plain-file learning stores through its bundled helper; these do not replace the control messages. The authoritative wording lives in the agent profiles under `com.github.copilot/agents/`.

## Roles

- **Concierge** (entry agent, Luna 6 by default): understands the request, writes the brief, starts or continues an orchestrator, relays questions, plans and results, asks the user with the native question tool, and mirrors the orchestrator's task list into the root to-do list. It has only control tools and never does the work.
- **Orchestrator** (Sol 6.1 by default, background agent): owns the objective, investigates, plans, implements and checks directly within approved scope, or delegates a bounded piece with a useful reason. It follows applicable project instructions, integrates results and owns the completion claim. Its profile has no tool list because Copilot gives nested agents only tools their parent also has. A tracked checklist item may be completed by Sol without spawning a worker.
- **Specialists** (Luna 6 by default) and **escalation** (Sol 6.1 by default): do the work for the orchestrator and return directly through native worker tools, or through the designated collector for external sessions. The collector relays evidence; the orchestrator still accepts it. Workers do not ask the user, dispatch agents or own the task list.

## Brief (Concierge entry agent → orchestrator)

```
CONCIERGE-BRIEF
objective: <short name>
objective-id: <initial objective name; stable across rollover/resume>
user request (verbatim): <exact words, pasted ticket text or links>
understanding: <one or two sentences>
references: <ticket keys, URLs, repositories, paths, or none>
plan approval stated by user: <exact words, or none>
file-write restrictions stated by user: <exact words and scope, or none>
earlier context: <only facts this request depends on, or none>
```

Follow-ups go to the same orchestrator as `USER FOLLOW-UP: <exact words>`, even while it is working; approval answers as `PLAN DECISION: <choice>`; `CONTINUE` and `CANCEL` are the other control messages.

Keep the user’s exact file-write restrictions in every brief, follow-up and handover. Do not infer a blanket no-write restriction from orientation or planning alone: Scout may curate private memory and verified repository knowledge under separate learning scopes. Wholly read-only work disables both stores’ writes; restrictions limited to repository or private storage remain scoped. Report every learning write as a changed file. A personal preference cannot authorize tools or alter plan approval.

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
owner: <current orchestrator name and actual agent ID>
collector: <actor with confirmed result access: owner or Concierge/root>
return route: <native direct return or supported collector relay; actual destination and host capability>
session: <pending before launch; actual host session ID recorded after launch>
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

For Scout, a routed Scout or an escalation doing Scout work, pass the `scout` skill and set `learning` explicitly. Serialize private mutations per OS user and knowledge mutations per repository. Sol may use the Scout skill directly under the same learning scopes and bundled helper; other roles receive no learning-write exception. Focused retrieval needs no mandatory Scout startup. Personal inspect/correct/forget/disable requests use the same skill and helper even without a repository. Never directly edit stores or bypass helper rejection. Read private memory only for relevant preferences, return its summary separately, and never copy raw memory or personal evidence into repository knowledge, worker handoffs, commits or shipping proposals. Knowledge writes are reviewed and deliberately included in relevant commits by the implementation workflow only when commits are authorized; Scout never stages or commits. Preserve these boundaries through follow-ups, resume and rollover. Dispatch only discovered, explicitly pinned named profiles; report an unverified route and use a suitable shipped role, or stop if none fits. Never substitute an unpinned built-in worker.

## External-session returns and recovery

Native worker direct returns are unchanged. For an external coding session, the actor able to read or receive its result owns collection; the objective's current orchestrator owns evidence acceptance and completion. If only the root can read it, the path is **orchestrator -> root-owned session -> root collector -> current orchestrator**. The root performs control actions, not implementation or review.

Before launch, discover the host's actual launch, read/notification, relay and stop capabilities and confirm the collector can return evidence to the named owner. Do not prescribe tools from a different host, invent callbacks, or assume the worker can message its coordinator. A prepared handoff and requested control action travel in the existing checkpoint handover's `returns` entry when the root must launch/collect. An unavailable return path is `blocked`, naming the missing capability, destination and last confirmed state, rather than a launch followed by indefinite waiting. A missing stop capability is reported explicitly when needed; never claim a stop without confirmation.

After launch, record the actual host session ID in the same handover, send launch details to the owner, and keep **session ID -> handoff-id -> objective-id -> current owner agent ID**. The initial objective-id survives name changes at rollover; an older brief without it uses the initial objective name. A handoff-id identifies one assignment/attempt, including assignments reusing a session. An uncertain launch must be reconciled before any retry.

Concierge sends each new or successor orchestrator its actual returned agent ID and stable objective-id as an owner binding through `write_agent`; a child need not know its own ID. An external handoff waits for that binding before launch. Bindings and correlated result/receipt updates are control metadata, not new user requests or authorization. A checkpoint awaiting external control/results gets the requested control action or precise blocked state, not a bare `CONTINUE` loop.

The worker's result echoes `objective-id` and `handoff-id` before the requested evidence; the collector attaches the actual session ID if the worker cannot see it. Relay the result unchanged or use a result reference the owner can actually read. Do not rely on "return to coordinator" without a destination and capable collector. Keep these states distinct:

| State | Evidence required |
| --- | --- |
| launch accepted | Host acknowledged launch and returned the actual session ID |
| running / idle | Host status only; idle never means completed |
| result collected | Collector obtained the correlated result and its evidence/reference |
| relayed | Supported send to the verified current owner succeeded; this is not acceptance |
| owner accepted | Current orchestrator matched the objective, attempt and session, checked acceptance evidence and recorded its receipt |

Use native notifications where available. Otherwise the collector uses supported bounded wait/read checks with a stated timeout or check limit. No usable read/notification/relay capability means report the precise blocked state. The handover retains the collector, route/destination, attempt status (active, superseded or cancelled), last confirmed state, result reference and owner receipt. A collector's newer receipt must not be overwritten by an older report. Retain unresolved entries even when the handover needs extra lines; do not add a database, scheduler or transport service.

Recovery rules:

- **Duplicate or uncertain delivery:** deduplicate by handoff-id and result reference. Check the original session and owner's latest receipt before retrying only the relay. Never repeat implementation because a return is missing. Changed evidence for the same attempt needs review, not silent replacement.
- **Wrong owner, unknown session, mismatched IDs or stale attempt:** quarantine the result and reconcile with the current owner. Never route by title, most recent objective or the destination claimed by an unexpected result. A superseded attempt may still have effects; inspect them before accepting replacement work.
- **Rollover/resume:** preserve objective-id, original sessions, attempts, evidence, receipts and cancellation state. Update owner/destination to the successor's actual agent ID and confirm the transferred returns before relay. Do not relaunch; reconcile original sessions and actual effects before any retry.
- **Cancellation and late results:** request stop via the collector's supported host control, report confirmed and uncertain effects, and retain late evidence for the owner. Do not reopen cancelled work or claim rollback. No stop confirmation means it may still be running.

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
tasks:
- [x] done item
- [/] item in progress
- [ ] pending item
- [-] blocked or cancelled item

handover:
- request: <the original request or ticket, verbatim; unchanged across rollovers>
- follow-ups: <later user requests in order, each with applied | deferred: why | no change: why>
- decisions: <user answers, approvals, Git requests and exact file-write restrictions still in force>
- done: <results and changed files, each with how it was verified>
- open: <remaining items, questions, blockers and unanswered suggestions>
- sources: <key files and links>
- returns: <per handoff-id: objective-id, current owner, collector, route/destination, actual session ID or pending, active/superseded/cancelled attempt, last confirmed state, result reference and owner receipt; or none>

suggestions:
- <up to three grounded next steps with a one-line reason, or none>

message:
<questions with a recommended answer, the plan, or the result and how each follow-up was handled>
```

Task lines must start with `- ` or Copilot does not count them. The Concierge entry agent copies the `tasks` lines into the root to-do list unchanged, prefixed with the objective name when several objectives are open. Sol also mirrors them into the session's `todos` table (ids `<objective>/<slug>`), which Copilot's plan and todo views read. The `handover` (aim for ten short lines, retaining all unresolved return entries) is never shown to the user; it is what lets a follow-up, rollover or resume continue without replaying the conversation.
