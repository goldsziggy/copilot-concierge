# Sample prompts

Type these to Zilot's front desk in plain language. You never need to name a specialist. Each example says what you should see; the ones marked *verified* were run in real sessions (see [runtime verification](../references/runtime-verification.md)).

## A goal that needs a decision

> Make the basket screen better for our customers.

Zilot looks at the project first, then asks one focused question with suggested answers, such as which problem to fix. *Verified.*

## A clear change

> Make total([]) return 0 and keep the current behaviour for positive and negative numbers. Run the focused tests.

You see a short plan and an "Approve this plan?" question. After you approve, a specialist makes the change and runs the tests, and Zilot reports what changed and how it was checked. *Verified.*

## Several things at once

> Make total([]) return 0, and add an accessible clearBasketButton contract to src/ui.mjs that reuses the existing enterprise-ui tokens. Run the focused tests.

Independent pieces go to separate specialists, sometimes in parallel, followed by a review. The task list shows each piece. *Verified.*

## A ticket

> PROJ-4821

Zilot looks for a connected tool that can read your ticket system (for example a Jira MCP server you already use in Copilot). If one exists, it fetches the ticket and works out the request, repository, acceptance criteria, dependencies and open questions. If none is connected, it says so and asks you to paste the ticket. *The "not connected" path is verified.*

## A follow-up

> Also make sure a single negative value still works, like total([-4]) returning -4, and add that to the focused test.

Goes to the same piece of work, which keeps its context. *Verified.*

## Something unrelated

> Unrelated question: which design system does this project use for UI, and what are its button rules? Just explain, no changes.

Starts a separate piece of work and answers without changing files. *Verified.*

## Using your team's agents

> Run an accessibility audit of src/ui.mjs. No changes.

If your extra directory contains a better-suited agent (here a team `accessibility-auditor` with its own checklist skill), Zilot uses it. *Verified.*

## Approval preferences

> Go ahead without asking me to approve the plan.

> Ask me before you change anything.

These apply to the current request or session and take precedence over `.zilot/config.json` and `~/.config/zilot/config.json`.

## Stopping and resuming

> Stop.

> Please continue where you left off.

Zilot asks its workers to stop and reports what finished; the host's own stop control (Esc, `/tasks`, or the app's stop and Cancel buttons) halts running agents immediately. When you continue, it first checks what already exists so nothing runs twice. *Verified.*
