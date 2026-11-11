# Automating Concierge with the Copilot SDK

People use Concierge as a plugin, in the CLI or the app. A service that runs Concierge without a person, such as a cloud agent or a job queue, is a host application built on the [GitHub Copilot SDK](https://github.com/github/copilot-sdk). It loads the same plugin and drives the `concierge` agent. Concierge ships no service, wrapper or task runner of its own.

This page lists what such a client does with the plugin as it is. The SDK facts come from the type definitions and README of `@github/copilot-sdk` 1.0.31, read on 2026-11-10, and from three live trials with that SDK; see [verification](#verification).

## Session setup

| Concern | What the client does |
| --- | --- |
| Plugin | Install it for the service account (`copilot plugin install copilot-concierge@copilot-concierge`), or pass a pinned checkout in the session's `pluginDirectories`. |
| Working directory | Set `workingDirectory` to the assigned checkout. Project configuration, knowledge and saved workflow skills come from there. |
| Agent | Select the plugin's `concierge` agent: the `agent` session option or `session.rpc.agent.select({ name })`, using the name `session.rpc.agent.list()` reports. The CLI calls it `copilot-concierge:concierge`. |
| Model | `auto` for the session, which is Copilot Fusion on CLI 1.0.104 and later. The SDK refused the `fusion` alias in `createSession` with CLI 1.0.109, so use `auto`. The orchestrator and specialists keep their own pinned models. |
| Questions | Leave out `onUserInputRequest`. The SDK offers the `ask_user` tool only when that handler is provided, so nobody can be asked. |
| Permissions | Answer each tool call in `onPermissionRequest`. Approve only what the task needs, such as file writes and the exact test command. Concierge never asks for a bypass. |

## Choosing autonomy and plan approval

State both in the prompt. The user's own words outrank every other source and need no tool call:

> Use full autonomy: decide ordinary questions yourself and don't ask me. Proceed without plan approval. Fix the failing basket test and run `npm test`. Do not commit.

Other sources still apply when the prompt says nothing. They are listed in [autonomy](autonomy.md#choosing-a-mode):

- `{"autonomy": "full", "planApproval": "auto"}` in the checkout's `.copilot-concierge/config.json`, read with the agent's file tool.
- `COPILOT_CONCIERGE_AUTONOMY` in the CLI process environment. The orchestrator reads it with one shell command, so the permission handler must approve that read. If it does not, the variable is treated as unset.

`full` never overrides `planApproval: "ask"`. Such a run ends with `needs_approval`, and the client answers with a follow-up message, as below.

## Waiting for the result

Do not rely on `sendAndWait`'s return value for the result. In all three live trials, `sendAndWait` waited through the background orchestrator until the session was idle. With CLI 1.0.98 it then returned an empty message, and with CLI 1.0.109 it returned the result. The SDK README says sub-agent events "do not complete the wait or supply its reply". Concierge writes an acknowledgement right after it starts the orchestrator, and its result after the orchestrator's completion wakes it.

Read the root agent's `assistant.message` events (no `agentId`). Treat the run as finished when one ends with a result line, or when your own deadline passes:

```text
CONCIERGE-RESULT: <done|blocked|cancelled|needs_approval> <objective-id>
```

- The line is the last nonblank line of the reply, in plain text.
- `done` is success. `blocked`, `cancelled` and `needs_approval` need attention, and the reply above the line says why.
- A reply without the line is not a result. Keep waiting until the deadline, then treat the outcome as unknown.
- Under `full`, the reply also lists "Decided for you:" items that a person can reverse later.

The pattern used in the live trial:

```typescript
const RESULT = /^CONCIERGE-RESULT: (done|blocked|cancelled|needs_approval) (\S+)$/;
const result = new Promise<string>(resolve => {
  session.on("assistant.message", event => {
    if (event.agentId) return; // sub-agent output, not Concierge's reply
    const last = event.data.content.trim().split("\n").at(-1) ?? "";
    const match = RESULT.exec(last.trim());
    if (match) resolve(match[1]);
  });
});
await session.send({ prompt: task });
const status = await Promise.race([result, deadline]); // your own timeout
```

## Follow-ups, approval and cancellation

Send further messages to the same session. "Approve", "Change something: …" and "Cancel" answer a `needs_approval` plan exactly as a person would. Silence never approves. A new instruction to a running objective reaches its orchestrator as a follow-up.

To stop a run, abort the session (`session.abort()`) and disconnect. Repository changes are not rolled back. Inspect the checkout before retrying, because an unknown result is not evidence that nothing happened.

## Budget and lifetime

- **Deadline.** The client owns the wall-clock limit and aborts the session when it passes.
- **Credits.** Copilot's `--max-ai-credits` is a soft limit per response that resets with each user message, per GitHub's [command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#command-line-options). It does not cap a whole job. Use account budgets as well.
- **Concierge's guards.** These are instructions, not enforcement. The orchestrator reports a hard stop once and does not repeat a denied call. Concierge sends at most one completion check and nothing after a `blocked` report. See [autonomy](autonomy.md#what-stops-a-runaway-run).

## Verification

Three live trials on 2026-11-10 drove the plugin from a checkout with `@github/copilot-sdk` 1.0.31, on a disposable repository. Each client loaded the plugin with `pluginDirectories`, listed and selected `copilot-concierge:concierge`, left out `onUserInputRequest`, and set `sessionLimits.maxAiCredits` to 30. Its permission handler approved reads, writes inside the checkout, `npm test` and read-only `git status`/`diff`/`log`, and rejected everything else. The prompt stated full autonomy and no plan approval.

| Trial | CLI | Models | Result |
| --- | --- | --- | --- |
| A | 1.0.98 | Profiles as shipped before Fusion | `CONCIERGE-RESULT: done` after 3m 57s. Fix and new test written, `npm test` 3/3, nothing committed. |
| B | 1.0.109 | Session and every agent on `auto` | `CONCIERGE-RESULT: done` after 3m 3s, the same outcome. 14 billed requests. |
| C | 1.0.109 | As shipped: session and entry agent on `auto`, others pinned | `CONCIERGE-RESULT: done` after 2m 20s, the same outcome. Entry agent Fusion-routed; orchestrator on GPT-6.1 Sol. 14 billed requests. |

Observed in all three trials:

- The plugin agent was listed under, and selected by, the name `copilot-concierge:concierge`.
- The background orchestrator's completion woke Concierge in the same SDK session, and the result line was the last line of a root `assistant.message`.
- The orchestrator retried rejected compound shell commands as single commands and did not repeat a rejected call.
- No `ask_user` call was made, and the environment variable was never read because the prompt settled the mode.

In trials B and C, only the entry agent's calls were Fusion-routed (`isAuto: true`, served by GPT-6 Luna). The orchestrator ran without Fusion routing: on GPT-6 Luna when it was set to `auto` (B) and on its pinned GPT-6.1 Sol as shipped (C).

Not yet observed with an SDK client: `needs_approval` and a follow-up answer, a `blocked` result, cancellation, Fusion tiers above the default, and a sub-agent permission request that the handler had to answer differently from the root's.
