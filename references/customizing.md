# Bring your own agents to Concierge

You can teach Concierge your team's way of working without editing the installed plugin. Three kinds of file do different jobs:

| File | What it does | Guide |
| --- | --- | --- |
| `<name>.agent.md` | A specialist: its model, tools and charter | [Custom agents](custom-agents.md) |
| `copilot-concierge-routing/SKILL.md` | Concierge's routing charter: which agent and skills handle each role | [Routing charters](routing-charters.md) |
| `<name>/SKILL.md` | Reusable guidance a worker loads | [Skills](custom-skills.md) |

Copilot discovers agents and skills in its normal locations. Concierge's orchestrator reads the routing charter and hands work to the agents it names, after verifying each one. A routing row does not register an agent, install a plugin, add tools or bypass Copilot's permissions. Ordinary `AGENTS.md` or `.github/copilot-instructions.md` files can describe repository conventions, but they do not create a Concierge route.

Start with the routing overview below, then use the quick start to add its example files.

## The routing skill the orchestrator uses

The orchestrator's built-in `orchestrate` skill defines Concierge's coordination workflow. Your extension point is a separate skill named **`copilot-concierge-routing`**. Do not replace or shadow `orchestrate` to add your team's routes.

At the start of each objective, before choosing specialists, the orchestrator loads `copilot-concierge-routing` and every available `copilot-concierge-routing-<suffix>` skill listed by its skill tool. It follows their routing tables when selecting workers. Without a matching custom route, it keeps the shipped Concierge specialist. These rules are defined in the [orchestrator profile](../com.github.copilot/agents/orchestrator.agent.md).

### Keep each worker's charter in its agent file

Use a native `.agent.md` file for a stable specialist. Its frontmatter defines its model, tools and invocation settings; its Markdown body is the worker's charter: expertise, boundaries, how to handle an assignment and what evidence to return. Set `user-invocable: false` for an internal worker that stays out of the human-facing agent picker while remaining dispatchable. Leave `disable-model-invocation` unset or `false`; setting it to `true` prevents the worker dispatch observed in Concierge's host probes. Hiding a worker is not a permission boundary. See [custom agents](custom-agents.md).

The routing skill addresses the **orchestrator**: whom to use, when to use them and which extra skills to pass. The agent charter addresses the **worker**: how to do its job. Shared skills hold reusable procedures or conventions. You do not need a separate charter file, a generic-worker layer or one agent per checklist. For guidance-only changes, keep an existing specialist and attach a team skill in its routing row.

### Add a project routing charter

Save this as `.github/skills/copilot-concierge-routing/SKILL.md`. It is the same routing file used by the quick start below; the example requires its `team-reviewer` agent and `team-review-rules` skill to be discoverable too.

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

The `reviewer` row replaces the shipped reviewer with `team-reviewer`. The `node-backend` row keeps the shipped Node.js specialist and adds shared review guidance. Skills named in either row go into the selected worker's `CONCIERGE-HANDOFF` under `skills to load`; that worker needs the `skill` tool to load them. Leave the Skills cell empty when no additional skills are needed.

A Role matching a shipped role replaces or extends that role. Any other Role adds a specialist, whose **Use when** must clearly describe the work it covers. The Agent cell must use the exact discovered agent ID, not a display name or an invented alias. Keep one table with the four columns above. You may add short Markdown guidance below it about sequencing, what context to provide and what results to expect, consistent with Concierge's handoff and approval rules. A prose-only `ROUTING.md` is not an automatically discovered routing skill. See the [full routing reference](routing-charters.md) for supported roles and formatting.

### Resolution, fallback and verification

Before dispatch, the orchestrator verifies that the exact agent ID is available and its effective profile pins one explicit model with `model-policy: required`. It uses host metadata or delegates profile inspection to Scout; a matching filename or description alone is not verification.

If a routed agent is missing, unverified or unpinned, the orchestrator reports the gap and uses that role's suitable shipped default, preserving applicable extra skills and role restrictions. A new role without a suitable default stays blocked. A required model that is unavailable is also a blocker, not permission to substitute another model. The built-in unpinned `general-purpose` agent is not a fallback.

For multiple charters, the unsuffixed `copilot-concierge-routing` wins over suffixed charters when rows conflict. There is no defined order between conflicting suffixed charters. Copilot also keeps only one loaded skill per name, so give team and personal charters distinct suffixes when they should combine with project routing. See [sharing beyond one repository](#share-beyond-one-repository).

Routes select leaf workers, not a replacement Concierge entry agent or orchestrator. They preserve the user's scope, approval state and write restrictions. They do not grant tools, permissions or publication consent. Routed Scout and Ship it roles retain their built-in skills and the [role-specific contracts below](#keep-custom-roles-within-concierges-contract).

After adding or editing routing, use a fresh session and the quick-start checks below: run `check-custom.mjs`, inspect `/skills info copilot-concierge-routing`, and confirm the actual agent and model in the result and `/tasks`. The source checker is not a live routing test; current example and app-verification limits remain as documented in [runtime verification](runtime-verification.md).

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
Skills: copilot-concierge-routing, team-review-rules
Routing tables: .github/skills/copilot-concierge-routing/SKILL.md
No problems found.
```

With no arguments, the checker scans the current folder and `~/.copilot`. Errors set a failing exit code; warnings do not, so read both. The checker covers frontmatter basics, folder and name agreement, route references, duplicates and reused Concierge names. It does not run Copilot, parse all YAML, validate tools or check that a model is available. [Checker source](../scripts/check-custom.mjs)

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

Then open a fresh Concierge session in the target project and repeat the check from step 4. GitHub documents that a plugin installed from a local folder marketplace loads from that folder, so changes apply in a fresh session; a plugin installed directly from a path or from a remote marketplace may be cached, so reinstall or run `copilot plugin update` after changing it. For teammates, host the reviewed plugin and catalog in your own repository and use `OWNER/REPOSITORY` instead of the local path. Registration uses the catalog's `name`; agent IDs use `plugin.json`'s `name`. [Native plugin commands](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)

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
