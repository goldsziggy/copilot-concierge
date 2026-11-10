# Autonomy

Autonomy says who settles the ordinary decisions that come up while Concierge works. It has two modes.

| Mode | Built for | Behavior |
| --- | --- | --- |
| `guided` (default) | A conversation | Concierge relays questions, shows the plan and pauses between phases of long work. |
| `full` | Unattended runs, such as a CI job | The orchestrator decides for itself, records each decision, and carries the task to a verified result. It never asks a question. |

Autonomy is a workflow preference, like [plan approval](approval-preference.md). It changes who answers, not what is allowed: Copilot's tool, path and URL permissions stay in force, and Concierge adds no permission flag in either mode.

## Choosing a mode

The nearest setting wins:

1. Your words for this request ("just handle it, don't ask me", "check with me first").
2. Your words earlier in the session.
3. The launcher's `--autonomy guided|full` flag.
4. The `COPILOT_CONCIERGE_AUTONOMY` environment variable.
5. A launcher `--session-config` file.
6. The project file `.copilot-concierge/config.json`.
7. The user file `~/.config/copilot-concierge/config.json`.
8. The default, `guided`.

```json
{ "autonomy": "full" }
```

To swap modes without editing a file, set the variable:

```sh
COPILOT_CONCIERGE_AUTONOMY=full copilot --agent copilot-concierge:concierge
```

Only `guided` and `full` are accepted, in lower case. Each result states the mode in force and where it came from.

How reliably the variable is read depends on how Concierge is started:

- **Through the launcher** (`node scripts/launch.mjs`): the launcher reads the variable, refuses an invalid value, and writes the resolved mode into every agent before the session starts. This is the dependable route and the one to use in CI.
- **In a plain plugin install**: nothing runs before the session, so the orchestrator reads the project file with its file tool and the variable with a shell command. If that command is not permitted, as in a non-interactive run with a narrow allowlist, the variable is not seen. Put `{"autonomy": "full"}` in `.copilot-concierge/config.json`, or say it in the task.

## What `full` does

- **Decides for you.** Where it would have asked an ordinary question, the orchestrator takes the answer it would have recommended and records it. The result lists these under "Decided for you:" so you can reverse one with a follow-up.
- **Does not pause.** No plan checkpoint and no stop between the phases your request covers. With plan approval `auto`, the plan appears in the result.
- **Finishes in-scope work.** A check that did not run, or a failure its own change caused, is done rather than offered as a suggestion. Suggestions are kept for work beyond the request.
- **Checks the result against the goal.** Before reporting `done`, Concierge compares the report with the acceptance criteria. If one has no stated verification, it sends the orchestrator back once to verify it or say why it cannot.
- **Never asks.** The launcher also starts Copilot with `--no-ask-user`.

## Hard stops

`full` still stops, and reports `blocked` with exactly what is needed, for:

- something only you can supply, such as access, credentials or content it cannot reach;
- an action your request did not name that is destructive, hard to undo or reaches beyond the repository: deleting data, force-pushing or rewriting history, deploying, publishing, releasing, sending messages or spending money;
- a choice between materially different outcomes that would be costly to reverse;
- a conflict with a restriction you stated.

If you are present, answer in your next message. An unattended run ends there.

## What stops a runaway run

- **The host's spend cap.** `--max-ai-credits` ends the session when it is reached. The launcher requires it for a one-task run.
- **The host's own limits.** Sub-agents nest at most four deep and run under a concurrency limit, and a non-interactive run stops waiting for background agents after `COPILOT_TASK_WAIT_TIMEOUT_SECONDS`.
- **Concierge's structure.** Specialists cannot start agents, there is one orchestrator per objective, and a blocked objective is never restarted.
- **Instructions.** The orchestrator reports a hard stop once and ends its turn, tries a denied action once more in its plain form and never the same call twice, and stops retrying a step that fails the same way twice. Concierge sends at most one completion check, sends nothing after a `blocked` report, and stops continuing an orchestrator whose task list has not changed between two reports.

The first three hold whatever a model does. The last is an instruction contract; see the verification status below for what was observed.

## What `full` does not change

