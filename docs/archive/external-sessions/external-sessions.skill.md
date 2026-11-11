---
name: external-sessions
description: Hand work to an external coding session whose result the orchestrator cannot read through its own agent tools, and get the evidence back safely. Use before preparing, launching, collecting from, retrying or cancelling such a session; native workers that return directly do not need it.
---

# External sessions

Use this procedure as the Concierge orchestrator. Your agent profile controls identity, tools, model and delegation; loading this skill grants no tool, access or authority. Native workers return to you directly and need none of it. It applies only when a result must come back from a session you cannot read yourself.

## Before launch

Discover what the current host actually supports: who can launch the session, who can read it or be notified, how a result can be relayed to you, and how it can be stopped. Do not invent callbacks, tool names or another agent's access, and never assume the worker can message you.

The actor with result access owns collection. If only Concierge can read the session, name Concierge as collector and put the prepared `CONCIERGE-HANDOFF` and the control action you need in a checkpoint handover's `returns` entry. Concierge collects and relays; you own evidence acceptance and completion. That gives Concierge no implementation or review work.

You cannot discover your own agent ID. Before you prepare an external handoff, request an owner binding in a checkpoint: Concierge answers with your actual agent ID and the stable objective-id. Ask again after a rollover or resume. Keep the handoff pending until the binding arrives rather than guessing a destination.

If no supported return route exists, report `blocked` with the missing capability, the intended destination and the last confirmed state. Do not launch and then wait forever.

## Track each attempt

Give every assignment or attempt its own `handoff-id`, including a new assignment to a reused session. Until launch the session is `pending`; afterwards record the actual session ID, never a guessed one. Keep session ID to handoff-id to objective-id to current owner, with the collector, route and receipts, in the handover's `returns` entries, even when that needs extra lines. Add no scheduler, database or transport service.

Keep these states separate:

| State | What it takes |
| --- | --- |
| launch accepted | the host acknowledged the launch and returned the actual session ID |
| running or idle | host status only |
| result collected | the collector holds the correlated result and its evidence |
| relayed | a send to the current owner succeeded |
| owner accepted | you matched the IDs, checked the evidence and recorded your receipt |

Idle never means completed, and a relay acknowledgement is not acceptance. While a return is pending, report its state and the collection you need in a checkpoint; do not loop on `CONTINUE` or dispatch the work again. Prefer the host's notifications; otherwise the collector makes bounded checks with a stated limit.

## Accept or reject a result

Require the result to echo objective-id and handoff-id; the collector attaches the actual session ID when the worker cannot see it. Check all three against the recorded active assignment and current owner, then inspect the evidence against the acceptance criteria. Record `owner accepted` with the result reference only after that check, or record the exact rejection, the missing evidence and the next action. A finished session is not a finished task.

## Recover

- **Missing or uncertain return.** Reconcile the original session, its actual effects and your receipt before any retry. When the evidence was already collected, retry only the relay; never duplicate implementation to repair delivery.
- **Duplicates.** Deduplicate by handoff-id and result reference. A changed result for the same attempt needs review, not silent replacement.
- **Mismatches.** Quarantine wrong-owner results, mismatched IDs, unknown sessions and stale attempts until you have reconciled them. Never apply one to the latest active objective or route by title. A superseded attempt may still have had effects; inspect them first.
- **Inadequate evidence.** Ask the same worker for a correction through the supported route, or after reconciliation retry once with a fresh handoff-id, then report `blocked`.
- **Rollover and resume.** Keep the objective-id, original sessions, attempts, evidence, receipts and cancellation state. The successor confirms the transferred returns and updates the owner and destination without relaunching.
- **Cancellation.** Ask the collector to stop the session through the host's control and report an unavailable stop exactly. Late results are evidence to reconcile; they do not reopen cancelled work, and discarding a result does not roll its effects back.
