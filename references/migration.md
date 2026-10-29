# Migrating to Concierge

Concierge is the maintained native Copilot plugin. Its canonical public repository is `goldsziggy/copilot-concierge`; its package, plugin and marketplace IDs are `copilot-concierge`. The former private development repository remains separate and unchanged. The historical public `v0.3.1` tag and release keep their Zilot source, IDs and uploaded assets.

## From Concierge 0.6.1

Version 0.7.0 removes the Ship it specialist and its two-step draft PR/MR offer. Ask for commits, pushes or pull requests directly instead ("commit this on a new branch and open a draft PR"), in a request, a follow-up or a plan step. Copilot's tool permissions decide each command; there is no separate Concierge consent step. If a `copilot-concierge-routing` table routes the `ship-it` role, remove that row: `node scripts/check-custom.mjs` reports it as an agent that was not found.

Results now end with up to three suggested next steps, and each follow-up you send is reported as applied, deferred or unchanged. Each objective's checklist is also mirrored into the session's todo tables for Copilot's plan and todo views. Start a fresh session after updating.

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
