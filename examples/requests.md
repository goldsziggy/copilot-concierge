# Sample prompts

Start `copilot --agent copilot-concierge:concierge`, or choose **concierge** in the app, and describe your goal in plain language. You never need to name a specialist. The *verified* labels below refer only to historical Zilot 0.3.0 sessions; they are not current-version acceptance (see [runtime verification](../references/runtime-verification.md)).

## A goal that needs a decision

> Make the basket screen better for our customers.

Concierge looks at the project first, then asks one focused question with suggested answers, such as which problem to fix. *Verified.*

## A clear change

> Make total([]) return 0 and keep the current behaviour for positive and negative numbers. Run the focused tests.

You see a short plan and Concierge continues; with `planApproval` set to `ask` you get an "Approve this plan?" question first. The change is made, the tests run, and Concierge reports what changed and how it was checked. *The approval-question path is verified.*

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

Add an explicit `copilot-concierge-routing` row for your team agent (for example `accessibility-auditor`) and its checklist skill. Concierge prefers the named agent when that exact profile is available; its model is a preference, and any substitution is reported. Historical custom routing was *verified* under Zilot 0.3.0; the current eligibility checks are recorded separately.

## Learning the project

> Help me understand how this project is organized and which checks matter before I make a change.

Scout gathers source evidence and may maintain `docs/concierge/knowledge.md` for future requests. It records confirmed facts with sources and dates, preserving other documentation. Say “Do not write any files” for discovery without memory or knowledge writes. This is an instruction contract, not a live acceptance result.

## Personal preferences

> Remember that I prefer a short summary, then details.

This is a private preference used across your projects on this computer. It does not go into repository documentation or commits. Concierge asks before saving a preference inferred from repeated behavior rather than your direct words.

> What do you remember about me?

> Change my preference: give me the detailed explanation first.

> Forget my preference for short answers.

> Stop remembering my preferences.

You can inspect, correct, remove or disable saved preferences. “Forget all my preferences” clears saved preferences; “stop remembering” clears saved preferences and prevents future saves until you ask to resume. These requests do not erase Copilot's own chat history.

## Knowledge that belongs with the code

> Document why we use integer cents for prices.

Scout checks the code, tests and existing design records. If the reason is supported, it records a confirmed decision and its sources in `docs/concierge/knowledge.md`; otherwise it asks for the missing rationale instead of inventing one. A description of what the code does is not proof of why it was chosen.

> Correct the checkout rule: shipping is free from 50, not 75. Check the current tests before updating the docs.

> Remove the obsolete payment finding from Concierge's knowledge.

Corrections must agree with current repository evidence. Removing a managed entry preserves other entries and user-written text. If committing is already part of the task, the implementer reviews the knowledge diff and includes the relevant update deliberately; Scout never commits it itself. See [memory and knowledge](../references/memory-and-knowledge.md).

## Committing and opening a pull request

> Fix the date parsing bug, commit it on a new branch and open a draft PR.

> Commit what you just changed and push it.

Concierge treats these as ordinary work. The plan lists the push and pull request under Watch-outs, and Copilot's tool permissions decide each command. Without such a request, changes stay uncommitted and the result says so.

## Next steps

> yes, do 2

Results end with up to three suggested follow-ups, such as a check that didn't run or committing the changes. Reply with "yes" or a number to accept one; nothing starts until you do.

## Workflows you want repeated

> Remember how we review merge requests: check the migrations first, then run the contract tests, then read the diff for missing error handling.

Concierge saves the steps as a skill in `.github/skills/`, tells you its name and path, and uses it in later sessions when a review comes up.

> From now on, always run the integration suite serially before the unit tests.

> What workflows do you remember?

> Forget the review workflow.

If you recommend a way of doing something while Concierge works, it follows it and offers to save it under "Next steps". See [memory and knowledge](../references/memory-and-knowledge.md#workflows-become-skills).

## Approval preferences

> Go ahead without asking me to approve the plan.

> Ask me before you change anything.

These apply to the current request or session and take precedence over `.copilot-concierge/config.json` and `~/.config/copilot-concierge/config.json`.

## Handing the whole task over

> Fix the flaky date test and run the suite. Just handle it, don't ask me.

Concierge settles ordinary questions itself and lists what it decided. It still stops for a missing credential, a consequential action outside the request, or plan approval set to `ask`. Say "check with me first" to return to `guided`, the normal installation default. See [autonomy](../references/autonomy.md) and its separate live-verification limits.

For a container or cloud job, pass the same mode to the launcher through the environment:

```sh
COPILOT_CONCIERGE_AUTONOMY=full node /opt/copilot-concierge/scripts/launch.mjs \
  --project /work/project --output-parent /tmp/concierge-sessions \
  --plan-approval auto --task-file /run/concierge/task.md \
  -- --allow-tool write --allow-tool 'shell(npm test)' --max-ai-credits 30
```

The launcher reads the variable before any model starts. `--plan-approval auto` is the operator's separate decision to proceed with the plan; the caller also supplies the tool permissions and credit limit. The plugin source can be read-only because the generated copy goes under `--output-parent`. See [container setup](../references/container-service.md), including the credit limit's scope and job timeouts.

## Stopping and resuming

> Stop.

> Please continue where you left off.

Concierge asks its workers to stop and reports what finished; the host's own stop control (Esc, `/tasks`, or the app's stop and Cancel buttons) halts running agents immediately. When you continue, it first checks what already exists so nothing runs twice. *Verified.*
