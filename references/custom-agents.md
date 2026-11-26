# Custom agents for Concierge

A custom agent is a specialist profile: one Markdown file with a model, tools and a charter. Concierge's worker can hand work to it, but only after a [routing charter](routing-charters.md) names it and the worker confirms that exact agent is available. A model pin is a preference unless the user or profile explicitly requires it. Concierge ships no specialist agents of its own: without a matching routing row, the worker does the work itself, or starts a general-purpose agent the host offers when a separate context earns its cost. An explicit custom route stays authoritative and is not bypassed by direct execution.

Use a custom agent when your team needs a different identity, model or tool boundary for a role, such as a reviewer that applies your rules or an implementer for your framework. If you only need extra guidance, add a [skill](custom-skills.md) instead; the worker can load it directly.

This guide covers files Copilot discovers natively. Concierge does not install, register or rewrite them. For an end-to-end walkthrough of an agent, skill and routing row together, see the [quick start](customizing.md#quick-start).

## Where to put the file

Copilot finds agents in these places, in this documented order. The first agent with a given ID wins and later duplicates are ignored. [GitHub loading order](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference#loading-order-and-precedence)

| Order | Location | Example ID | Checked by `check-custom.mjs` |
| --- | --- | --- | --- |
| 1 | `~/.copilot/agents/` (personal) | `team-reviewer` | Yes, when `~/.copilot` is a checked root (the default) |
| 2 | `<project>/.github/agents/` | `team-reviewer` | Yes |
| 3 | `.github/agents/` in parent folders (monorepos) | `team-reviewer` | No |
| 4 | `<project>/.claude/agents/` | `team-reviewer` | Yes |
| 5 | `.claude/agents/` in parent folders | `team-reviewer` | No |
| 6 | `<folder>/.github/agents/` added with `--add-dir` | `team-reviewer` | Yes, when you pass that folder |
| 7 | An installed plugin's agents | `team-concierge-tools:team-reviewer` | Yes, when you pass the plugin folder |
| 8 | Organization or enterprise agents | Host-defined | No |

The ID comes from the file path, not the `name` field: `team-reviewer.agent.md` is `team-reviewer`, and `security/auditor.agent.md` is `security--auditor`. [GitHub agent IDs](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli). Concierge's own agents appear as `copilot-concierge:<name>`, and its checker assumes other plugins use the same `<plugin.json name>:<file ID>` form. GitHub's public reference does not describe that plugin prefix, so route to the exact ID your host reports.

Choose an ID that does not reuse a Concierge agent name: `concierge` or `worker`. The names of retired built-in agents, such as `scout`, `reviewer` and `orchestrator`, and the former domain names remain routing keys or migration inputs, but are no longer reserved agent IDs. Copilot keeps one agent per ID and loads plugin agents after personal and project agents. A prefix such as `team-` avoids any collision; the checker reports the two reserved names as errors.

Agent and routing behavior has been exercised in Copilot CLI only, in historical Zilot 0.3.0 sessions, which had an orchestrator and specialist agents. Custom agents and routing have not been exercised with the current two-agent layout or in the GitHub Copilot app, and Concierge has not tested routing to organization or enterprise agents. See [runtime verification](runtime-verification.md).

## A minimal reviewer

Save as `.github/agents/team-reviewer.agent.md` in your project. The same file is in [`examples/customization-starter`](../examples/customization-starter/.github/agents/team-reviewer.agent.md).

<!-- example: .github/agents/team-reviewer.agent.md -->
```markdown
---
name: team-reviewer
description: "Internal Concierge sub-agent: reviews changes against this repository's conventions and reports actionable findings to the Concierge worker."
model: gpt-6-luna
model-policy: required
tools: [view, rg, grep, glob, skill]
skills: [team-review-rules]
user-invocable: false
include-custom-instructions: true
---

You are the team's review specialist, working only for Concierge's worker.
Read the CONCIERGE-HANDOFF and load team-review-rules before reviewing.
Respect the assigned repository, files, mode and the user's exact restrictions.
Inspect source and existing test evidence; do not edit files or run commands.
Do not maintain private memory or repository knowledge; return useful sourced
findings so the worker can verify and record them with its Scout skill.
Do not ask the user directly, recruit agents, publish or update the task list.
Return findings with file/line evidence and impact, uncertainties, checks inspected
versus not performed, blockers and the next decision needed. Report only to the
worker; do not invent a successful check or an approval.
```

Replace `gpt-6-luna` with a model your Copilot account can use. Keep an explicit model rather than `auto`: Copilot Fusion does not route sub-agents, so a sub-agent set to `auto` runs on a single model chosen for it. This reviewer can only read and load skills. For an implementation specialist with edit and shell tools, see [`examples/custom`](../examples/custom/.github/agents/acme-react.agent.md).

## Frontmatter Concierge relies on

| Field | Use for a Concierge sub-agent | Source of the rule |
| --- | --- | --- |
| `description` | Required. Say it is an internal Concierge sub-agent and what it does. Quote it if it contains `: ` or ` #`; Copilot silently drops an agent whose frontmatter is not valid YAML. | GitHub reference; Concierge observation |
| `model` | Prefer one available explicit model ID, not `auto`; Copilot Fusion applies only to the session's own agent. Omission is not a routing eligibility failure; the checker warns that the host may choose one. Honor any explicitly required model. | Concierge routing preference |
| `model-policy: required` | Optional strict policy. It makes Copilot refuse a per-call model override; use it only when that restriction is intended. | Observed in Copilot CLI; not in GitHub's public reference |
| `tools` | Only what the role needs. Omit `task`, `write_agent`, `read_agent`, `ask_user` and `update_todo`: sub-agents report to the worker. Omit the list only for roles that must inherit connected integrations. | GitHub reference; Concierge charter |
| `skills` | Skills to preload. Also name them in the routing row so they travel in the handoff. | Used by Concierge's profiles before the two-agent layout; not in GitHub's public reference |
| `user-invocable: false` | Hides an internal agent from the user's agent picker while keeping it dispatchable. | GitHub reference; observed in Copilot CLI |
| `include-custom-instructions: true` | Lets the agent follow repository instructions such as `AGENTS.md`. | GitHub CLI guide |

Never set `disable-model-invocation: true` on a sub-agent: in Concierge's host probes it removed the agent from dispatch entirely. Concierge's profiles list exact tool names, such as `view` and `rg`, because earlier probes found that some documented aliases mapped to nothing. Check the tool names your host exposes. [GitHub frontmatter reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration)

A sub-agent cannot use a tool that the session does not provide: Copilot gives a nested agent only the tools its parent also has. Concierge's worker declares no tool list, so it inherits the available tools for its own authorized work and for the sub-agents it starts rather than adding any. Copilot's tool and path permissions still apply.

## Write the charter

The Markdown body is the agent's charter, up to 30,000 characters. Keep it short and specific:

- **Role and boundaries:** what it does, what it must not touch, and which mode it works in.
- **Handoff:** read the `CONCIERGE-HANDOFF` and respect its scope, approval state and the user's exact restrictions. See the [handoff contract](handoff.md).
- **Evidence:** run or inspect only the checks its tools allow, and never claim a check it did not perform.
- **Return:** findings, changed files, verification with commands and results, blockers and the next decision.
- **Reporting:** report only to the worker. Do not ask the user directly, dispatch agents, publish, or update the task list.

Do not give a custom agent its own learning store. Return reusable facts to the worker, which verifies and records them through its `scout` skill. A custom Scout must keep the built-in `scout` skill; see [keep custom roles within Concierge's contract](customizing.md#keep-custom-roles-within-concierges-contract).

## Make Concierge use it

Add a row to a [routing charter](routing-charters.md):

```markdown
| reviewer | team-reviewer | team-review-rules | Reviews of plans and code changes |
```

The worker prefers the named available reviewer. If it cannot use the route, it reports the gap and, when independence is required, uses a general-purpose agent the host offers with the `review` skill. If no independent reviewer is available, it reviews with the `review` skill itself and says plainly that the review was not independent. Exact user requirements and host permissions remain authoritative.

Outside Concierge, Copilot may also choose an agent by its description. Start the description with "Internal Concierge sub-agent" so other sessions are less likely to pick it.

## Verify it

1. Run the checker from a Concierge source checkout or extracted release, then read any warnings:

   ```sh
   node /path/to/copilot-concierge/scripts/check-custom.mjs .
   ```

   Expect `team-reviewer` in the `Agents:` line. Add `~/.copilot` or a team plugin folder as extra arguments when they participate.
2. Start a **fresh** session; Copilot loads new agents when it starts.
3. Ask Concierge for a small, read-only task: "Review this small change using our team reviewer. Do not write any files. Tell me which agent and model handled it."
4. Confirm the agent and model in Concierge's report. In the CLI, `/tasks` shows the agent tree. In the app, each agent has its own tab.

`user-invocable: false` agents do not appear in `/agent` or the app's picker. Select **concierge** there.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| Concierge says the agent is unknown | The exact file-derived ID and plugin prefix, a fresh session, and whether a higher-priority file with the same ID exists. The checker reports duplicate IDs. |
| The worker does the work itself or uses another agent | The route or its preferred model was unavailable. The report names the gap and substitution. |
| The host refuses the model | Check account availability and any required model policy. A host-supported fallback may be used when permitted, with the substitution reported. |
| The agent is ignored after editing | Invalid YAML (often an unquoted `: `) or a stale session. Run the checker and start a fresh session. |
| The agent asks the user or dispatches others | Its charter or tool list includes coordination duties. Remove them. |
| The agent lacks a tool | The tool is not in its list, not provided by the session or blocked by a permission. Routing cannot add tools. |

## Not supported

- Routing a custom agent as the Concierge entry agent or the worker. Custom agents are sub-agents the worker starts; they do not start agents themselves.
- Treating a model preference as a permission grant or silently overriding a model the user explicitly requires.
- Granting tools, permissions or approvals through an agent profile or route.
- Checking parent-folder, organization or enterprise agents with `check-custom.mjs`; verify them in the host.
- Live acceptance of this starter agent. It passes source checks only.
