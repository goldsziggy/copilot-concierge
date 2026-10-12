# Skills for Concierge workers

A skill is a folder with a `SKILL.md` file of reusable guidance: your review rules, design-system conventions or service patterns. Concierge's workers load skills that their profile or handoff names. A skill adds instructions only; it does not add tools, permissions or approvals.

Skills are the lightest customization. To apply team conventions to a Concierge role, you often need just one skill and one [routing row](routing-charters.md) that keeps Concierge's own agent. Create a [custom agent](custom-agents.md) only when you need a different model, tool boundary or charter.

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

**Do not reuse a Concierge skill name.** Concierge's skills are `orchestrate`, `plan`, `grill-plan`, `scout`, `enterprise-ux`, `react-frontend`, `node-backend`, `graphql`, `review` and `ship-it`. Project and personal skills load before plugin skills, so a team skill named `review` would replace Concierge's `review` for every worker that loads it. Replacing `scout` or `ship-it` would also drop their learning and publication safeguards. The checker reports this as an error. Use a prefix such as `team-`.

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
4. Respect the worker's assigned mode and tools. Loading this skill does not grant
   write, execution, persistence or publication permission.
5. Return useful repository findings to the orchestrator for Scout to verify;
   never copy private preferences, conversations or secrets into shared docs.
```

Replace the numbered rules with your own. Keep them to what a worker needs to do the job.

## Format

- The file must be named exactly `SKILL.md`, inside a folder of the same name as the skill.
- `name` is required: lowercase letters, digits and hyphens. Concierge's checker requires it to match the folder name.
- `description` is required: say what the skill covers and when to load it. Quote it if it contains `: ` or ` #`.
- The body holds the instructions. Copilot makes the other files in the skill's folder available with it, so you can add examples or scripts and refer to them by relative path.

Keep a skill self-contained. Links to files outside its folder make workers read outside the user's project. Avoid `allowed-tools`: GitHub warns that pre-approving shell tools removes the confirmation step, and Concierge does not need it. A script in a skill runs only when a worker with an execution tool decides to run it, subject to Copilot's permissions.

## How Concierge workers get a skill

There are two supported paths:

1. **A routing row.** Skills in the row's **Skills** column go into the worker's handoff under `skills to load`, whichever agent does the work. This is the most explicit path:

   ```markdown
   | node-backend | copilot-concierge:node-backend | team-review-rules | Node.js implementation and self-checks |
   ```

2. **An agent's `skills` list.** A [custom agent](custom-agents.md#frontmatter-concierge-relies-on) can list skills to preload. Concierge's own profiles use this field, but GitHub's public reference does not document it, so also name important skills in the routing row.

The worker needs the `skill` tool in its tool list to load a named skill. Concierge's shipped specialists have it. Copilot may also choose a skill by its description during other work; do not rely on that for required rules.

## Verify it

1. Run the checker and read its warnings and errors:

   ```sh
   node /path/to/copilot-concierge/scripts/check-custom.mjs .
   ```

   Expect the skill in the `Skills:` line. Errors include a missing description, a folder/name mismatch or a reused Concierge skill name. A routing row that names a skill it cannot find is a warning.
2. In the CLI, run `/skills list`, then `/skills info team-review-rules` to see the location of the copy that loaded. After adding a skill during a session, `/skills reload` loads it; a fresh session is the simplest check. Outside a session, `copilot skill list` lists skills.
3. Ask Concierge for a small read-only task that the route covers and check that the worker's report applies the rule.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| The skill is not listed | Exact `SKILL.md` name, folder/name match, valid frontmatter, a supported location, and `/skills` (it can disable a skill). |
| Another copy loads | `/skills info <name>` shows its source. A same-named project skill hides personal and plugin copies. The checker reports duplicates in the folders it scans. |
| A Concierge role behaves differently after adding skills | You may have reused a Concierge skill name. Rename the skill. |
| The worker does not apply the rules | The skill name in the routing row, the worker's `skill` tool, and a fresh session. |
| The worker cannot run a bundled script | Skills do not add tools or permissions. Use a worker with an execution tool and approve the command in Copilot. |

## Not supported

- Granting tools, permissions, approvals, memory writes or publication consent through a skill.
- Replacing Concierge's own skills with same-named team skills.
- Checking parent-folder, `~/.agents/skills`, `COPILOT_SKILLS_DIRS` or `/skills add` locations with `check-custom.mjs`; verify them with `/skills info`.
- Live acceptance of this starter skill. It passes source checks only.
