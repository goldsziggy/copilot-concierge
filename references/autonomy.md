# Autonomy

Autonomy says who settles the ordinary decisions that come up while Concierge works. It has two modes.

| Mode | Built for | Behavior |
| --- | --- | --- |
| `guided` (default) | A conversation | Concierge relays questions, shows the plan and pauses between phases of long work. |
| `full` | Unattended runs, such as an SDK-driven cloud agent | The worker settles ordinary questions itself, records each decision, and carries the task to a verified result. It never asks a question. |

Autonomy is a workflow preference, like [plan approval](approval-preference.md). It changes who answers, not what is allowed: Copilot's tool, path and URL permissions stay in force, and Concierge adds no permission flag in either mode.

A plugin installation defaults to `guided`. Containers, CI variables and cloud hosts do not turn on `full` automatically.

## Choosing a mode

The nearest setting wins:

1. Your words for this request ("just handle it, don't ask me", "use full autonomy", "check with me first").
2. Your words earlier in the session.
3. The `COPILOT_CONCIERGE_AUTONOMY` environment variable, `guided` or `full`.
4. The project file `.copilot-concierge/config.json`.
5. The user file `~/.config/copilot-concierge/config.json`.
6. The default, `guided`.

```json
{ "autonomy": "full" }
```

Only `guided` and `full` are accepted, in lower case. An invalid value is reported, and the mode stays `guided`. Each result states the mode in force and where it came from.

Your words are the most dependable source, because reading them needs no tool call. The files are read with the agent's file tool. Nothing runs before a plugin session starts, so the worker reads the environment variable with one shell command when your words do not settle the mode. If Copilot does not permit that command, the variable is treated as unset and the files decide. For unattended runs, put the mode in the prompt or the project file.

