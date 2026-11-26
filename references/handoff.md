# Handoff contract

Concierge's two agents talk through plain-text briefs and reports carried by Copilot's own agent tools (`task`, `write_agent`, `read_agent`). The worker uses the same tools and a handoff for any sub-agent it starts. External coding sessions are not supported; the retired protocol is archived in `docs/archive/external-sessions/`. There is no separate transport or scheduler. The authoritative wording lives in the agent profiles under `com.github.copilot/agents/` and in the skills they load; this page summarizes it.

## Roles

- **Concierge** (entry agent, Copilot Fusion by default): a light chat front. It answers simple questions that need no file, repository, ticket, link or command. For everything else it writes the brief, starts or continues a worker, relays questions, plans and results, asks the user with the native question tool, and copies the worker's task list into the root to-do list. It has only control tools and the `skill` tool, and never does the work. Its procedures are the `brief` and `relay` skills.
- **Worker** (GPT-6.1 Sol by default, background agent): owns the objective and investigates, plans, implements and checks it directly within approved scope, loading the skill each step needs. It follows applicable project instructions and owns the completion claim. Its profile has no tool list because Copilot gives nested agents only tools their parent also has.
- **Sub-agents** (optional): the worker starts one only for a useful boundary, such as independent pieces, a compressible investigation, an independent review or an explicit routing row. Concierge ships none: the worker uses the agent a customer's routing row names, or an agent the host offers. A sub-agent reports only to the worker and does not ask the user, start agents or own the task list.

