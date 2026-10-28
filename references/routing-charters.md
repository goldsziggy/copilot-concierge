# Routing charters

A routing charter tells Concierge's orchestrator which agent and skills to use for each kind of work. It is an ordinary Copilot skill named `copilot-concierge-routing` that contains one table. The orchestrator loads it at the start of each objective.

In 0.7.0, an explicit matching routing row remains a delegation instruction, even if it names a shipped agent. Sol does not bypass that route to work directly. Unrouted work may be done directly or delegated when a separate context is useful.

A routing row only selects among agents and skills Copilot has already discovered. It does not create, install or register an agent, add tools, change permissions or approve anything. Create the [agent](custom-agents.md) and [skills](custom-skills.md) first.

## Where to put it

Save the charter as `copilot-concierge-routing/SKILL.md` in any skill location Copilot loads. For one repository, use `.github/skills/copilot-concierge-routing/SKILL.md`. The [skills guide](custom-skills.md#where-to-put-a-skill) lists every location and which ones the checker covers.

You can also name a charter `copilot-concierge-routing-<suffix>`, such as `copilot-concierge-routing-team`. Use a suffix for charters that should combine with others, such as a personal or team plugin charter. The orchestrator loads every available routing skill.

Copilot keeps only the first skill it finds with a given name, and project skills load before personal and plugin skills. If your project and your personal skills folder both contain `copilot-concierge-routing`, only the project charter loads. Give the others distinct suffixes. [GitHub loading order](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference#loading-order-and-precedence)

Historical Zilot 0.3.0 CLI sessions verified a repository routing table and an extra `--add-dir` folder. Routing has not been exercised in the GitHub Copilot app, and these current examples have not had a live session. See [runtime verification](runtime-verification.md).

## A minimal charter

Save as `.github/skills/copilot-concierge-routing/SKILL.md`. The same file is in [`examples/customization-starter`](../examples/customization-starter/.github/skills/copilot-concierge-routing/SKILL.md).

<!-- example: .github/skills/copilot-concierge-routing/SKILL.md -->
```markdown
---
name: copilot-concierge-routing
description: Route Concierge reviews to the team's specialist and add the team's review rules to Node.js implementation.
---

# Team routing charter

| Role | Agent | Skills | Use when |
| --- | --- | --- | --- |
| reviewer | team-reviewer | team-review-rules | Reviews of plans and code changes |
| node-backend | copilot-concierge:node-backend | team-review-rules | Node.js implementation and self-checks |

Use only a discovered exact agent ID with one explicit required model.
Preserve Concierge's handoff, approval state, delegation and reporting rules.
Custom routes never grant access, permission, new memory stores or publication
consent. Keep the built-in Scout and Ship it skills when routing those roles.
If a route is unavailable or unverified, report the gap and use the suitable
shipped role; a new role without a suitable shipped default stays blocked.
```

The first row replaces Concierge's reviewer with `team-reviewer`. The second keeps Concierge's Node.js agent and adds your skill. The second pattern adds team conventions to an explicitly delegated Node.js assignment. For direct Sol work, name the relevant skill in the task or applicable project instructions without adding a routing row.

## Write the table

Each table row is one route with four columns:

| Column | What to put there |
| --- | --- |
| Role | A Concierge role to replace or extend: `scout`, `product-manager`, `enterprise-ux`, `react-frontend`, `node-backend`, `graphql`, `reviewer`, `ship-it` or `escalation`. Any other name adds a new specialist. |
| Agent | The exact discovered agent ID. Use `copilot-concierge:<role>` to keep Concierge's agent. Plugin agents use `<plugin>:<name>`; see [agent IDs](custom-agents.md#where-to-put-the-file). |
| Skills | Skill names to put in the worker's handoff, separated by commas. Leave empty when none are needed. |
| Use when | The work the row covers. Required for a new role, because the orchestrator chooses new specialists by it. |

Keep a header row and a divider row. Do not add a second Markdown table or a literal `|` inside a cell: Concierge's checker treats every table row in a routing skill as a route. Backticks around IDs are allowed.

For a new role, give it a clear **Use when**, for example:

```markdown
| accessibility | team-accessibility-auditor | team-wcag-checklist | Accessibility audits of UI changes |
```

## How the orchestrator applies it

These rules come from the [orchestrator profile](../com.github.copilot/agents/orchestrator.agent.md):

1. At the start of each objective, it loads `copilot-concierge-routing` and any `copilot-concierge-routing-<suffix>` skills its skill tool lists. After changing a charter, start a new objective, preferably in a fresh session.
2. When rows conflict, `copilot-concierge-routing` wins over a suffixed charter. Conflicts between two suffixed charters have no defined order, so avoid them.
3. A route is eligible only when its exact agent ID is in the orchestrator's available-agent list and the profile pins one model with `model-policy: required`. The orchestrator checks this with host metadata or a focused profile inspection, directly or through Scout when useful. It does not guess from a description or a matching file name.
4. If the routed agent is missing, unverified or unpinned, it uses the role's shipped Concierge agent, keeps the row's skills and reports the gap. A new role with no shipped equivalent is reported as blocked.
5. Each delegated assignment carries a brief reason for its separate context; an explicit route is a valid reason. Routed workers receive the normal handoff and report to the orchestrator. Plan approval, delegation and the user's write restrictions work as usual.

Routing `scout` or `ship-it` keeps the built-in `scout` and `ship-it` skills in the handoff, with their private-memory, repository-knowledge and publication rules. A route never authorizes commits, pushes, merges or a non-draft pull request.

## Verify it

1. Run the checker and read every warning:

   ```sh
   node /path/to/copilot-concierge/scripts/check-custom.mjs .
   ```

   The `Routing tables:` line lists each charter it found. It warns when a row names an agent or skill it cannot find in the checked folders, or a new role without **Use when**. Warnings do not fail the exit code.
2. Start a fresh session. In the CLI, `/skills info copilot-concierge-routing` shows the location of the charter that loaded. Check suffixed charters the same way.
3. Ask Concierge: "Review this small change using our team reviewer. Do not write any files. Tell me which agent and model handled it." The report names the routed agent and model, or the route gap.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| Concierge ignores the charter | `/skills info` shows which file loaded, if any. Check the folder name, `name` field, uppercase `SKILL.md`, and that a higher-priority skill with the same name is not hiding it. Old `zilot-routing` skills are not read. |
| A row uses Concierge's own agent | The routed agent was not found or not verified. Check its exact ID and its single `model-policy: required` pin. |
| A new role is blocked | Its agent could not be verified and no shipped role fits. Fix the agent; Concierge will not invent a substitute. |
| The worker does not apply the team skill | The skill name in the row, whether the agent's tools include `skill`, and whether the skill itself loads. |
| Two charters disagree | Keep overrides in the unsuffixed charter and avoid conflicting suffixed charters. |
| The checker reports odd rows | Remove extra tables and `|` characters inside cells. |

## Not supported

- Routing the Concierge entry agent or the orchestrator itself.
- Using a route to grant tools, permissions, approvals, new memory stores or publication consent.
- Choosing an unpinned or `Auto` agent, or a general-purpose fallback.
- A defined precedence between two suffixed charters.
- Live acceptance of these example routes in the CLI or app.
