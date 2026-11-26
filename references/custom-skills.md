# Skills for the Concierge worker and its sub-agents

A skill is a folder with a `SKILL.md` file of reusable guidance: your review rules, design-system conventions or service patterns. Concierge's worker and the sub-agents it starts load relevant skills that their profile, current task or handoff names. Procedures describe how to do the work; profiles define identity, tools, reporting and delegation boundaries. A skill adds instructions only; it does not add tools, permissions or approvals.

Skills are the lightest customization. For the worker to use guidance directly, name the discovered skill in the task or applicable project instructions. To apply team conventions to one kind of work, you often need just one skill and one [routing row](routing-charters.md) that names `copilot-concierge:worker`; the worker then does that work itself with the row's skills. Create a [custom agent](custom-agents.md) only when you need a different model, tool boundary or charter.

## Where to put a skill

Copilot loads skills from these places, in this documented order. It keeps the first skill with a given `name` and ignores later duplicates. [GitHub loading order](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference#loading-order-and-precedence)

| Order | Location | Checked by `check-custom.mjs` |
| --- | --- | --- |
| 1 | `<project>/.github/skills/<name>/SKILL.md` | Yes |
| 2 | `<project>/.agents/skills/<name>/SKILL.md` | Yes |
| 3 | `<project>/.claude/skills/<name>/SKILL.md` | Yes |
| 4 | The same folders in parent directories (monorepos) | No |
| 5 | `~/.copilot/skills/<name>/SKILL.md` (personal) | Yes, when `~/.copilot` is a checked root (the default) |
| 6 | `~/.agents/skills/<name>/SKILL.md` (personal) | No |
| 7 | An installed plugin's `skills/<name>/SKILL.md` | Yes, when you pass the plugin folder |
| 8 | Folders from `COPILOT_SKILLS_DIRS` or added with `/skills add` | No |

Historical Zilot 0.3.0 CLI sessions also loaded a skill from `<folder>/.github/skills/` when that folder was added with `--add-dir`. GitHub's current loading-order list names `--add-dir` for agents but not skills, so confirm the source with `/skills info`. The checker scans such a folder when you pass it. Concierge has not exercised custom skills or routing in the GitHub Copilot app. [GitHub skills guide](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills)

**Do not reuse a Concierge skill name.** Concierge's 18 skills are `brief`, `relay`, `discovery`, `development`, `test`, `escalate`, `orchestrate`, `orchestrate-reference`, `plan`, `grill-plan`, `scout`, `react-frontend`, `node-backend`, `graphql`, `review`, `debugging`, `task-evaluation` and `skill-builder`. Project and personal skills load before plugin skills, so a team skill named `review` would replace Concierge's `review` for every agent that loads it. Replacing `brief` or `relay` would change how the entry agent dispatches and reports. Replacing `scout` would also drop its learning safeguards. The checker reports this as an error. Use a prefix such as `team-`.

React, Node.js and GraphQL remain distinct procedures that the worker loads when their conventions matter. The former `enterprise-ux` skill is no longer shipped: design discovery and planning live in `plan`, with implementation-specific design guidance in domain skills. Existing custom design-system skills remain valid. See [routing migration](routing-charters.md#domain-roles-and-old-built-in-ids).

## A minimal skill

Save as `.github/skills/team-review-rules/SKILL.md`. The same file is in [`examples/customization-starter`](../examples/customization-starter/.github/skills/team-review-rules/SKILL.md).

<!-- example: .github/skills/team-review-rules/SKILL.md -->
```markdown
---
name: team-review-rules
description: Review changes using the assigned repository's existing conventions. Load for team code reviews and implementation self-checks.
---

# Team review rules

1. Read the assigned repository's applicable instructions and nearby code first.
2. Check correctness, compatibility and the focused tests relevant to the change.
3. For each actionable finding, cite a file/line, explain its impact and suggest
   the smallest useful correction. Keep assumptions separate from verified facts.
4. Respect your assigned mode and tools. Loading this skill does not grant
   write, execution, persistence or publication permission.
5. Return useful repository findings to the Concierge worker to verify and record;
   never copy private preferences, conversations or secrets into shared docs.
```

Replace the numbered rules with your own. Keep them focused on how to do the job; put identity and reporting restrictions in the agent profile. The starter is written for a routed review agent, while ordinary procedural guidance can also be used directly by the worker.

## Format

- The file must be named exactly `SKILL.md`, inside a folder of the same name as the skill.
- `name` is required: lowercase letters, digits and hyphens. Concierge's checker requires it to match the folder name.
- `description` is required: say what the skill covers and when to load it. Quote it if it contains `: ` or ` #`.
- The body holds the instructions. Copilot makes the other files in the skill's folder available with it, so you can add examples or scripts and refer to them by relative path.

Keep a skill self-contained. Links to files outside its folder make agents read outside the user's project. Avoid `allowed-tools`: GitHub warns that pre-approving shell tools removes the confirmation step, and Concierge does not need it. A script in a skill runs only when the execution owner has the required tool and authority, subject to Copilot's permissions.

## How the worker and its sub-agents get a skill

The worker can load relevant procedural skills directly for unrouted work within approved scope. A skill supplies a procedure; it does not change the worker's identity, tools or objective ownership. A sub-agent remains bound by its profile and handoff: a reviewer stays read-only, and sub-agents do not start agents. Learning still requires the built-in Scout helper and its safeguards.

For explicit assignments there are two supported paths:

1. **A routing row.** Skills in the row's **Skills** column go into the handoff under `skills to load` when the row names another agent. When the row names `copilot-concierge:worker`, the worker loads them and does that work itself:

   ```markdown
   | node-backend | copilot-concierge:worker | node-backend, team-review-rules | Node.js implementation and self-checks |
   ```

2. **An agent's `skills` list.** A [custom agent](custom-agents.md#frontmatter-concierge-relies-on) can list skills to preload. GitHub's public reference does not document this field, so also name important skills in the routing row.

The execution owner needs the `skill` tool to load a named skill. Concierge's worker declares no tool list and uses the session's `skill` tool; a custom agent with a tool list must include it. Copilot may also choose a skill by its description during other work; do not rely on that for required rules.

## Verify it

1. Run the checker and read its warnings and errors:

   ```sh
   node /path/to/copilot-concierge/scripts/check-custom.mjs .
   ```

   Expect the skill in the `Skills:` line. Errors include a missing description, a folder/name mismatch or a reused Concierge skill name. A routing row that names a skill it cannot find is a warning.
2. In the CLI, run `/skills list`, then `/skills info team-review-rules` to see the location of the copy that loaded. After adding a skill during a session, `/skills reload` loads it; a fresh session is the simplest check. Outside a session, `copilot skill list` lists skills.
3. Ask Concierge for a small read-only task that the route covers and check that the result applies the rule.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| The skill is not listed | Exact `SKILL.md` name, folder/name match, valid frontmatter, a supported location, and `/skills` (it can disable a skill). |
| Another copy loads | `/skills info <name>` shows its source. A same-named project skill hides personal and plugin copies. The checker reports duplicates in the folders it scans. |
| Concierge behaves differently after adding skills | You may have reused a Concierge skill name. Rename the skill. |
| The rules are not applied | The skill name in the routing row, the routed agent's `skill` tool, and a fresh session. |
| A bundled script cannot run | Skills do not add tools or permissions. Use an agent with an execution tool and approve the command in Copilot. |

## Not supported

- Granting tools, permissions, approvals or memory writes through a skill.
- Replacing Concierge's own skills with same-named team skills.
- Checking parent-folder, `~/.agents/skills`, `COPILOT_SKILLS_DIRS` or `/skills add` locations with `check-custom.mjs`; verify them with `/skills info`.
- Live acceptance of this starter skill. It passes source checks only.