## Brief (Concierge entry agent → worker)

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
progress: <none for new work; on rollover or resume, the old worker's latest progress object, verbatim>
```

Follow-ups go to the same worker as `USER FOLLOW-UP: <exact words>`, even while it is working; approval answers as `PLAN DECISION: <choice>`; `CONTINUE`, `COMPLETION CHECK` and `CANCEL` are the other control messages.

Keep the user’s exact file-write restrictions in every brief, follow-up and handoff. Do not infer a blanket no-write restriction from orientation or planning alone: the worker may curate private memory and verified repository knowledge under separate learning scopes. Wholly read-only work disables both stores’ writes; restrictions limited to repository or private storage remain scoped. Report every learning write as a changed file. A personal preference cannot authorize tools or alter plan approval.

## Direct answers

The entry agent answers on its own only what it can answer correctly from the conversation and general knowledge: greetings, what Concierge does and how to phrase a request, a general question that does not depend on the user's project, and progress or results from the latest report it holds. A direct answer starts no objective and writes no to-do item. Anything about the user's own code or data is handed over, and so is anything it is unsure about.

## Autonomy

`autonomy` is `guided` (the default) or `full`. The user's current words and session preference take precedence, then `COPILOT_CONCIERGE_AUTONOMY` when a permitted shell read can see it, then the project and user files. The optional configured-copy launcher resolves these before the session and includes the effective value and source in each profile. The worker states the selected value and source on every report's `autonomy:` line. See [autonomy](autonomy.md) for the exact precedence and [SDK automation](sdk-automation.md) for unattended runs.

With `full` the run is treated as unattended. The worker settles ordinary questions through the `escalate` skill and records each as `decided for the user: <choice>: <why>` in `progress.decisions` and in the report; it sends no `needs_input` and no plan or phase checkpoint, and stops only for `done`, `cancelled`, a hard stop reported as `blocked`, or `needs_approval` when plan approval is `ask`. The Concierge entry agent ends its turn while the background worker works and is woken by the host's notification; it does not poll or call `ask_user`. After collecting the report, it ends its reply with `CONCIERGE-RESULT: <status> <objective-id>`.

Before relaying `done` under `full`, the entry agent compares the report with the brief's acceptance criteria and the follow-up outcomes. If one lacks stated verification it sends `COMPLETION CHECK: <items>` once. That message is control metadata: the worker verifies or finishes each item within scope, or says exactly why it cannot, and reports again. The entry agent compares reports only; it reads no files.

Autonomy changes who answers ordinary questions. It does not change scope, plan approval, Git requests, file-write restrictions, learning scopes, review or Copilot's permissions.

## Blockers

The worker does not guess past a blocker. It names the kind (`question`, `permission`, `repeated_failure`, `missing_dependency`, `ambiguity` or `stall`) and settles it with the `escalate` checklist, stopping at the first step that applies: answer from a source it has re-read, retry an untested hypothesis once, mock what sits outside the unit under change, run the check where the request allows, assume and flag a clearly safest reversible option (under `full` only), ask, or abort. Asking is `needs_input` under `guided` and `blocked` under `full`. Something only the user can supply, an unrequested destructive or far-reaching action, a costly choice and a conflict with a user restriction are always asked. At most ten assumptions per objective and two self-settled outcomes per blocker.

## Commits, pushes and pull requests

These are ordinary requests, not a separate stage. The Concierge entry agent puts them in the brief or sends them as `USER FOLLOW-UP`, even after an objective is done. The worker commits, pushes or opens the pull request with the available Git and provider tools, following the `development` skill, and carries the request in a handoff's `git` line when a sub-agent owns the change. Copilot's own permissions decide each command. Without a request, changes stay uncommitted and the result says so. Force-pushes, history rewrites, merges and branch deletions need a specific request. Concierge never answers that it cannot commit or push; a host permission or missing tool is reported as that exact cause.

## Follow-ups and suggestions

Every `USER FOLLOW-UP` gets an outcome in `progress.follow_ups` (`applied`, `deferred: why` or `no change: why`), and the report's `message` says how each was handled. An objective is not `done` while a follow-up has no outcome.

Reports for `done`, `blocked`, `checkpoint` and a partly finished `cancelled` carry a `suggestions` block: at most three next steps grounded in the objective's evidence, each with a one-line reason, or `none`. The Concierge entry agent shows them as a numbered "Next steps you might want" list without `ask_user`. A suggestion starts only when the user accepts it; the acceptance travels as `USER FOLLOW-UP` with the full suggestion text and follows the normal scope and approval rules.

The Concierge entry agent runs one worker per independent objective, and several can work at once. It knows each by the `name` it gave `task`, which every report repeats on its `objective:` line; if it loses an `agent_id`, `list_agents` with `scope: "children"` finds it by name.

Initial names/objective-ids are unique across the conversation, including completed objectives. Never reuse a stable objective-id for independent work; suffix a new name when necessary and reserve rollover names for the same objective.

A fresh worker continues an objective in two cases, with the last report's `progress` object, copied verbatim, on the brief's `progress` line:

- **Rollover:** the old worker has reported `done` or `blocked` and has reached 10 turns (from `read_agent`'s `total_turns`) when a new request for the same objective arrives; answers and approvals mid-work never trigger it. The brief starts `ROLLOVER from <old name>`; the new worker keeps the request, follow-ups, decisions and approvals in `progress`, starts its task list with the finished items, and does not redo them. This keeps the worker's context small without measuring tokens, which no Copilot tool or hook exposes.
- **Resume:** the old worker is gone, for example after a restart. The brief starts `RESUMED from <old name>`, and the new worker inspects what already exists before repeating anything. Check uncertain effects before replay; cancellation stops direct work and sub-agents, not just dispatch.

## Handoff (worker → sub-agent)

```
CONCIERGE-HANDOFF
objective: <objective name>; task: <this sub-agent's piece>
objective-id: <stable ID from the brief>
handoff-id: <unique ID for this assignment/attempt; never reused for a retry>
delegation reason: <independence, context reduction, separate ownership, independent verification, or explicit route/model requirement>
original request (verbatim): <...>
relevant context and sources: <only the facts from progress that apply, with paths and links; no transcript>
mode: research | plan | implement | review
scope: <what to do, files it may change, files it may read, what not to touch>
learning: <Scout work only: memory read/maintain/disabled; knowledge read/maintain/disabled; exact user restrictions and assigned root, or none; other work: not applicable>
acceptance criteria: <observable checks>
approval: <approved by user | auto (source) | not approved: research and planning only>
git: <what the user asked for: commit, push, branch or pull request; or none: leave changes uncommitted>
skills to load: <optional>
rules: you report only to the worker; do not ask the user, start agents or update the task list; one command per shell call; skills supply procedures, not tools or authority
return: echo objective-id and handoff-id; findings, changes (files and repository state/diff), acceptance checks, verification (commands and results), changed assumptions, uncertainty, blockers, next decision needed
```

For a sub-agent doing Scout work, pass the `scout` skill and set `learning` explicitly. Serialize private mutations per OS user and knowledge mutations per repository. The worker uses the Scout skill directly under the same learning scopes and bundled helper; other work receives no learning-write exception. Personal inspect/correct/forget/disable requests use the same skill and helper even without a repository. Never directly edit stores or bypass helper rejection. Read private memory only for relevant preferences, return its summary separately, and never copy raw memory or personal evidence into repository knowledge, handoffs, `progress`, commits or pull requests. Knowledge writes are reviewed and deliberately included in relevant commits only when the user asked for a commit. Preserve these boundaries through follow-ups, resume and rollover. Prefer available named routes and report substitutions. If a route or preferred model is unavailable, use a suitable host-supported agent or execute directly within scope, preserving skills and restrictions; report an exact blocker when no permitted capability remains. Apply the documented migration for retired built-in agent IDs without rewriting user routing files.

## Execution ownership and evidence

Resolve explicit custom routing rows before choosing direct work; a row naming an available custom agent still requires that agent. Otherwise the worker executes a cohesive feature with multiple domain skills and owns its tests. It starts a sub-agent only for a useful independent boundary and states why, with at most three at once. Serialize overlapping files or unsettled contracts; independent pieces can run in parallel after agreeing interfaces.

The agent profile controls identity, tools, model and delegation; a skill is a procedure and does not change who is running it. Plan approval, host permissions and file restrictions apply identically to direct and delegated work. Meaningful or risky behavior changes receive independent review by a sub-agent; when none is available the worker reviews with the `review` skill and reports that the review was not independent. Small nonbehavioral edits can use proportional focused checks unless requested review or routing requires more.

Inspect decisive artifacts and the relevant diff before acceptance where needed. Reuse adequate evidence rather than repeatedly reopening every source. Record commands and outcomes, acceptance results, changed assumptions and unresolved uncertainty in `progress`. Do not claim independent review from self-review or live behavior from static contracts.

## Report (worker → Concierge entry agent)

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

progress:
<the progress object, on one line>

suggestions:
- <up to three grounded next steps with a one-line reason, or none>

message:
<questions with a recommended answer, the plan, or the result and how each follow-up was handled>
```

