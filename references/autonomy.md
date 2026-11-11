# Autonomy

Autonomy says who settles the ordinary decisions that come up while Concierge works. It has two modes.

| Mode | Built for | Behavior |
| --- | --- | --- |
| `guided` (default) | A conversation | Concierge relays questions, shows the plan and pauses between phases of long work. |
| `full` | Unattended runs, such as an SDK-driven cloud agent | The orchestrator decides for itself, records each decision, and carries the task to a verified result. It never asks a question. |

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

Your words are the most dependable source, because reading them needs no tool call. The files are read with the agent's file tool. Nothing runs before a plugin session starts, so the orchestrator reads the environment variable with one shell command when your words do not settle the mode. If Copilot does not permit that command, the variable is treated as unset and the files decide. For unattended runs, put the mode in the prompt or the project file.

The optional [configured-copy launcher](install.md#session-local-launcher) resolves its `--autonomy` flag, the variable and the files before the session starts, and writes the result into the profiles.

## What `full` does

- **Decides for you.** Where it would have asked an ordinary question, the orchestrator takes the answer it would have recommended and records it. The result lists these under "Decided for you:" so you can reverse one with a follow-up.
- **Does not pause.** No plan checkpoint and no stop between the phases your request covers. With plan approval `auto`, the plan appears in the result.
- **Finishes in-scope work.** A check that did not run, or a failure its own change caused, is done rather than offered as a suggestion. Suggestions are kept for work beyond the request.
- **Checks the result against the goal.** Before reporting `done`, Concierge compares the report with the acceptance criteria. If one has no stated verification, it sends the orchestrator back once to verify it or say why it cannot.
- **Never asks.** Concierge does not call the question tool. An SDK client can also remove that tool; see [SDK automation](sdk-automation.md).
- **Ends with a result line.** The last line of each result is `CONCIERGE-RESULT: <done|blocked|cancelled|needs_approval> <objective-id>`, in plain text, so a client can read the outcome.

## Hard stops

`full` still stops, and reports `blocked` with exactly what is needed, for:

- something only you can supply, such as access, credentials or content it cannot reach;
- an action your request did not name that is destructive, hard to undo or reaches beyond the repository: deleting data, force-pushing or rewriting history, deploying, publishing, releasing, sending messages or spending money;
- a choice between materially different outcomes that would be costly to reverse;
- a conflict with a restriction you stated.

If you are present, answer in your next message. An unattended run ends there.

## What stops a runaway run

- **The host's own limits.** Sub-agents nest at most four deep and run under a concurrency limit. Copilot's `--max-ai-credits` is a soft limit per response that resets with each user message, not a ceiling on a whole job. See the [CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#command-line-options).
- **The client's deadline.** An unattended client sets its own wall-clock limit and aborts the session; see [SDK automation](sdk-automation.md#budget-and-lifetime).
- **Concierge's structure.** Specialists do not start agents, there is one orchestrator per objective, and a blocked objective is not restarted without new user input.
- **Instructions.** The orchestrator reports a hard stop once and ends its turn, tries a denied action once more in its plain form and never the same call twice, and stops retrying a step that fails the same way twice. Concierge sends at most one completion check and sends nothing after a `blocked` report. Its no-progress guard applies to repeated bare `CONTINUE` checkpoint cycles; an unchanged task list alone does not invalidate new evidence, owner bindings, receipts or a terminal result.

The host limits are enforced by Copilot. Concierge's structure and retry rules are instruction contracts; see the verification status below for what was observed.

## What `full` does not change

- **Plan approval.** `planApproval: "ask"` is not overridden. The run stops once at the plan and reports `needs_approval`; use `auto` for a run that should go to completion.
- **Git.** Commits, pushes and pull requests happen only when the task asks for them.
- **Scope and restrictions.** The requested scope, "do not write any files" and the separate memory and knowledge rules apply as before. An inferred preference is not saved without your confirmation.
- **Review and retries.** Risky changes still get an independent review, and a failed step is retried once, then reported.
- **Permissions.** Copilot decides each tool call. In a non-interactive run nobody can approve a prompt, so the session must already allow what the task needs.

## Unattended runs

Unattended automation is a Copilot SDK client that loads the plugin and drives the `concierge` agent. [SDK automation](sdk-automation.md) covers the session setup, how to choose the mode in the prompt, how to wait for the result line and how to cancel.

Write the task as you would say it, including what "done" means and whether to commit or open a pull request. Without a Git request, changes stay uncommitted in the checkout.

## Verification status

The setting, its precedence and the generated profiles are covered by tests that make no model calls. Six bounded non-interactive trials on Copilot CLI 1.0.98 (`copilot -p` with the plugin) then ran the profiles for real:

- `full` autonomy: one trial failed and drove fixes, and two completed their task with only file edits and `npm test` allowed, ending with the result line. Each cost 12 to 16 AI credits for a small change.
- Two hard stops, a missing ticket and a missing credential: each ended `blocked` with one orchestrator launch, no repeated command, no workaround and no file changed.
- A `guided` trial completed through its plan checkpoint.

The completion check, the no-progress guard and an SDK client have not been run live; see [runtime verification](runtime-verification.md).
