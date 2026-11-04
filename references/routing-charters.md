# Routing charters

A routing charter tells Concierge's orchestrator which agent and skills to use for each kind of work. It is an ordinary Copilot skill named `copilot-concierge-routing` that contains one table. The orchestrator loads it at the start of each objective.

An explicit matching routing row remains a delegation instruction, even if it names a shipped agent. Sol does not bypass that route to work directly. Unrouted work may be done directly or delegated when a separate context is useful.

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
| node-backend | copilot-concierge:worker | node-backend, team-review-rules | Node.js implementation and self-checks |

Prefer a discovered exact agent ID; model pins are optional.
Preserve Concierge's handoff, approval state, delegation and reporting rules.
Custom routes never grant access, permission or new memory stores. Keep the
built-in Scout skill when routing Scout.
Honor available explicit routes before considering direct work. If a route or
preferred model is unavailable, report the gap and preserve applicable skills,
independent review, exact user restrictions and host permissions in any fallback.
```

The first row replaces Concierge's reviewer with `team-reviewer`. The second selects Concierge's reusable worker and loads the `node-backend` skill alongside your skill. The second pattern adds team conventions to an explicitly delegated Node.js assignment. For direct Sol work, name the relevant skill in the task or applicable project instructions without adding a routing row.

## Write the table

Each table row is one route with four columns:

| Column | What to put there |
| --- | --- |
| Role | A Concierge role to replace or extend: `scout`, `product-manager`, `worker`, `enterprise-ux`, `react-frontend`, `node-backend`, `graphql`, `reviewer` or `escalation`. Domain names remain routing keys, not separate shipped agents. Any other name adds a new specialist. |
| Agent | The exact discovered agent ID. Use `copilot-concierge:worker` plus domain skills for implementation. Other shipped workers are `scout`, `product-manager`, `reviewer` and `escalation` under the same plugin prefix. Plugin agents use `<plugin>:<name>`; see [agent IDs](custom-agents.md#where-to-put-the-file). |
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
3. Honor the exact named agent when available; a custom route is not replaced merely because its role also has a shipped default. If the route or preferred model is unavailable, report the gap and use a suitable available worker or work directly within scope; retain the applicable skills and restrictions.
4. A missing model pin is not a route failure. If a named agent is unavailable, use a suitable available worker or direct execution only when the original scope, required agent/model constraints and independent-review requirements permit it. Retain the row's skills and report the substitution. If no permitted capability fits, report the blocker.
5. Each delegated assignment carries a brief reason for its separate context; an explicit route is a valid reason. Routed workers receive the normal handoff and report to the orchestrator. Plan approval, delegation and the user's write restrictions work as usual.

Routing `scout` keeps the built-in `scout` skill in the handoff, with its private-memory and repository-knowledge rules. A routed implementer commits, pushes or opens a pull request only when the handoff's `git` line says the user asked for it.

## Domain roles and old built-in IDs

The `react-frontend`, `node-backend` and `graphql` skills stay separate, while their former built-in profiles are replaced by `copilot-concierge:worker`. Keep those Role cells and change only an old built-in Agent cell to `copilot-concierge:worker`; add the matching domain skill and retain all team skills. The `enterprise-ux` role remains available for custom routes, but its old built-in profile and skill are removed. Use `plan` for design planning and relevant domain guidance, such as `react-frontend`, for implementation. Respect any required custom design-system skills.

The checker warns about the exact legacy IDs `copilot-concierge:react-frontend`, `copilot-concierge:node-backend`, `copilot-concierge:graphql` and `copilot-concierge:enterprise-ux`; it does not rewrite your files or register aliases. During a legacy built-in fallback, the orchestrator reports the substitution and retains a delegated worker, domain and row skills, scope and restrictions. It never claims the removed profile or skill ran. A custom ID such as `team-tools:graphql` or `team-designer` remains an exact custom route and is never rewritten by this migration. See [migration](migration.md#consolidated-implementation-workers).

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
| A row uses Concierge's own agent | The route or preferred model was unavailable. Check the reported gap and fallback. |
| A route is blocked | No available capability can satisfy the task and its restrictions. Fix the missing route or capability; Concierge will not invent access. |
| The worker does not apply the team skill | The skill name in the row, whether the agent's tools include `skill`, and whether the skill itself loads. |
| Two charters disagree | Keep overrides in the unsuffixed charter and avoid conflicting suffixed charters. |
| The checker reports odd rows | Remove extra tables and `|` characters inside cells. |

## Not supported

- Routing the Concierge entry agent or the orchestrator itself.
- Using a route to grant tools, permissions, approvals or new memory stores.
- Treating a route, model fallback or removed agent ID as permission to bypass user restrictions or independent review.
- A defined precedence between two suffixed charters.
- Live acceptance of these example routes in the CLI or app.
