# Install, start and remove Concierge

You need GitHub Copilot CLI 1.0.93 or later and/or the GitHub Copilot app, signed in to an account that offers `gpt-6-luna` and `gpt-6.1-sol`. Concierge adds no services, hooks or credentials. The account must allow both named models; Free/Student plans limited to Auto are not supported by Concierge's required-model policy. Organization model policies can also restrict availability.

## Windows prerequisites

Use PowerShell 6 or later and the native Copilot installation:

```powershell
winget install GitHub.Copilot
copilot --version
```

Then sign in through Copilot and use the same marketplace commands below. Git must be available for Git-hosted marketplaces. The optional npm route for installing Copilot itself requires Node.js 22 or later. [Official CLI installation](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli).

The plugin's source checks accept LF and CRLF. Windows Copilot orchestration and the optional Node session launcher have not been verified end to end; use the native CLI entry point below. Source packaging requires Node.js 20 or later and Python 3 available as `python3`.

## Install

### From the plugin marketplace

CLI:

```sh
copilot plugin marketplace add goldsziggy/copilot-concierge
copilot plugin install copilot-concierge@copilot-concierge
```

App: open **Customize → Plugins**, use the marketplace control beside the marketplace dropdown, and add `goldsziggy/copilot-concierge`. Find **copilot-concierge** and select **Install**. Restart the app after a CLI installation if the plugin does not appear. See [GitHub’s app instructions](https://docs.github.com/en/copilot/how-tos/github-copilot-app/customize-github-copilot-app#adding-plugins).

`goldsziggy/copilot-concierge` is the canonical, maintained plugin repository. Its marketplace follows `main`; use `goldsziggy/copilot-concierge#v0.4.0` to pin a published 0.4.0 release. No access to the former private development repository is needed.

### From a local copy

Unzip `copilot-concierge-0.4.0.zip` (it contains a `copilot-concierge` folder) or clone the repository. On macOS, choose a location the app can read: historical app trials encountered privacy restrictions under `~/Documents` and external drives. Then point Copilot at the extracted or cloned `copilot-concierge` folder:

```sh
copilot plugin marketplace add /path/to/copilot-concierge
copilot plugin install copilot-concierge@copilot-concierge
```

A marketplace that points at a local folder loads the plugin live from that folder. To try Concierge for a single CLI session without installing anything, use `copilot --plugin-dir /path/to/copilot-concierge --agent copilot-concierge:frontdesk`.

## Start

CLI, from the project folder:

```sh
copilot --agent copilot-concierge:frontdesk
```

Or run `/agent` in an open session and pick **frontdesk**.

App: open a project, choose **frontdesk** in the agent picker under the message box, then choose **GPT-6 Luna** in the model picker **before sending the first message**. The app otherwise starts the session on its default model; Concierge's orchestrator and specialists keep their own pinned models either way.

Then describe the goal, ask a question or paste a ticket. Concierge asks focused questions, shows a short plan for approval and reports back. See [sample prompts](../examples/requests.md).

Copilot keeps its own tool permissions. To stop being asked before each command or edit, use `copilot --agent copilot-concierge:frontdesk --allow-all` (or `/allow-all`) in the CLI, or **Mode → Tool permissions → Approve all** in the app. That is separate from Concierge's plan approval.

## Configure (optional)

Concierge reads two optional files; nothing creates them for you:

- Project: `.copilot-concierge/config.json`
- Your user account: `~/.config/copilot-concierge/config.json`

```json
{ "planApproval": "auto" }
```

`ask` (the default) shows the plan and waits for your answer; `auto` shows the plan and continues. Saying "go ahead without asking" or "ask me first" in the conversation overrides the files for that request or session. The project file wins over the user file. Reading the user file may trigger one Copilot path prompt.

### Your own agents and skills

Add agents, skills and a `copilot-concierge-routing` table in the places Copilot already reads (the repository's `.github/`, `~/.copilot/`, or a team plugin), and Concierge's orchestrator will use them. See [adding your own agents and skills](customizing.md).

### Session-local launcher

For different models or a scripted setup, `node scripts/launch.mjs --project /path/to/project` creates a configured copy of the plugin and starts the CLI with it. It reads the same files plus `--session-config FILE` and `--plan-approval ask|auto`, and accepts `models` (`frontdesk`, `orchestrator`, `specialist`, `escalation`) and `extraDirectories` in those files. `node scripts/configure.mjs --print-only` shows the resolved settings without launching.

## Moving from Zilot 0.3.x

Concierge 0.4.0 uses new identifiers. If `zilot` is installed, uninstall it first; remove the `zilot` marketplace only if it is registered. This applies to either the former public plugin or private development marketplace. Then install the maintained public plugin:

```sh
copilot plugin uninstall zilot@zilot
copilot plugin marketplace remove zilot
copilot plugin marketplace add goldsziggy/copilot-concierge
copilot plugin install copilot-concierge@copilot-concierge
```

For a direct legacy installation, use `copilot plugin uninstall zilot`. If no old installation or marketplace exists, skip its removal command. In the app, uninstall the old plugin and remove the old marketplace before adding the new one.

Manually copy chosen settings from `.zilot/config.json` to `.copilot-concierge/config.json` and from `~/.config/zilot/config.json` to `~/.config/copilot-concierge/config.json`; inspect existing destinations before merging or overwriting them. Rename custom `zilot-routing` skill folders and frontmatter names to `copilot-concierge-routing`, including suffixed variants, and change routed `zilot:<role>` IDs to `copilot-concierge:<role>`. See the [full migration checklist](migration.md).

Concierge does not silently read legacy config paths or routing names. Removal leaves Copilot session history and your old files intact. The preserved v0.3.1 release still uses the old IDs; a GitHub URL redirect does not migrate a Copilot installation.

## Update

```sh
copilot plugin marketplace update copilot-concierge
copilot plugin update copilot-concierge
```

In the app, **Customize → Plugins → Update all**.

## Remove

```sh
copilot plugin uninstall copilot-concierge@copilot-concierge
copilot plugin marketplace remove copilot-concierge
```

Use `copilot plugin uninstall copilot-concierge` if you installed it directly from a path. In the app, open the plugin's actions in **Customize → Installed** and uninstall it. Delete `.copilot-concierge/config.json` or `~/.config/copilot-concierge/config.json` if you created them. Copilot keeps its own session history; removing Concierge does not delete it.