- **Plan approval.** `planApproval: "ask"` is not overridden. The run stops once at the plan and reports `needs_approval`; use `auto` for a job that should run to completion.
- **Git.** Commits, pushes and pull requests happen only when the task asks for them.
- **Scope and restrictions.** The requested scope, "do not write any files" and the separate memory and knowledge rules apply as before. An inferred preference is not saved without your confirmation.
- **Review and retries.** Risky changes still get an independent review, and a failed step is retried once, then reported.
- **Permissions.** Copilot decides each tool call. See below for a non-interactive run.

## One task in CI

The launcher runs one task without a prompt and turns Concierge's result into an exit status. A one-task run needs `full` autonomy, because nobody is there to answer; the launcher refuses to start one in `guided` mode.

```sh
COPILOT_CONCIERGE_AUTONOMY=full node scripts/launch.mjs \
  --project . --task-file task.md -- --allow-tool write --allow-tool 'shell(npm test)' --max-ai-credits 30
```

- `--task TEXT` or `--task-file FILE` gives the task. A task file is limited to 16 KiB.
- `--max-ai-credits N` must be among the forwarded flags. An unattended run without a spend cap is refused, because the host's cap is the only limit that does not depend on an agent following instructions.
- Flags after `--` go to `copilot` unchanged, and only with a task. The launcher sets `--agent`, `--model`, `--plugin-dir` and the prompt itself and refuses forwarded copies.
- Copilot's non-interactive mode cannot show permission prompts, so the job must grant what the task needs: forward `--allow-tool`, `--deny-tool` or `--allow-all-tools`, or set Copilot's own `COPILOT_ALLOW_ALL`. Concierge never adds these for you. Prefer the narrowest set, such as `write` plus the exact test command, and cap spend with `--max-ai-credits` (Copilot CLI 1.0.98 requires at least 30).
- The agent's answer goes to standard output. The launcher's own lines go to standard error.

Concierge ends its answer with `CONCIERGE-RESULT: <status> <objective-id>`, and the launcher exits with:

| Exit status | Meaning |
| --- | --- |
| 0 | `done` |
| 2 | `blocked`, `cancelled` or `needs_approval` |
| 3 | no result line: the outcome is unknown, so the job fails |
| other | Copilot's own failure status |

A GitHub Actions step, assuming the Copilot CLI is installed on the runner:

```yaml
- name: Run the task with Concierge
  env:
    COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_TOKEN }}
    COPILOT_CONCIERGE_AUTONOMY: full
  run: >
    node scripts/launch.mjs --project "$GITHUB_WORKSPACE" --task-file .github/concierge-task.md
    -- --allow-tool write --allow-tool 'shell(npm test)' --max-ai-credits 30
```

What Copilot CLI itself does in a non-interactive run, from its 1.0.98 help text and changelog:

- It waits for background agents before exiting, up to `COPILOT_TASK_WAIT_TIMEOUT_SECONDS`, and warns on standard error if it stops waiting. Set that variable to cover your longest expected run.
- A tool call that is not allowed is denied rather than prompted. The agent then reports what it could not do.
- Repository hooks and workspace MCP servers load only when the folder is already trusted, so a ticket connector configured in the repository may be absent in CI.
- `COPILOT_ALLOW_ALL=true` also trusts the working directory, which loads that directory's skills, plugins, MCP servers and hooks. Use narrower flags on code you did not write.
- Sub-agents may nest four levels deep by default. Concierge uses two below the entry agent, and specialists never start agents.

Write the task as you would say it, including what "done" means and whether to commit or open a pull request. Without a Git request, changes stay uncommitted in the job's checkout.

## Verification status

The setting, its precedence, the launcher's arguments and its exit statuses are covered by tests that make no model calls. Three bounded non-interactive trials on Copilot CLI 1.0.98 then ran `full` autonomy for real: one failed and drove fixes, and two completed their task with only file edits and `npm test` allowed, the last one reading the variable through a launcher-configured copy and ending with the result line. Each cost 12 to 16 AI credits for a small change. Two hard-stop trials, a missing ticket and a missing credential, ended `blocked` with one orchestrator launch, no repeated command, no workaround and no file changed, and a `guided` trial completed through its plan checkpoint. The completion check, the "same task list twice" guard and the launcher process on Windows have not been run live; see [runtime verification](runtime-verification.md).
