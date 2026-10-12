# Customize Concierge with your agents, routing and skills

You can teach Concierge your team's way of working without editing the installed plugin. Three kinds of file do different jobs:

| File | What it does | Guide |
| --- | --- | --- |
| `<name>.agent.md` | A specialist: its model, tools and charter | [Custom agents](custom-agents.md) |
| `copilot-concierge-routing/SKILL.md` | Concierge's routing charter: which agent and skills handle each role | [Routing charters](routing-charters.md) |
| `<name>/SKILL.md` | Reusable guidance a worker loads | [Skills](custom-skills.md) |

Copilot discovers agents and skills in its normal locations. Concierge's orchestrator reads the routing charter and hands work to the agents it names, after verifying each one. A routing row does not register an agent, install a plugin, add tools or bypass Copilot's permissions. Ordinary `AGENTS.md` or `.github/copilot-instructions.md` files can describe repository conventions, but they do not create a Concierge route.

Start with the quick start below, then use the guides for locations, options and troubleshooting.

## Quick start

This adds a team reviewer that applies your review rules, and adds the same rules to Concierge's Node.js specialist. It uses the starter in [`examples/customization-starter`](../examples/customization-starter/.github). You need an existing Concierge installation and, for the checker, Node.js 20+ with a Concierge source checkout or extracted release.

### 1. Add the three files

From your project folder, check that these paths do not already exist, then copy the starter. Replace `/path/to/copilot-concierge` with your checkout:

```sh
mkdir -p .github/agents .github/skills
cp /path/to/copilot-concierge/examples/customization-starter/.github/agents/team-reviewer.agent.md .github/agents/
cp -R /path/to/copilot-concierge/examples/customization-starter/.github/skills/team-review-rules .github/skills/
cp -R /path/to/copilot-concierge/examples/customization-starter/.github/skills/copilot-concierge-routing .github/skills/
```

If your project already has a `copilot-concierge-routing` skill, add the starter's rows to it instead of replacing it. You can also create each file by hand from the guides: [agent](custom-agents.md#a-minimal-reviewer), [skill](custom-skills.md#a-minimal-skill) and [routing charter](routing-charters.md#a-minimal-charter).

### 2. Make it yours

- In `team-reviewer.agent.md`, keep one `model` that your Copilot account can use, with `model-policy: required`.
- In `team-review-rules/SKILL.md`, replace the numbered rules with your own.
- Keep the `team-` names, or choose others that do not reuse Concierge's agent or skill names.

### 3. Check the files

```sh
node /path/to/copilot-concierge/scripts/check-custom.mjs .
```

Expect:

```text
Agents: team-reviewer
Skills: team-review-rules, copilot-concierge-routing
Routing tables: .github/skills/copilot-concierge-routing/SKILL.md
No problems found.
```

The order of names can differ. With no arguments, the checker scans the current folder and `~/.copilot`. Errors set a failing exit code; warnings do not, so read both. The checker covers frontmatter basics, folder and name agreement, route references, duplicates and reused Concierge names. It does not run Copilot, parse all YAML, validate tools or check that a model is available. [Checker source](../scripts/check-custom.mjs)

### 4. Try it in a fresh session

```sh
copilot --agent copilot-concierge:concierge
```

Ask: "Review this small change using our team reviewer. Do not write any files. Tell me which agent and model handled it."

