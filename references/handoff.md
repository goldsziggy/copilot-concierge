# Handoff contract

Concierge's roles talk through three plain-text messages carried by Copilot's own agent tools (`task`, `write_agent`, `read_agent`). There is no separate transport, store or scheduler. The authoritative wording lives in the agent profiles under `com.github.copilot/agents/`.

## Roles

- **Front desk** (root, Luna 6): understands the request, writes the brief, starts or continues an orchestrator, relays questions, plans and results, asks the user with the native question tool, and mirrors the orchestrator's task list into the root to-do list. It has only control tools and never does the work.
- **Orchestrator** (Sol 6.1, background agent): decides what work is needed, dispatches specialists, judges their evidence, plans with them and reports. Its profile has no tool list because Copilot gives nested agents only tools their parent also has; its charter forbids using execution tools itself.
- **Specialists** (Luna 6) and **escalation** (Sol 6.1): do the work and report only to the orchestrator. They do not ask the user, dispatch agents or own the task list.

## Brief (front desk → orchestrator)

```
CONCIERGE-BRIEF
objective: <short name>
user request (verbatim): <exact words, pasted ticket text or links>
understanding: <one or two sentences>
references: <ticket keys, URLs, repositories, paths, or none>
plan approval stated by user: <exact words, or none>
earlier context: <only facts this request depends on, or none>
```

Follow-ups go to the same orchestrator as `USER FOLLOW-UP: <exact words>`, even while it is working; approval answers as `PLAN DECISION: <choice>`; `CONTINUE` and `CANCEL` are the other control messages.

The front desk runs one orchestrator per independent objective, and several can work at once. It knows each by the `name` it gave `task`, which every report repeats on its `objective:` line; if it loses an `agent_id`, `list_agents` with `scope: "children"` finds it by name.

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
skills to load: <optional>
return: findings, changes (files), verification (commands and results), blockers, next decision needed
```

## Report (orchestrator → front desk)

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
- decisions: <user answers and approvals so far>
- done: <results and changed files, each with how it was verified>
- open: <remaining items, questions and blockers>
- sources: <key files and links>

message:
<questions with suggested answers, the plan, or the result>
```

Task lines must start with `- ` or Copilot does not count them. The front desk copies the `tasks` lines into the root to-do list unchanged, prefixed with the objective name when several objectives are open. The `handover` (at most ten lines) is never shown to the user; it is what lets a follow-up, rollover or resume continue without replaying the conversation.
