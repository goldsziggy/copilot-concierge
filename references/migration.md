# Migrating to Concierge

Concierge is the maintained native Copilot plugin. Its canonical public repository is `goldsziggy/copilot-concierge`; its package, plugin and marketplace IDs are `copilot-concierge`. The former private development repository remains separate and unchanged. The historical public `v0.3.1` tag and release keep their Zilot source, IDs and uploaded assets.

## From the 0.11 three-tier layout

Release 0.11 shipped seven agents in three tiers: the `concierge` entry agent, an `orchestrator`, and the specialists `scout`, `product-manager`, `worker` and `reviewer`, plus `escalation`. Version 0.12.0 ships exactly two agents and 20 skills. This is a breaking change for anything that names a removed agent. It has passed the static source-contract checks only; no live session has run it.

**What you start is unchanged.** `copilot --agent copilot-concierge:concierge`, plan approval (`ask` or `auto`), autonomy (`guided` or `full`) and their precedence, the `CONCIERGE-RESULT` last line, the learning stores, and commits, pushes and pull requests as ordinary requests all work as before. Finish or stop active work, update, then start a fresh session; existing sessions keep their loaded profiles.

**Agents.** `copilot-concierge:concierge` is now a thin front. It answers simple questions itself (greetings, what Concierge is and how to use it, general questions that do not depend on your project, and progress from the latest report) and hands everything else to the worker with a brief. `copilot-concierge:worker` is the single back agent: it owns each objective and does the work itself, as the orchestrator profile did, starting a sub-agent only when a separate context earns its cost or a routing row names an agent.

| Removed agent | What does that work now |
| --- | --- |
| `copilot-concierge:orchestrator` | `copilot-concierge:worker`, which owns the objective |
| `copilot-concierge:worker` (the old leaf implementer) | The worker itself, with the `development` and `test` skills and any domain skill |
| `copilot-concierge:scout` | The worker, with the `scout` and `discovery` skills |
| `copilot-concierge:product-manager` | The worker, with the `plan` skill |
| `copilot-concierge:reviewer` | A sub-agent with the `review` or `grill-plan` skill: the agent a routing row names, otherwise a general-purpose agent the host offers. If none is available, the worker reviews with `review` itself and says the review was not independent |
| `copilot-concierge:escalation` | The worker itself, which already runs on the stronger model; there is no separate escalation tier. The `escalate` skill is unrelated: it settles blockers |

Only `concierge` is selectable; do not start `copilot-concierge:worker` directly. Update scripts, instructions and custom agent charters that mention the orchestrator: sub-agents now report to the worker.

**Skills.** Six skills are new, and their names are now reserved along with the existing twelve: `brief` and `relay` (used only by the entry agent, to write the brief and dispatch, and to relay reports), and `discovery`, `development`, `test` and `escalate` (used by the worker). If you have a project or personal skill with one of these names, rename it; `check-custom.mjs` reports the collision as an error. Only `concierge` and `worker` remain reserved agent IDs.

**Model configuration.** The `models` roles are now `concierge` (default `auto`, Copilot Fusion) and `worker` (default `gpt-6.1-sol` in 0.12.0, `auto` from 0.12.1).

| Old key | Now |
| --- | --- |
| `models.concierge` | Unchanged |
| `models.frontdesk` | Still a deprecated alias for `models.concierge` |
| `models.orchestrator` | Deprecated alias for `models.worker`; rename it |
| `models.specialist`, `models.escalation` | Retired with their agents. Still accepted in old files and checked, then ignored; remove them |

Giving both an alias and its role in one file, such as `models.orchestrator` and `models.worker`, is an error. Note that `models.specialist` used to set the old leaf worker's model; it no longer sets anything, and `models.worker` now sets the model of the agent that owns the objective.

**Routing tables.** `copilot-concierge-routing` skills still work and their role keys remain valid; the keys now describe kinds of work, not shipped agents. A row that names your custom agent still wins. A row that names `copilot-concierge:worker` means the worker does that work itself with the row's skills. A row that names a retired built-in is treated the same way, with the matching skill added, and `npm run check:custom` (`node scripts/check-custom.mjs`) prints a migration warning for it. Change those Agent cells to `copilot-concierge:worker` and add the skill listed in [domain roles and old built-in IDs](routing-charters.md#domain-roles-and-old-built-in-ids). The checker never rewrites your files.

