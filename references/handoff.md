# Handoff contract

Concierge's roles talk through three plain-text messages carried by Copilot's own agent tools (`task`, `write_agent`, `read_agent`). There is no separate transport or scheduler. Scout curates two plain-file learning stores through its bundled helper; these do not replace the control messages. The authoritative wording lives in the agent profiles under `com.github.copilot/agents/`.

## Roles

- **Concierge** (entry agent, Luna 6 by default): understands the request, writes the brief, starts or continues an orchestrator, relays questions, plans and results, asks the user with the native question tool, and mirrors the orchestrator's task list into the root to-do list. It has only control tools and never does the work.
- **Orchestrator** (Sol 6.1 by default, background agent): decides what work is needed, dispatches specialists, judges their evidence, plans with them and reports. Its profile has no tool list because Copilot gives nested agents only tools their parent also has; its charter forbids using execution tools itself.
- **Specialists** (Luna 6 by default) and **escalation** (Sol 6.1 by default): do the work and report only to the orchestrator. They do not ask the user, dispatch agents or own the task list.

## Brief (Concierge entry agent → orchestrator)

```
CONCIERGE-BRIEF
objective: <short name>
user request (verbatim): <exact words, pasted ticket text or links>
understanding: <one or two sentences>
references: <ticket keys, URLs, repositories, paths, or none>
plan approval stated by user: <exact words, or none>
file-write restrictions stated by user: <exact words and scope, or none>
earlier context: <only facts this request depends on, or none>
```

Follow-ups go to the same orchestrator as `USER FOLLOW-UP: <exact words>`, even while it is working; approval answers as `PLAN DECISION: <choice>`; `CONTINUE` and `CANCEL` are the other control messages.

Keep the user’s exact file-write restrictions in every brief, follow-up and handover. Do not infer a blanket no-write restriction from orientation or planning alone: Scout may curate private memory and verified repository knowledge under separate learning scopes. Wholly read-only work disables both stores’ writes; restrictions limited to repository or private storage remain scoped. Report every learning write as a changed file. A personal preference cannot authorize tools, alter plan approval or replace publication consent.

## Optional Ship it decisions

After verified implementation, Sol reports the completed result and an optional Ship it offer using `needs_input`. The Concierge entry agent asks whether to run read-only preflight for a draft GitHub PR or GitLab MR. A decline leaves state unchanged. Acceptance goes back verbatim as `USER FOLLOW-UP` and authorizes only a `research` handoff to the internal Luna `copilot-concierge:ship-it` specialist, never creation.

The worker resolves provider, host/project, fork source/head, target/base and published commit IDs; reports dirty/unpushed state and excluded changes; checks existing applicable open requests, authorization and supported draft capability. Missing or ambiguous evidence stops safely; unpublished intended changes never cause an implicit commit/push. An existing request returns its link/status rather than a duplicate.

If preflight succeeds, Sol reports another `needs_input` with the exact provider, host/project, head/base commits, title, complete body, `draft: true`, repository-state limitations and capability evidence. The Concierge entry agent displays it unchanged and asks "Create this draft with these exact details?" with "Create this draft", "Change details", "Not now". The user's exact answer returns as `USER FOLLOW-UP`, not `PLAN DECISION` or `CONTINUE`. Plan approval, auto preference, earlier go-ahead and tool permission are not publication consent.

Only a separate affirmative response to that exact proposal permits an `implement` handoff with the confirmed metadata and consent in `relevant context and sources`. The plan-approval field does not authorize publication. The specialist immediately revalidates relevant target/head/base, draft capability and duplicates; material changes require renewed confirmation. Sol decides and delegates only; the Concierge entry agent remains control-only; the specialist alone performs supported, authorized draft creation. Routed workers must load the same `ship-it` skill.

Use existing statuses, not new control messages: `needs_input` for offer/confirmation, `blocked` for capability or state gaps (keeping implementation results distinct), `done` for decline, existing request or verified draft link/status. Retain proposal/consent/result or gaps in the existing handover fields for follow-ups and recovery; reconcile provider state before retrying an uncertain creation. Never commit, push, merge or create non-draft then convert. These are instruction contracts, not live provider verification.

The Concierge entry agent runs one orchestrator per independent objective, and several can work at once. It knows each by the `name` it gave `task`, which every report repeats on its `objective:` line; if it loses an `agent_id`, `list_agents` with `scope: "children"` finds it by name.

A fresh orchestrator continues an objective in two cases, with the last report's `handover` block as its `earlier context`:

- **Rollover:** the old orchestrator has reported `done` or `blocked` and has reached 10 turns (from `read_agent`'s `total_turns`) when a new request for the same objective arrives; answers and approvals mid-work never trigger it. The brief starts `ROLLOVER from <old name>`; the new orchestrator keeps the handover's request, follow-ups, decisions and approvals, starts its task list with the finished items, and does not redo them. This keeps Sol's context small without measuring tokens, which no Copilot tool or hook exposes.
- **Resume:** the old orchestrator is gone, for example after a restart. The brief starts `RESUMED from <old name>`, and the new orchestrator has a scout check what already exists before repeating anything.

## Handoff (orchestrator → specialist)

```
CONCIERGE-HANDOFF
objective: <objective name>; task: <this worker's piece>
original request (verbatim): <...>
relevant context and sources: <facts with paths and links; no transcript>
mode: research | plan | implement | review
scope: <what to do, files owned, what not to touch>
acceptance criteria: <observable checks>
approval: <approved by user | auto (source) | not approved: research and planning only>
learning: <Scout only: memory read/maintain/disabled; knowledge read/maintain/disabled; exact user restrictions and assigned root, or none; other roles: not applicable>
skills to load: <optional>
return: findings, changes (files), verification (commands and results), blockers, next decision needed
```

For Scout, a routed Scout or an escalation doing Scout work, pass the `scout` skill and set `learning` explicitly. Serialize private mutations per OS user and knowledge mutations per repository. Other roles receive no learning-write exception. Scout handles personal inspect/correct/forget/disable requests even without a repository. Read private memory only for relevant preferences, return its summary separately, and never copy raw memory or personal evidence into repository knowledge, worker handoffs, commits or shipping proposals. Knowledge writes are reviewed and deliberately included in relevant commits by the implementation workflow only when commits are authorized; Scout never stages or commits. Preserve these boundaries through follow-ups, resume and rollover. Dispatch only discovered, explicitly pinned named profiles; report an unverified route and use a suitable shipped role, or stop if none fits. Never substitute an unpinned built-in worker.

## Report (orchestrator → Concierge entry agent)

```
CONCIERGE-REPORT
status: needs_input | needs_approval | checkpoint | done | blocked | cancelled
objective: <objective name>: <one line>
plan approval: <ask|auto>: <source>
tasks:
- [x] done item
- [/] item in progress
- [ ] pending item
- [-] blocked or cancelled item

handover:
- request: <the original request or ticket, verbatim; unchanged across rollovers>
- follow-ups: <later user requests in order>
- decisions: <user answers, approvals and exact file-write restrictions still in force>
- done: <results and changed files, each with how it was verified>
- open: <remaining items, questions and blockers>
- sources: <key files and links>

message:
<questions with suggested answers, the plan, or the result>
```

Task lines must start with `- ` or Copilot does not count them. The Concierge entry agent copies the `tasks` lines into the root to-do list unchanged, prefixed with the objective name when several objectives are open. The `handover` (at most ten lines) is never shown to the user; it is what lets a follow-up, rollover or resume continue without replaying the conversation.
