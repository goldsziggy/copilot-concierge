# Routing charters

A routing charter tells Concierge's worker which agent and skills to use for each kind of work. It is an ordinary Copilot skill named `copilot-concierge-routing` that contains one table. The worker loads it at the start of each objective.

A matching row that names your custom agent is a delegation instruction: the worker does not bypass that route to work directly. A row that names `copilot-concierge:worker` means the worker does that work itself with the row's skills. Unrouted work is done by the worker, which starts a sub-agent only when a separate context earns its cost.

A routing row only selects among agents and skills Copilot has already discovered. It does not create, install or register an agent, add tools, change permissions or approve anything. Create the [agent](custom-agents.md) and [skills](custom-skills.md) first.

## Where to put it

Save the charter as `copilot-concierge-routing/SKILL.md` in any skill location Copilot loads. For one repository, use `.github/skills/copilot-concierge-routing/SKILL.md`. The [skills guide](custom-skills.md#where-to-put-a-skill) lists every location and which ones the checker covers.

You can also name a charter `copilot-concierge-routing-<suffix>`, such as `copilot-concierge-routing-team`. Use a suffix for charters that should combine with others, such as a personal or team plugin charter. The worker loads every available routing skill.

Copilot keeps only the first skill it finds with a given name, and project skills load before personal and plugin skills. If your project and your personal skills folder both contain `copilot-concierge-routing`, only the project charter loads. Give the others distinct suffixes. [GitHub loading order](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference#loading-order-and-precedence)

Historical Zilot 0.3.0 CLI sessions verified a repository routing table and an extra `--add-dir` folder. Routing has not been exercised with the current two-agent layout or in the GitHub Copilot app, and these current examples have not had a live session. See [runtime verification](runtime-verification.md).

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

The first row sends review work to `team-reviewer`. The second names `copilot-concierge:worker`, so the worker does Node.js implementation itself and loads the `node-backend` skill alongside your skill. That pattern adds team conventions to one kind of work without a separate agent. For guidance that applies more widely, name the relevant skill in the task or applicable project instructions without adding a routing row.

## Write the table

Each table row is one route with four columns:

| Column | What to put there |
| --- | --- |
| Role | A kind of work: `scout` (context and learning), `product-manager` (requirements and plans), `worker` (implementation), `enterprise-ux`, `react-frontend`, `node-backend`, `graphql`, `reviewer` (plan and change review) or `escalation` (hard or high-risk work). These role keys describe kinds of work, not shipped agents. Any other name adds a new specialist. |
| Agent | The exact discovered agent ID of your custom agent, or `copilot-concierge:worker` to have the worker do that work itself with the row's skills. It is the only shipped agent a row may name. Plugin agents use `<plugin>:<name>`; see [agent IDs](custom-agents.md#where-to-put-the-file). |
| Skills | Skill names for that work, separated by commas: they go into the routed agent's handoff, or the worker loads them when the row names `copilot-concierge:worker`. Leave empty when none are needed. |
| Use when | The work the row covers. Required for a new role, because the worker chooses new specialists by it. |

Keep a header row and a divider row. Do not add a second Markdown table or a literal `|` inside a cell: Concierge's checker treats every table row in a routing skill as a route. Backticks around IDs are allowed.

For a new role, give it a clear **Use when**, for example:

```markdown
| accessibility | team-accessibility-auditor | team-wcag-checklist | Accessibility audits of UI changes |
```

## How the worker applies it

These rules come from the [worker profile](../com.github.copilot/agents/worker.agent.md) and the "Routing tables" section of its [`orchestrate-reference` skill](../skills/orchestrate-reference/SKILL.md):

1. At the start of each objective, it loads `copilot-concierge-routing` and any `copilot-concierge-routing-<suffix>` skills its skill tool lists. After changing a charter, start a new objective, preferably in a fresh session.
2. When rows conflict, `copilot-concierge-routing` wins over a suffixed charter. Conflicts between two suffixed charters have no defined order, so avoid them.
3. Honor the exact named agent when available; a custom route is not replaced merely because the worker could do the work itself. If the route or preferred model is unavailable, report the gap and use a suitable available agent or work directly within scope; retain the applicable skills and restrictions.
4. A missing model pin is not a route failure. If a named agent is unavailable, use a suitable available agent or direct execution only when the original scope, required agent/model constraints and independent-review requirements permit it. Retain the row's skills and report the substitution. If no permitted capability fits, report the blocker.
5. Each delegated assignment carries a brief reason for its separate context; an explicit route is a valid reason. Routed agents receive the normal handoff and report to the worker. Plan approval, delegation and the user's write restrictions work as usual.
6. A row that names `copilot-concierge:worker` is not a delegation: the worker does that work itself and loads every skill in the row.

Routing `scout` keeps the built-in `scout` skill in the handoff, with its private-memory and repository-knowledge rules. A routed implementer commits, pushes or opens a pull request only when the handoff's `git` line says the user asked for it.

## Domain roles and old built-in IDs

Concierge now ships only `copilot-concierge:concierge` and `copilot-concierge:worker`. Every other built-in agent an older routing table may name is retired. The role keys stay valid, so keep each Role cell and change only a retired built-in Agent cell to `copilot-concierge:worker`, adding the skill that now carries that agent's procedure and retaining all team skills:

| Retired Agent cell | Skill to add |
| --- | --- |
| `copilot-concierge:scout` | `scout` |
| `copilot-concierge:product-manager` | `plan` |
| `copilot-concierge:reviewer` | `review` for changes, `grill-plan` for plans |
| `copilot-concierge:react-frontend` | `react-frontend` |
| `copilot-concierge:node-backend` | `node-backend` |
| `copilot-concierge:graphql` | `graphql` |
| `copilot-concierge:enterprise-ux` | `plan` for design planning, and `react-frontend` for applicable React work |
| `copilot-concierge:escalation` | None |
| `copilot-concierge:orchestrator` | None |

That table lives in this guide, not in a routing skill: the checker treats every table row in a routing skill as a route.

Until you update a row, the worker treats a retired built-in ID as `copilot-concierge:worker`: it does that work itself, loads the matching skill alongside all row skills, and reports the migration. It never claims a removed profile or skill ran. A retired `reviewer` row still asks for independent review, so the worker uses a general-purpose sub-agent with `review` when the host offers one, or says the review was not independent. The `enterprise-ux` role remains available for custom routes, but its old built-in profile and skill are removed; a row that names the former `enterprise-ux` skill with no such custom skill available gets `plan`, plus `react-frontend` only for applicable React work, with the gap reported. Respect any required custom design-system skills.

`npm run check:custom` (or `node scripts/check-custom.mjs`) prints a migration warning for each of these exact retired IDs; it does not rewrite your files or register aliases. A custom ID such as `team-tools:graphql`, `team-reviewer` or `team-designer` remains an exact custom route, still wins, and is never rewritten by this migration. See [migration](migration.md#from-the-011-three-tier-layout).

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
| The worker does the work itself instead of the routed agent | The route or preferred model was unavailable, or the row names `copilot-concierge:worker` or a retired built-in. Check the reported gap, fallback or migration. |
| A route is blocked | No available capability can satisfy the task and its restrictions. Fix the missing route or capability; Concierge will not invent access. |
| The team skill is not applied | The skill name in the row, whether the routed agent's tools include `skill`, and whether the skill itself loads. |
| Two charters disagree | Keep overrides in the unsuffixed charter and avoid conflicting suffixed charters. |
| The checker reports odd rows | Remove extra tables and `|` characters inside cells. |

## Not supported

- Replacing the Concierge entry agent or the worker itself through a route.
- Using a route to grant tools, permissions, approvals or new memory stores.
- Treating a route, model fallback or removed agent ID as permission to bypass user restrictions or independent review.
- A defined precedence between two suffixed charters.
- Live acceptance of these example routes in the CLI or app.
