# Sample prompts

Start `copilot --agent copilot-concierge:concierge`, or choose **concierge** in the app, and describe your goal in plain language. You never need to name a specialist. The *verified* labels below refer only to historical Zilot 0.3.0 sessions; they are not current-version acceptance (see [runtime verification](../references/runtime-verification.md)).

## A goal that needs a decision

> Make the basket screen better for our customers.

Concierge looks at the project first, then asks one focused question with suggested answers, such as which problem to fix. *Verified.*

## A clear change

> Make total([]) return 0 and keep the current behaviour for positive and negative numbers. Run the focused tests.

You see a short plan and an "Approve this plan?" question. After you approve, a specialist makes the change and runs the tests, and Concierge reports what changed and how it was checked. *Verified.*

## Several things at once

> Make total([]) return 0, and add an accessible clearBasketButton contract to src/ui.mjs that reuses the existing enterprise-ui tokens. Run the focused tests.

Independent pieces go to separate specialists, sometimes in parallel, followed by a review. The task list shows each piece. *Verified.*

## A ticket

> PROJ-4821

Concierge looks for a connected tool that can read your ticket system (for example a Jira MCP server you already use in Copilot). If one exists, it fetches the ticket and works out the request, repository, acceptance criteria, dependencies and open questions. If none is connected, it says so and asks you to paste the ticket. *The "not connected" path is verified.*

## A follow-up

> Also make sure a single negative value still works, like total([-4]) returning -4, and add that to the focused test.

Goes to the same piece of work, which keeps its context. *Verified.*

## Something unrelated

> Unrelated question: which design system does this project use for UI, and what are its button rules? Just explain, no changes.

Starts a separate piece of work and answers without changing files. *Verified.*

## Using your team's agents

> Run an accessibility audit of src/ui.mjs. No changes.

Add an explicit `copilot-concierge-routing` row for your team agent (for example `accessibility-auditor`) and its checklist skill. Concierge uses a route only after verifying the exact discovered profile and its single required model pin. Historical custom routing was *verified* under Zilot 0.3.0; the current eligibility checks are recorded separately.

## Learning the project

> Help me understand how this project is organized and which checks matter before I make a change.

Scout gathers source evidence and may create or refresh `.copilot-concierge/project-notes.md` for future requests. Notes stay within 12 facts and 2 KiB, use safe paths and remain advisory. Say “Do not write any files, including project notes” for wholly read-only discovery. This describes the current instruction contract, not a historical acceptance result.

## Preparing a draft PR or MR

After verified implementation, accept Concierge's offer to run read-only preflight if you want a draft request. It checks the destination, published commits, duplicate requests and existing authorized tools. You then see the exact proposal and decide whether to create it. You can decline either step. It does not commit, push or merge, and plan approval does not approve publication. Live provider draft creation remains unverified.

## Approval preferences

> Go ahead without asking me to approve the plan.

> Ask me before you change anything.

These apply to the current request or session and take precedence over `.copilot-concierge/config.json` and `~/.config/copilot-concierge/config.json`.

## Stopping and resuming

> Stop.

> Please continue where you left off.

Concierge asks its workers to stop and reports what finished; the host's own stop control (Esc, `/tasks`, or the app's stop and Cancel buttons) halts running agents immediately. When you continue, it first checks what already exists so nothing runs twice. *Verified.*