The optional [configured-copy launcher](install.md#session-local-launcher) resolves its `--autonomy` flag, the variable and the files before the session starts, and writes the result into the profiles.

## What `full` does

- **Decides for you.** Where it would have asked an ordinary question, the worker settles it through the [checklist below](#how-blockers-are-settled): from a source when one answers it, otherwise by taking the clearly safest option that is easy to reverse, and recording it. The result lists these under "Decided for you:" so you can reverse one with a follow-up.
- **Does not pause.** No plan checkpoint and no stop between the phases your request covers. With plan approval `auto`, the plan appears in the result.
- **Finishes in-scope work.** A check that did not run, or a failure its own change caused, is done rather than offered as a suggestion. Suggestions are kept for work beyond the request.
- **Checks the result against the goal.** Before reporting `done`, Concierge compares the report with the acceptance criteria. If one has no stated verification, or a follow-up has no outcome, it sends the worker back once to verify it or say why it cannot.
- **Never asks.** Concierge does not call the question tool. An SDK client can also remove that tool; see [SDK automation](sdk-automation.md).
- **Ends with a result line.** The last line of each result is `CONCIERGE-RESULT: <done|blocked|cancelled|needs_approval> <objective-id>`, in plain text, so a client can read the outcome. A question Concierge answers itself starts no objective; in a run you said is unattended, that answer ends with `CONCIERGE-RESULT: done answered`.

## How blockers are settled

The worker does not raise a blocker for something it can find out by reading the repository, the brief or a log. Otherwise it names the blocker's kind and settles it through its `escalate` skill, in either mode.

| Kind | Trigger |
| --- | --- |
| `question` | It would otherwise ask you something |
| `permission` | The work needs a tool or action it does not have, or a call was denied |
| `repeated_failure` | The same error twice in a row on the same step |
| `missing_dependency` | A credential, service, variable or test data is not available |
| `ambiguity` | Two readings of the request produce different results |
| `stall` | No new passing check, no change to the diff and no new fact for several turns |

It stops at the first step of this checklist that settles the blocker:

1. **Answer from a source.** The brief, an earlier answer of yours, a repository document or `AGENTS.md` already answers it. The worker rereads the source it cites.
2. **Retry with a hint.** The attempts so far leave an untested hypothesis. Once.
3. **Mock and continue.** An external service, credential or data set blocks a check, and the logic under change does not depend on it.
4. **Use CI.** A check that cannot run here can run somewhere the request allows, such as CI on a branch you asked it to push.
5. **Assume and flag.** Every option is easy to reverse in review and one is clearly safest. Under `full` the worker takes it and records it. Under `guided` it takes only a clearly safest ordinary default and says so, or asks when the choice is yours to make.
6. **Ask.** It needs authority or information no source holds.
7. **Abort.** The objective cannot succeed as written.

"Ask" is reported as `needs_input` under `guided`, where Concierge puts the question to you, and as `blocked` under `full`, once, with exactly what is needed and what is already finished. "Abort" is reported as `blocked` in both modes. Only the tasks that depend on the answer are parked; the worker finishes the rest first when it can.

Two caps apply to each objective: at most ten assumptions, after which the next one is asked, and at most two outcomes other than "ask" for the same blocker. The worker never assumes on permission, security, authentication, data migrations, a public API, or anything your request or a restriction contradicts, and it never deletes a test, adds a skip or changes an expected value unless the request says the behavior changed.

## Hard stops

These are always "ask", in either mode. `full` therefore still stops, and reports `blocked` with exactly what is needed, for:

- something only you can supply, such as access, credentials or content it cannot reach;
- an action your request did not name that is destructive, hard to undo or reaches beyond the repository: deleting data, force-pushing or rewriting history, merging, tagging, deploying, publishing, releasing, sending messages or spending money;
- a choice between materially different outcomes that would be costly to reverse;
- a conflict with a restriction you stated.

A denied tool call is not a hard stop: the worker finishes everything the permitted tools allow and asks only for what is still denied, naming the exact command or path.

If you are present, answer in your next message. An unattended run ends there.

## What stops a runaway run

- **The host's own limits.** Sub-agents nest at most four deep and run under a concurrency limit. Copilot's `--max-ai-credits` is a soft limit per response that resets with each user message, not a ceiling on a whole job. See the [CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#command-line-options).
- **The client's deadline.** An unattended client sets its own wall-clock limit and aborts the session; see [SDK automation](sdk-automation.md#budget-and-lifetime).
- **Concierge's structure.** There is one worker per objective, the worker runs at most three sub-agents at once, handoffs tell sub-agents not to start agents, and a blocked objective is not restarted without new user input.
- **Instructions.** The worker reports a hard stop once and ends its turn, tries a denied action once more in its plain form and never the same call twice, stops retrying a step that fails the same way twice, and keeps to the assumption and per-blocker caps above. Concierge sends at most one completion check and sends nothing after a `blocked` report. Its no-progress guard applies to repeated bare `CONTINUE` checkpoint cycles: it compares the reports' `progress` objects, and an unchanged task list alone does not establish a stall.

The host limits are enforced by Copilot. Concierge's structure and retry rules are instruction contracts; see the verification status below for what was observed.

## What `full` does not change

- **Plan approval.** `planApproval: "ask"` is not overridden. The run stops once at the plan and reports `needs_approval`; use `auto` for a run that should go to completion.
- **Git.** Commits, pushes and pull requests happen only when the task asks for them.
- **Scope and restrictions.** The requested scope, "do not write any files" and the separate memory and knowledge rules apply as before. An inferred preference is not saved without your confirmation.
- **Review and retries.** Risky changes still call for an independent review, and the result says so when no independent reviewer was available. A failed step is retried once, then reported.
- **Permissions.** Copilot decides each tool call. In a non-interactive run nobody can approve a prompt, so the session must already allow what the task needs.

## Unattended runs

Unattended automation is a Copilot SDK client that loads the plugin and drives the `concierge` agent. [SDK automation](sdk-automation.md) covers the session setup, how to choose the mode in the prompt, how to wait for the result line and how to cancel.

Write the task as you would say it, including what "done" means and whether to commit or open a pull request. Without a Git request, changes stay uncommitted in the checkout.

## Verification status

The setting, its precedence and the generated profiles are covered by tests that make no model calls. The current two-agent layout, including the blocker kinds and the `escalate` checklist, has passed those static checks only and has not been run live.

The live evidence is from release 0.10.0, which had an orchestrator agent where the worker is now. Six bounded non-interactive trials on Copilot CLI 1.0.98 (`copilot -p` with the plugin) ran those profiles for real:

- `full` autonomy: one trial failed and drove fixes, and two completed their task with only file edits and `npm test` allowed, ending with the result line. Each cost 12 to 16 AI credits for a small change.
- Two hard stops, a missing ticket and a missing credential: each ended `blocked` with one orchestrator launch (the 0.10.0 role the worker now fills), no repeated command, no workaround and no file changed.
- A `guided` trial completed through its plan checkpoint.

The completion check and the no-progress guard have not been run live in any release. SDK clients were run against 0.10.0 and 0.11; see [SDK automation](sdk-automation.md#verification) and [runtime verification](runtime-verification.md).
