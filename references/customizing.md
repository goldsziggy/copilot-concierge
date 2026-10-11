# Adding your own agents and skills

Concierge's orchestrator can hand work to your organization's agents and give its workers your skills. You add three kinds of file, all in places Copilot already reads, so they work in Copilot CLI and the GitHub Copilot app without changing Concierge.

| You add | What it is | File |
| --- | --- | --- |
| An agent | A specialist identity: charter, model, tools, skills to preload | `<name>.agent.md` |
| A skill | Reusable guidance a worker loads on demand | `<skill-name>/SKILL.md` |
| A routing table | Which agent and skills Concierge uses for each kind of work | `copilot-concierge-routing/SKILL.md` |

Starter copies of all three are in [`examples/custom/.github`](../examples/custom/.github).

## 1. Choose where the files live

| Scope | Agents | Skills (including the routing table) | Works in |
| --- | --- | --- | --- |
| One repository | `.github/agents/` | `.github/skills/` | CLI and app, for that repository |
| Just you | `~/.copilot/agents/` | `~/.copilot/skills/` | CLI and app, every project |
| A team | A plugin: `plugin.json` plus `com.github.copilot/agents/` and `skills/`, installed from your marketplace | Same plugin | CLI and app, wherever it is installed |
| One CLI session | Any folder with `.github/agents/` and `.github/skills/`, loaded with `copilot --add-dir <folder>` | Same folder | CLI |

Historical Zilot 0.3.0 CLI trials verified repository agents and skills, the old `zilot-routing` table and folders loaded with `--add-dir`. Those sessions do not establish current-version routing acceptance. GitHub documents that repository and CLI skills appear in the app; this project’s custom-agent routing has not been exercised in the app.

Copilot has no setting that loads an extra folder permanently. If you use Concierge's launcher, list folders in `extraDirectories` in `.copilot-concierge/config.json` or `~/.config/copilot-concierge/config.json` and it passes them on (`--plugin-dir` for a plugin, `--add-dir` otherwise).

## 2. Add an agent

```markdown
---
name: acme-react
description: "Acme's React specialist. Builds UI with the Acme design system; used by Concierge for React work."
model: gpt-6-luna
model-policy: required
tools: [view, rg, grep, glob, apply_patch, edit, create, bash, read_bash, stop_bash, list_bash, skill]
skills: [acme-design-system]
user-invocable: false
include-custom-instructions: true
---

You are Acme's React specialist, working for Concierge's orchestrator. ...
You report only to the orchestrator. Do not ask the user directly, dispatch other agents or update the task list.
Return findings, changed files, verification, blockers and the next decision needed.
```

- **ID:** the file name without `.agent.md`. A file in a subfolder gets the folder in its ID: `.github/agents/security/auditor.agent.md` is `security--auditor`. Plugin agents are `<plugin>:<name>`. If a personal and a repository agent share an ID, Copilot uses the personal one.
- **Quote** any value containing `: `. Copilot silently ignores an agent whose frontmatter is not valid YAML.
- **Pin one model** with `model-policy: required`. Leaving it out lets the agent run on whatever model the session uses; a model list falls back silently.
- **Tools:** name what the role needs. Concierge's orchestrator passes every tool through, so your list is the real limit. Leave out `task`, `ask_user` and `update_todo`: Concierge's workers report to the orchestrator instead.
- **`user-invocable: false`** keeps the agent out of people's agent pickers. Do not use `disable-model-invocation: true`; it also stops the orchestrator from dispatching the agent.
- **Charter:** end with the reporting lines above, so your agent fits Concierge's handoff. Concierge's handoff tells the agent its scope, approval state and what to return.

## 3. Add a skill

```markdown
---
name: acme-design-system
description: Acme's design-system rules for UI work. Load for any Acme user interface change.
---

# Acme design system
- Import components from `@acme/ui`; never style raw HTML elements directly.
- ...
```

The folder name must equal `name`. Any worker with the `skill` tool can load it, including Concierge's own specialists, so a skill alone is often enough: route a Concierge role to keep its agent and add your skill.

## 4. Route work with `copilot-concierge-routing`

Create a skill named `copilot-concierge-routing` containing a table:

```markdown
| Role | Agent | Skills | Use when |
| --- | --- | --- | --- |
| react-frontend | acme-react | acme-design-system | Any React or UI change |
| node-backend | copilot-concierge:node-backend | acme-service-conventions | Back-end changes |
| payments | acme-payments | acme-pci | Checkout, refunds or card data |
```

At the start of every objective, Concierge's orchestrator loads `copilot-concierge-routing` (and any `copilot-concierge-routing-<something>`, such as one shipped in a team plugin) and follows it:

- A Concierge role (`scout`, `product-manager`, `enterprise-ux`, `react-frontend`, `node-backend`, `graphql`, `reviewer`, `ship-it`, `escalation`) in the **Role** column sends that work to your agent. Use a `copilot-concierge:` agent ID to keep Concierge's agent and only add skills.
- Any other role adds a specialist for the work in **Use when**.
- **Skills** go into that worker's handoff, whichever agent does the work.
- When tables conflict, `copilot-concierge-routing` beats `copilot-concierge-routing-<something>`. Copilot decides between two files with the same skill name.
- The exact routed profile must be discovered and verified to pin one explicit model with `model-policy: required`. A description or matching basename is not enough; the effective profile and precedence must be clear.
- If a route is missing, unverified or unpinned, the orchestrator uses a suitable shipped Concierge role and reports the gap. A new custom role without a suitable default stops. It never falls back to an unpinned built-in worker such as `general-purpose`.
- A verified custom model pin is honored and reported when it differs from the shipped default. An unavailable pinned model remains a blocker.

Routing only changes who does the work. Approval, delegation, the task list and reporting work the same way, and Copilot's permissions still apply to your agents.

Routed Scout agents and escalations doing Scout work also receive the `scout` skill. They retain its bounded project-notes exception, path checks and explicit no-write handling; other roles cannot inherit that exception.

Routed `ship-it` agents also receive the built-in `ship-it` skill: read-only preflight, separate explicit publication consent for exact metadata, supported draft creation and immediate revalidation remain mandatory. Omit the worker's tool list when it needs inherited provider integrations; that grants no extra publication consent.

## 5. Check before you use it

```sh
node /path/to/copilot-concierge/scripts/check-custom.mjs .
node /path/to/copilot-concierge/scripts/check-custom.mjs ~/.copilot /path/to/team-plugin
```

With no arguments it checks the current folder and `~/.copilot`. It reports common frontmatter mistakes, skills whose name does not match their folder, missing descriptions or models, and routing rows whose agents or skills it cannot find (agents from plugins you have not listed show as warnings). Then start Concierge and ask for work that matches a row; the orchestrator's agent card shows which agent it dispatched.

The custom preflight checker does not parse full YAML. A successful check is not proof of host discovery: confirm the exact custom agent ID in Copilot and exercise its route before relying on it. Concierge checks plugin agent namespaces against the declared manifest ID, rather than accepting a matching basename from the wrong plugin.

Existing Zilot routing tables are not loaded under their old names. Rename both the folder and frontmatter `name` to `copilot-concierge-routing` (or its suffixed name), and update `zilot:` agent IDs explicitly; see [migration](migration.md).