Concierge's report should name `team-reviewer` and its model. If it used Concierge's own reviewer instead, the report names the route gap; see [routing troubleshooting](routing-charters.md#troubleshooting). In the CLI, `/skills info copilot-concierge-routing` shows which charter loaded and `/tasks` shows the agent tree. The reviewer is hidden from `/agent` and the app's picker because it is an internal worker.

These starter files pass Concierge's source checks. They have not been exercised in a live CLI or app session. Historical Zilot 0.3.0 CLI sessions verified the same kind of repository agent, skill and routing table; see [runtime verification](runtime-verification.md).

## Share beyond one repository

| Scope | Agents | Skills and routing | How it loads |
| --- | --- | --- | --- |
| One project | `.github/agents/` | `.github/skills/` | Open that project in Copilot. Other project locations are in the guides. |
| You, in every project | `~/.copilot/agents/` | `~/.copilot/skills/` | Personal discovery. Personal agents win over same-ID project agents; project skills win over same-name personal skills. |
| An extra CLI folder | `<folder>/.github/agents/` | `<folder>/.github/skills/` | Start Copilot with `--add-dir <folder>`. |
| A team plugin | `com.github.copilot/agents/` | `skills/` | Install from a marketplace, or mount for one session with `--plugin-dir`. |

When the same routing charter name exists in more than one place, Copilot loads only the first. Give personal and team charters a suffix, such as `copilot-concierge-routing-team`, so they combine with a project charter. See [routing charters](routing-charters.md#where-to-put-it).

For an extra folder:

```sh
copilot --add-dir /absolute/path/to/team-tools --agent copilot-concierge:concierge
```

Concierge's optional launcher can remember extra folders in its own user or project configuration:

```json
{"extraDirectories":["/absolute/path/to/team-tools"]}
```

Run `node /path/to/copilot-concierge/scripts/launch.mjs --project /path/to/project` to use that setting. The launcher passes `--plugin-dir` for a folder containing `plugin.json`, otherwise `--add-dir`. Relative entries resolve from the folder containing the configuration file, and folders accumulate across user, project and session scopes. Plain `copilot --agent ...` and the app do not read this setting. [Launcher configuration](install.md#session-local-launcher)

### Turn the starter into a team plugin

Create a separate folder named `team-concierge-tools`. Move the starter agent into `com.github.copilot/agents/` and both skill folders into `skills/`. Rename the routing folder and its `name` to `copilot-concierge-routing-team`, and change the reviewer row's agent to `team-concierge-tools:team-reviewer`. Leave `copilot-concierge:node-backend` and `team-review-rules` unchanged. Add this root `plugin.json`:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "team-concierge-tools",
  "version": "0.1.0",
  "description": "Our team's Concierge review agent, routing charter and rules."
}
```

Agent Plugins 1.0 uses these component folders; do not add legacy `agents` or `skills` path fields. Concierge's checker expects plugin agent IDs in the form `<plugin.json name>:<file ID>`. [GitHub plugin guide](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating)

Check it, then try it in one session without installing:

```sh
node /path/to/copilot-concierge/scripts/check-custom.mjs /path/to/team-concierge-tools
copilot --plugin-dir /path/to/team-concierge-tools --agent copilot-concierge:concierge
```

For repeatable installation, add `.github/plugin/marketplace.json` to the same folder:

```json
{
  "name": "team-concierge-marketplace",
  "owner": {"name": "Your team"},
  "plugins": [{"name": "team-concierge-tools", "source": "./", "version": "0.1.0"}]
}
```

Register the folder, browse its catalog, install and verify:

```sh
copilot plugin marketplace add /path/to/team-concierge-tools
copilot plugin marketplace browse team-concierge-marketplace
copilot plugin install team-concierge-tools@team-concierge-marketplace
copilot plugin list
```

Then open a fresh Concierge session in the target project and repeat the check from step 4. Installed plugin components are cached: after changing the plugin, update or reinstall it and start a fresh session. For teammates, host the reviewed plugin and catalog in your own repository and use `OWNER/REPOSITORY` instead of the local path. Registration uses the catalog's `name`; agent IDs use `plugin.json`'s `name`. [Native plugin commands](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)

## Keep custom roles within Concierge's contract

Custom agents are leaf workers. They receive the same [handoff](handoff.md), assigned scope, approval state and reporting duties as Concierge's specialists. A skill or route does not turn a worker into another orchestrator or give it learning writes.

Routed Scout agents, and escalations doing Scout work, also receive the built-in `scout` skill. They keep its separate private-memory and repository-knowledge scopes, its bundled helper, its path and revision checks and the user's no-write instructions. A custom Scout needs an existing authorized way to run that helper; otherwise it returns session-only findings. Do not copy the helper into your skill, edit learning files directly or create another note store. Scout never stages or commits. Only an implementation assignment with commit authority may deliberately include reviewed, relevant repository knowledge. See [memory and knowledge](memory-and-knowledge.md).

Private preferences can guide presentation and workflow style. They never supply repository facts, override current user instructions or model pins, grant approvals, or justify copying personal data into shared docs. Workers receive only a relevant preference, without its personal provenance or the private file.

Routed Ship it agents keep the built-in `ship-it` skill: read-only preflight, separate consent to the exact proposal, draft-only creation and immediate revalidation. A route cannot authorize an implicit commit, push, merge or non-draft request.

## Remove a customization

Remove only the files you own and their matching routing rows, then start a fresh session. Removing a route returns that role to Concierge's own agent for future objectives; it does not stop a worker that is already running. For the team-plugin example, uninstall the plugin before removing its catalog:

```sh
copilot plugin uninstall team-concierge-tools@team-concierge-marketplace
copilot plugin marketplace remove team-concierge-marketplace
```

Neither command deletes project docs, private memories or your source files. Zilot-era routing needs an explicit rename to `copilot-concierge-routing` and new agent IDs; see [migration](migration.md).

## Troubleshooting

Start with the checker, then a fresh session, then the component guide:

- An agent is unknown, ignored or replaced by Concierge's own role: [custom agents](custom-agents.md#troubleshooting).
- A route or charter is ignored, or two charters disagree: [routing charters](routing-charters.md#troubleshooting).
- A skill is missing, shadowed or not applied: [skills](custom-skills.md#troubleshooting).
- A custom Scout cannot save learning: keep its findings session-only, report the helper or access gap, and do not widen permissions or bypass the helper.

Historical custom-routing observations and remaining app and model limits are in [runtime verification](runtime-verification.md).
