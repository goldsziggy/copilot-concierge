# Container and cloud workers

Use the existing one-task launcher as the worker process for a container, CI job or cloud task runner. Set `COPILOT_CONCIERGE_AUTONOMY=full` in that process's environment. The launcher resolves the setting before starting a model and includes it in a fresh configured plugin copy.

A normal plugin installation stays `guided` by default. No container detection, `CI` variable or cloud provider silently selects `full`, and there is no third service mode. A plain `copilot --agent copilot-concierge:concierge` session needs a permitted shell read to see the environment variable; the launcher is the deterministic route for services.

## Runtime layout

Provision Node.js 20 or later, Git, and a Copilot CLI installation compatible with the [recorded host capabilities](capability-matrix.md). The CLI must already be available on `PATH`. Use a pinned plugin release or commit and the CLI version your service has validated.

| Location | Access | Purpose |
| --- | --- | --- |
| `/opt/copilot-concierge` | Read-only is sufficient | The complete extracted plugin or repository checkout, including `scripts/launch.mjs`. |
| `/work/project` | Writable for implementation; read-only for an explicitly read-only task | The assigned checkout and project configuration. |
| `/run/concierge/task.md` | Read-only | The request and observable acceptance criteria, up to 16 KiB. |
| `/tmp/concierge-sessions` | Writable | A fresh `session-*` plugin copy with the resolved configuration for each run. Keep this outside the plugin source. |
| The service account's home and Copilot state directory | Writable where the CLI needs state | CLI configuration, sessions and other native state; independent of the plugin copy. |

Authenticate at runtime through your existing Copilot account or the platform's secret injection, such as `COPILOT_GITHUB_TOKEN`. Keep credentials out of the image, task text and repository. Copilot supports environment-based authentication for headless use; supported token types and permissions are described in the [CLI authentication reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#copilot-login-options).

The service owns whether native state persists between jobs. Repository knowledge and project workflow skills stay with the assigned checkout; private preferences and personal skills use the service account's home. Temporary generated plugin copies are not a replacement for either store. Use an isolated account/state directory per tenant and separate worktrees for concurrent tasks that may edit the same repository.

## Worker command

Configure this environment variable in the job definition:

```text
COPILOT_CONCIERGE_AUTONOMY=full
```

Run one task:

```sh
node /opt/copilot-concierge/scripts/launch.mjs \
  --project /work/project \
  --output-parent /tmp/concierge-sessions \
  --plan-approval auto \
  --task-file /run/concierge/task.md \
  -- --allow-tool write --allow-tool 'shell(npm test)' --max-ai-credits 30
```

Use an argument-array entrypoint where the platform supports one. If the platform needs a shell wrapper, finish it with `exec node ...` so shutdown reaches the launcher.

`--project` selects both the project configuration and the CLI working directory. An absolute task-file path avoids dependence on the container's initial working directory. `--output-parent` lets the plugin remain read-only; the launcher creates a unique child directory for each run and reports its path on standard error. The service may remove generated copies after the process exits and any needed diagnostics are retained.

Plan approval is separate from autonomy. `--plan-approval auto` explicitly chooses to proceed with the plan for this job. Omit it when an existing `planApproval: "ask"` must remain in effect; that run reports `needs_approval` and exits instead of waiting for someone to answer. `full` never changes tool permissions, authorizes a commit or deployment, or expands the task's scope.

The native permission flags after `--` are examples for a task that edits files and runs `npm test`. Supply the commands, paths and integrations the actual task needs. The launcher adds no permission flag. Missing access produces a blocked result; repository-configured hooks and MCP servers still depend on Copilot's trust settings.

## Budget and lifetime

Every one-task run requires an explicit `--max-ai-credits`. The example uses 30, matching the minimum observed in the recorded CLI 1.0.98 trials. GitHub's current [command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#command-line-options) describes this as a soft limit per response that resets with each user message. It is not a guaranteed total-job spend ceiling.

Set the job runner's wall-clock timeout and any account spending controls separately. Configure `COPILOT_TASK_WAIT_TIMEOUT_SECONDS` for the time your CLI may wait for background agents; that wait is distinct from the service's overall deadline.

The launcher runs one objective and exits. Your existing queue or service supervises it, collects the result and decides when another job should start. Concierge does not install a daemon, HTTP server, scheduler or retry service.

## Result and shutdown

Task mode closes standard input and requests silent, uncolored text from Copilot. Standard output carries the agent response; standard error carries launcher configuration and diagnostics. The launcher owns output-format flags so forwarded options cannot turn tool output or JSON into a result stream.

The answer ends with a complete record:

```text
CONCIERGE-RESULT: done <objective-id>
```

Use the process exit status for the job result:

| Exit status | Meaning | Service action |
| --- | --- | --- |
| `0` | Concierge reported `done` with a valid final record, and the CLI exited successfully. | Retain the report and requested artifacts. |
| `2` | `blocked`, `cancelled` or `needs_approval`. | Surface the reason or approval requirement. |
| `3` | No valid final result record. | Treat the outcome as unknown and inspect the report and workspace. |
| `130` / `143` | `SIGINT` / `SIGTERM` interruption. | Record interruption and reconcile any partial work. |
| Other nonzero status | Startup, configuration or CLI failure. | Retain diagnostics and resolve that failure. |

The launcher forwards `SIGINT` and `SIGTERM` to its Copilot child. Shutdown and a nonzero exit do not roll back repository changes. Before retrying, inspect the existing checkout and any reported external effects; an unknown result is not evidence that nothing happened.

## Configuration-only check

Inspect the same environment and configuration without starting Copilot or using model credits:

```sh
COPILOT_CONCIERGE_AUTONOMY=full node /opt/copilot-concierge/scripts/configure.mjs \
  --project /work/project --plan-approval auto --print-only
```

The result should name `full` and `environment: COPILOT_CONCIERGE_AUTONOMY`, unless you supplied a higher-priority `--autonomy` flag. Leaving the variable unset, with no other autonomy preference, resolves to `guided`; one-task mode then refuses to start. The same plugin therefore supports ordinary guided conversations and explicitly configured unattended workers.

## Verification scope

Launcher configuration, arguments, result parsing and process behavior are checked with local fixtures that make no model calls. The existing live trials cover selected Copilot CLI 1.0.98 tasks on Windows, including a launcher-configured copy; they do not establish acceptance of this complete container or cloud setup. No live container deployment, cloud service, new CLI authentication or model trial is claimed here. See [runtime verification](runtime-verification.md) for the evidence and remaining gaps.