**Reports and rollover.** The report's `handover` block is replaced by a `progress` object: one JSON object in every report that is the worker's whole memory of the objective (the request, follow-ups, decisions, outcome, repository summary, tasks, facts, error signatures, what is done and open, uncommitted files and counts). The entry agent keeps the latest one and passes it back verbatim in the brief's new `progress:` line on rollover or resume; it never edits, summarises or shows it. A client or custom charter that parsed the `handover` block must read `progress` instead. The `CONCIERGE-BRIEF`, `CONCIERGE-HANDOFF` and `CONCIERGE-REPORT` markers and the control messages are unchanged.

**Blockers.** Blockers are typed (`question`, `permission`, `repeated_failure`, `missing_dependency`, `ambiguity`, `stall`) and settled through the `escalate` checklist before you are asked. The default stays `guided`: Concierge still asks you what only you can answer. See [autonomy](autonomy.md#how-blockers-are-settled).

**Unattended clients.** A direct answer from the entry agent normally has no `CONCIERGE-RESULT` line. In a run the prompt says is unattended, it ends with `CONCIERGE-RESULT: done answered`, which the documented client pattern still matches. See [SDK automation](sdk-automation.md).

## Consolidated implementation workers

Version 0.9.0 replaced the built-in React, Node.js and GraphQL profiles with `copilot-concierge:worker`. Their `react-frontend`, `node-backend` and `graphql` skills remain separate and can be combined for one cohesive assignment. From 0.9.0 to 0.11.1, product manager, Scout, independent reviewer and escalation remained separate agents and `models.specialist` configured the worker; the [two-agent layout above](#from-the-011-three-tier-layout) retires those agents and that key.

Update only routes that name the removed built-in IDs:

| Old Agent cell | New Agent cell | Skills to retain or add |
| --- | --- | --- |
| `copilot-concierge:react-frontend` | `copilot-concierge:worker` | `react-frontend` and the row's existing skills |
| `copilot-concierge:node-backend` | `copilot-concierge:worker` | `node-backend` and the row's existing skills |
| `copilot-concierge:graphql` | `copilot-concierge:worker` | `graphql` and the row's existing skills |
| `copilot-concierge:enterprise-ux` | `copilot-concierge:worker` | `plan` for design planning, relevant domain skills for implementation, and existing team design guidance |

Keep Role cells, including `enterprise-ux`, so their exact custom routes still match. Do not rewrite custom IDs such as `team-tools:graphql` or `team-designer`. The former built-in `enterprise-ux` skill is removed; use `plan` and applicable domain guidance rather than claiming that skill loaded. A separately discovered custom skill of that name is still custom guidance, not the removed built-in.

Run `node scripts/check-custom.mjs` against the relevant project, personal and plugin folders. It warns about legacy built-in IDs and missing former skills but never edits routes or registers aliases. The worker reports an explicit legacy substitution, retaining required skills, approval state and exact user restrictions. Finish or stop active work before updating, then start a fresh session; source checks do not prove live host behavior. No installed plugin cache is rewritten by this migration.

## From Concierge 0.6.1

Version 0.7.0 removes the Ship it specialist and its two-step draft PR/MR offer. Ask for commits, pushes or pull requests directly instead ("commit this on a new branch and open a draft PR"), in a request, a follow-up or a plan step. Copilot's tool permissions decide each command; there is no separate Concierge consent step. If a `copilot-concierge-routing` table routes the `ship-it` role, remove that row: `node scripts/check-custom.mjs` reports it as an agent that was not found.

Since 0.7.0, results end with up to three suggested next steps, and each follow-up you send is reported as applied, deferred or unchanged. Each objective's checklist is also mirrored into the session's todo tables for Copilot's plan and todo views. Start a fresh session after updating.

## From 0.5.0 project notes to memory and knowledge

Version 0.6.1 introduces this migration. Update the marketplace and plugin using the [installation guide](install.md#update), then start a fresh session; existing sessions retain their loaded profiles. Scout reverifies selected facts from the old local note and preserves the original file.

Scout treats `.copilot-concierge/project-notes.md` as read-only migration input. It checks each useful fact against current repository evidence, leaves personal or secret content behind, and moves only selected confirmed facts into the managed section of `docs/concierge/knowledge.md`. Notes are not copied wholesale, used as their own evidence, or converted into personal memories. Scout reports what it retained, corrected, skipped or could not verify.

The original note file stays unchanged; Scout no longer maintains it alongside the new knowledge document. Completed migration retires legacy reads, and later edits to the old notes are not imported. Future corrections use current repository sources. Existing knowledge entries are reconciled instead of duplicated. If `docs/concierge/knowledge.md` already exists without Concierge's ownership markers, Scout preserves it and reports the conflict rather than adopting or overwriting it. User-written text outside valid markers is preserved. Explicit no-write instructions, unavailable prerequisites or unsafe paths leave migration pending and keep discovery in the current session.

Private preferences start separately at `~/.config/copilot-concierge/memory.json`, outside all Git worktrees. Only direct user preferences or user-confirmed inferences may be saved; repository files, old notes and transcripts cannot seed that file. You can inspect, correct, forget or disable memory in ordinary conversation. See [memory and knowledge](memory-and-knowledge.md).

After reviewing migrated knowledge, an implementer may include the documentation diff in a relevant commit you asked for. Scout never stages or commits, changes ignore rules, deletes the old notes or rewrites history. The old local notes should remain untracked. Removing a fact from today's knowledge document does not erase it from earlier commits.

## From Concierge 0.4.x

The plugin and marketplace IDs stay `copilot-concierge`. Version 0.5.0 renames the entry agent from `frontdesk` to `concierge`; there is no old-name agent alias.

1. Finish or stop active work, then run `copilot plugin marketplace update copilot-concierge` and `copilot plugin update copilot-concierge`.
2. Update shortcuts and scripts to `copilot --agent copilot-concierge:concierge`, or select **concierge** in the app. Start a fresh session and restart the app if its picker is stale.
3. Prefer `models.concierge` in configuration. The launcher still accepts `models.frontdesk` as a deprecated input alias. Do not put both keys in the same configuration file.

Published 0.5.0 may create or refresh `.copilot-concierge/project-notes.md` within its bounded note rules unless you explicitly prohibit file writes. Version 0.6.1 instead uses the migration above. Existing project configuration, notes and Copilot session history are preserved by updates and removal.

## From the Zilot 0.3.x plugin

Version 0.4.0 changes identifiers and configuration paths deliberately. A repository rename or ordinary plugin update does not migrate these settings. Finish or stop active work before removing an installation; an old Copilot session can still refer to the old agent IDs.

1. If the old plugin is installed, run `copilot plugin uninstall zilot@zilot`; use `copilot plugin uninstall zilot` for a direct installation. If the old marketplace is registered, run `copilot plugin marketplace remove zilot`. Skip either action when that item is absent.
2. Register the canonical public repository and install the new identity:

   ```sh
   copilot plugin marketplace add goldsziggy/copilot-concierge
   copilot plugin install copilot-concierge@copilot-concierge
   ```

3. Copy chosen settings from `.zilot/config.json` to `.copilot-concierge/config.json`, and from `~/.config/zilot/config.json` to `~/.config/copilot-concierge/config.json`. Create the new parent folder as needed. Inspect existing destinations and merge intentionally instead of overwriting them. Session configuration files passed with `--session-config` retain that explicit path, but review any embedded old paths or agent references.
4. Rename custom routing folders and each `SKILL.md` frontmatter `name`: `zilot-routing` becomes `copilot-concierge-routing`; `zilot-routing-<team>` becomes `copilot-concierge-routing-<team>`. Do this in each applicable repository, personal skills directory and team plugin. Change routing rows and custom instructions referencing `zilot:<role>` to `copilot-concierge:<role>`. Team-owned plugins need their own reviewed update; do not edit an installed cache as the source of truth.
5. Update scripts, shortcuts and launch commands to `copilot --agent copilot-concierge:concierge`. Run the custom-profile check described in [customizing](customizing.md), restart the app if needed, and verify the new agent and routing in a fresh session.

Concierge reads only the new default config paths and routing prefix. It does not copy, delete or silently fall back to old settings. Uninstalling the old plugin leaves those files and Copilot session history intact. Retain old settings until the migration is checked; remove them yourself only if no older installation needs them.

The plan-approval values and exact model choices are unchanged. A migration must not replace unavailable models with Auto or a fallback. Internal message markers now use `CONCIERGE-BRIEF`, `CONCIERGE-HANDOFF` and `CONCIERGE-REPORT`; update custom agent instructions mentioning the old markers too.

## From the former Zilot application

Zilot 0.2.0 and later used native Copilot agents and skills. Concierge continues that native design. This public plugin distribution does not include the former React application, server, scheduler, database, dashboard or prototype controller.

Installing Concierge does not migrate or delete application data. Keep existing data and backups separately. Recovery of a former application requires its original source and backups; do not reset a working tree containing unrelated work.

The public repository began with the approved native snapshot. It does not contain private development history, local sessions or historical benchmark outputs. Historical application benchmarks do not establish this plugin's capabilities. Zilot 0.3.0 observations remain labeled historical; Concierge release checks are recorded separately in [runtime verification](runtime-verification.md).
