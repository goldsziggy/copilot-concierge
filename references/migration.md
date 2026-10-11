# Migrating from Zilot to Concierge

Concierge 0.4.0 is the maintained native Copilot plugin. Its canonical public repository is `goldsziggy/copilot-concierge`; its package, plugin and marketplace IDs are `copilot-concierge`. The former private development repository remains separate and unchanged. The historical public `v0.3.1` tag and release keep their Zilot source, IDs and uploaded assets.

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
5. Update scripts, shortcuts and launch commands to `copilot --agent copilot-concierge:frontdesk`. Run the custom-profile check described in [customizing](customizing.md), restart the app if needed, and verify the new agent and routing in a fresh session.

Concierge reads only the new default config paths and routing prefix. It does not copy, delete or silently fall back to old settings. Uninstalling the old plugin leaves those files and Copilot session history intact. Retain old settings until the migration is checked; remove them yourself only if no older installation needs them.

The plan-approval values and exact model choices are unchanged. A migration must not replace unavailable models with Auto or a fallback. Internal message markers now use `CONCIERGE-BRIEF`, `CONCIERGE-HANDOFF` and `CONCIERGE-REPORT`; update custom agent instructions mentioning the old markers too.

## From the former Zilot application

Zilot 0.2.0 and later used native Copilot agents and skills. Concierge continues that native design. This public plugin distribution does not include the former React application, server, scheduler, database, dashboard or prototype controller.

Installing Concierge does not migrate or delete application data. Keep existing data and backups separately. Recovery of a former application requires its original source and backups; do not reset a working tree containing unrelated work.

The public repository began with the approved native snapshot. It does not contain private development history, local sessions or historical benchmark outputs. Historical application benchmarks do not establish this plugin's capabilities. Zilot 0.3.0 observations remain labeled historical; Concierge 0.4.0 checks are recorded separately in [runtime verification](runtime-verification.md).
