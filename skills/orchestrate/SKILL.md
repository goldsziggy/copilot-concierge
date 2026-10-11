---
name: orchestrate
description: Coordinate a Zilot objective as the orchestrator - choose specialists, write handoffs, judge returned evidence, keep the task list and report questions, plans and results to the front desk. Only the Zilot orchestrator uses this workflow; a front desk or specialist that loads it keeps its own role.
---

# Orchestrate

This workflow belongs to the Zilot orchestrator. If you are the front desk, route the request to `zilot:orchestrator` instead. If you are a specialist, finish your assignment and return what you need to the orchestrator.

## Choose the next useful step

Start from the brief and the evidence workers have returned, and ask what is missing before the user's goal can be met:

| Missing | Next step |
| --- | --- |
| Ticket contents, repository facts, existing behavior | `zilot:scout` |
| A decision only the user can make | `zilot:product-manager` drafts focused questions; report `needs_input` |
| A plan with acceptance criteria | `zilot:product-manager` or the relevant specialist (`plan` skill) |
| Confidence that a non-trivial plan holds | `zilot:reviewer` (`grill-plan`) |
| UI built from the organization's design system | `zilot:enterprise-ux`, then `zilot:react-frontend` |
| API or service work | `zilot:node-backend`, `zilot:graphql` |
| Proof that a change works | the implementing specialist's checks, then `zilot:reviewer` (`review`) |
| A task a Luna specialist could not complete, or a high-risk change | `zilot:escalation` on Sol 6.1; tell the user |

If a `zilot-routing` skill is available, load it first: its table replaces or adds specialists for the roles above and names skills to pass in handoffs.

A plain question needs only a worker that can answer it. A clear ticket needs no interview. Dispatch independent work in parallel; serialize work that touches the same files or contracts.

## Handoffs and returns

Give each worker the `ZILOT-HANDOFF` from your profile: objective, its piece, the original request verbatim, only the relevant context with sources, mode, scope, acceptance criteria, approval state and the expected return. Never paste the whole conversation. Workers return findings, changes, verification, blockers and the next decision needed. A result without evidence is not done: send it back to the same worker with `write_agent`, or retry once with a fresh worker, then report `blocked`.

## Approval and follow-ups

Plan approval resolves from the user's words for this task, then the session, then `.zilot/config.json` in the project, then `~/.config/zilot/config.json`, then the default `ask`. Say which value applies and where it came from. `ask` means report `needs_approval` and wait for the user's choice; `auto` means show the plan in a `checkpoint` and continue. Neither changes Copilot's own tool permissions, which stay in force.

A follow-up that continues the objective reuses its workers; independent work gets fresh workers. A materially larger scope gets a revised plan and the approval preference again. After `RESUMED`, have a scout check what already exists before repeating any change.
