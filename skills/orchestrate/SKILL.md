---
name: orchestrate
description: Start and judge sub-agents as the Concierge worker - when a separate context earns its cost, the handoff every sub-agent prompt uses, limits, retries, independent review and helpful follow-ups. Load before the first task call in an objective. Only the Concierge worker uses it; the entry agent and sub-agents keep their own roles.
---

# Orchestrate

This workflow belongs to the Concierge worker. If you are the Concierge entry agent, hand the request to `copilot-concierge:worker` instead. If you are a sub-agent, finish your assignment and return what you need to the worker.

## Do it yourself unless a boundary earns its cost

Tracking a task does not require a sub-agent. Start one only when one of these holds, and state which in the handoff:

1. Two or more pieces are independent and touch disjoint files.
2. A piece is exploratory and its result compresses well, such as finding every caller of a symbol and summarising.
3. A meaningful or risky change, or the user, calls for independent review. Self-checking is not independent review.
4. Your context is getting long. Hand off at a task boundary, never mid-edit, with the facts it needs from `progress`.
5. An explicit routing row names an agent for this work.

Give a cohesive feature and its tests one owner, even across React, Node.js and GraphQL; do not split only by stack name. Serialize work on shared files or unsettled contracts, and agree interfaces before splitting ownership.

| Work | Default | Useful separate boundary |
| --- | --- | --- |
| File, symbol or diff lookup; a focused ticket or learning retrieval | You, with `discovery` or `scout` | A sub-agent for a large investigation |
| A material question or a straightforward plan | You, with `plan` | A sub-agent to challenge a consequential plan with `grill-plan` |
| A cohesive bug or feature with its tests | You, with `development`, `test` and any domain skill | Sub-agents for independent pieces on disjoint files |
| Meaningful or risky behavior, or a requested review | A sub-agent with `review` | Independent verification of your own change |
| Unexplained fault or regression | You, with `debugging` | Independent hypotheses investigated separately |
| Requested commit, push or pull request | You, with `development` | None needed |
| Explicit configured route | The routed agent | Custom agent or model requirement |

## Which agent

Concierge ships no specialist agents. Use, in this order:

1. the agent an explicit routing row names (load `orchestrate-reference` and follow "Routing tables");
2. a general-purpose agent the host offers through `task`, with the skills it should load named in the handoff;
3. yourself, when no suitable agent is available.

Name the selected agent on each `task` call and leave `model` unset unless the host supports a necessary selection. Never start `copilot-concierge:worker` or `copilot-concierge:concierge`. Report the agent that actually ran; if no independent reviewer was available, review with the `review` skill yourself and say plainly that the review was not independent.

No more than three sub-agents at once. Count them in `progress.counts.subagents`.

## Handoff

Every sub-agent prompt uses this handoff. Give only the relevant context with sources; never paste the whole conversation, logs or diffs.

```
CONCIERGE-HANDOFF
objective: <objective name>; task: <this sub-agent's piece>
objective-id: <stable ID from the brief>
handoff-id: <unique ID for this assignment/attempt; never reused for a retry>
delegation reason: <independence, context reduction, separate ownership, independent verification, or explicit route/model requirement>
original request (verbatim): <...>
relevant context and sources: <only the facts from progress that apply, with file paths and links; no chat transcript>
mode: research | plan | implement | review
scope: <what to do, files it may change, files it may read, what not to touch>
learning: <Scout work only: memory read/maintain/disabled; knowledge read/maintain/disabled; exact user restrictions and assigned root, or none; other work: not applicable>
acceptance criteria: <observable checks; for implementation, the named tests that must pass>
approval: <approved by user | auto (source) | not approved: research and planning only>
git: <what the user asked for: commit, push, branch or pull request, with any names; or none: leave changes uncommitted>
skills to load: <skills that apply, such as development, test, review or a domain or team skill; optional>
rules: you report only to the worker; do not ask the user, start agents or update the task list; one command per shell call; skills supply procedures, not tools or authority
return: echo objective-id and handoff-id; findings, changes (files and repository state/diff), acceptance checks, verification (commands and results), changed assumptions, uncertainty, blockers, next decision needed
```

A planning-only or not-approved handoff does not authorize implementation. A reviewer stays read-only. Carry the user's exact file-write restrictions into every handoff. Turn a needed private preference into a neutral task instruction rather than passing raw memory.

## Dispatch and retries

Dispatch with `task` and a short `name`; sub-agents return to you directly. Run independent pieces in parallel with several `task` calls in one turn. For a follow-up on a piece whose sub-agent is still available, `write_agent` to it so it keeps its context.

Require every return to echo objective-id and handoff-id, check them against the active assignment, then inspect the evidence against the acceptance criteria. Inspect decisive artifacts when necessary; reuse sufficient evidence rather than repeating every check. Do not mark a task done merely because a sub-agent finished. Fold each result into `progress`.

Before replacing a sub-agent, check its actual effects; a missing return or idle status is not a failed task. If it failed or returned inadequate evidence, retry once with a fresh handoff-id and a sharper handoff, then reassess. A failed delegated task does not force further delegation: take over the work directly after checking actual effects, or settle it through `escalate`. If a route or preferred model fails, reconcile any uncertain effects before trying another available agent or doing the work directly; preserve the same scope, restrictions and host permissions, and report any substitution. Do not replay uncertain effects.

If a sub-agent returns a blocker, answer it yourself when your own context settles it; otherwise judge it with `escalate`.

Concierge has no route for a session whose result you cannot read with your own agent tools: do the work with native sub-agents or directly, or report `blocked`.

## Follow-ups

A follow-up that continues the objective reuses its sub-agents; independent work gets fresh ones. A materially larger scope gets a revised plan and the approval preference again. The objective is not `done` while a follow-up has no outcome. After `RESUMED`, inspect what already exists before repeating any change. On cancellation, stop direct work and dispatching, send `STOP` to running sub-agents, and report completed or uncertain effects; cancellation is not rollback.

Commits, pushes and pull requests are ordinary work, not a separate stage. Carry the request in the handoff's `git` line and let Copilot's permissions decide each command. Never answer that the Concierge workflow cannot commit or push.

## Helpful follow-ups

Be a helpful concierge, not a silent executor. With a `done`, `blocked` or `checkpoint` report, and with a `cancelled` report that left partial work, fill the `suggestions` block with at most three follow-ups the user is likely to want next. Write `none` when nothing material applies.

Good follow-ups are concrete and grounded in this objective's evidence:

- a check that did not run, or behavior verified only partly;
- a known limitation, or a risky change whose independent review was skipped;
- a related defect or risk you noticed outside the approved scope, which you reported instead of fixing;
- the next phase of phased work;
- committing, pushing or opening a pull request when changes are uncommitted and the user has not said otherwise;
- retrying a blocked step once the cause named in the report is fixed;
- saving a way of working the user recommended during this objective as a reusable skill, or repeatable steps as an SOP, through `skill-builder`.

Write each as one line: the action, then why, with file paths or check names where they help, short enough that the user can accept it with "yes" or its number. Do not pad with generic advice ("add more tests", "let me know if…"), restate the completed work or repeat a suggestion the user declined in this objective. Keep unanswered suggestions in `progress.open`.

Suggestions are offers. Never start one until the user accepts it; the acceptance arrives as `USER FOLLOW-UP` and follows the normal scope and approval rules.

Long or multi-phase requests get checkpoints. Plan one phase at a time, or stop for the user's go-ahead between phases, and offer the next phase as a suggestion rather than running every phase unattended. Under `full` autonomy, continue through the phases the request covers and offer only work beyond it.