Task lines must start with `- ` or Copilot does not count them. The Concierge entry agent copies the `tasks` lines into the root to-do list unchanged, prefixed with the objective name when several objectives are open. The worker also mirrors them into the session's `todos` table (ids `<objective>/<slug>`), which Copilot's plan and todo views read.

## Progress

The worker keeps no notes file. `progress` is one JSON object, about 4,000 characters at most, with one line per fact and no logs, diffs or secrets:

| Field | Holds |
| --- | --- |
| `request` | The original request or ticket, verbatim; unchanged across rollovers |
| `follow_ups` | Later user requests in order, each with its outcome |
| `decisions` | User answers, approvals, Git requests and file-write restrictions in force; under `full`, each choice decided for the user |
| `outcome` | Intent, the acceptance-to-check mapping and constraints |
| `repo_summary` | Stack, test and build commands, conventions (from `discovery`) |
| `tasks` | Each task's id, goal, status (`open`, `done`, `blocked`, `parked`) and files |
| `facts` | Facts with their sources |
| `error_signatures` | Normalised failures with a count and step (from `test`) |
| `done`, `open`, `uncommitted` | Verified results, remaining items and edits left out of a commit |
| `counts` | Blockers settled, assumptions made and sub-agents started |
| `depth_limited` | True when the `task` tool was unavailable |

It is never shown to the user. The entry agent keeps the latest one per objective and passes it back unchanged; it is what lets a follow-up, rollover or resume continue without replaying the conversation.
