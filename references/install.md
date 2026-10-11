# Install, start and remove Zilot

You need GitHub Copilot CLI 1.0.93 or later and/or the GitHub Copilot app, signed in to an account that offers `gpt-6-luna` and `gpt-6.1-sol`. Zilot adds no services, hooks or credentials. The account must allow both named models; Free/Student plans limited to Auto are not supported by Zilot's required-model policy. Organization model policies can also restrict availability.

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
copilot plugin marketplace add goldsziggy/zilot-plugin
copilot plugin install zilot@zilot
```

App: **Customize → Plugins → Add plugin → Manage marketplaces**, enter `goldsziggy/zilot-plugin`, select **Add marketplace**, then install **zilot**. The CLI and the app share the same settings, so either install works in both after the app restarts.

`goldsziggy/zilot-plugin` is the plugin-only distribution repository. Its marketplace follows `main`; use `goldsziggy/zilot-plugin#v0.3.1` to pin a published 0.3.1 release. No access to the former private development repository is needed.

### From a local copy

Unzip `zilot-0.3.1.zip` (it contains a `zilot` folder) or clone the repository into a location **outside** `~/Documents`, `~/Desktop`, `~/Downloads` and external drives, because macOS blocks the app from reading those folders. Then point Copilot at that `zilot` folder:

```sh
copilot plugin marketplace add /path/to/zilot
copilot plugin install zilot@zilot
```

A marketplace that points at a local folder loads the plugin live from that folder. To try Zilot for a single CLI session without installing anything, use `copilot --plugin-dir /path/to/zilot --agent zilot:frontdesk`.

## Start

CLI, from the project folder:

```sh
copilot --agent zilot:frontdesk
```

Or run `/agent` in an open session and pick **frontdesk**.

App: open a project, choose **frontdesk** in the agent picker under the message box, then choose **GPT-6 Luna** in the model picker **before sending the first message**. The app otherwise starts the session on its default model; Zilot's orchestrator and specialists keep their own pinned models either way.

Then describe the goal, ask a question or paste a ticket. Zilot asks focused questions, shows a short plan for approval and reports back. See [sample prompts](../examples/requests.md).

Copilot keeps its own tool permissions. To stop being asked before each command or edit, use `copilot --agent zilot:frontdesk --allow-all` (or `/allow-all`) in the CLI, or **Mode → Tool permissions → Approve all** in the app. That is separate from Zilot's plan approval.

## Configure (optional)

Zilot reads two optional files; nothing creates them for you:

- Project: `.zilot/config.json`
- Your user account: `~/.config/zilot/config.json`

```json
{ "planApproval": "auto" }
```

`ask` (the default) shows the plan and waits for your answer; `auto` shows the plan and continues. Saying "go ahead without asking" or "ask me first" in the conversation overrides the files for that request or session. The project file wins over the user file. Reading the user file may trigger one Copilot path prompt.

### Your own agents and skills

Add agents, skills and a `zilot-routing` table in the places Copilot already reads (the repository's `.github/`, `~/.copilot/`, or a team plugin), and Zilot's orchestrator will use them. See [adding your own agents and skills](customizing.md).

### Session-local launcher

For different models or a scripted setup, `node scripts/launch.mjs --project /path/to/project` creates a configured copy of the plugin and starts the CLI with it. It reads the same files plus `--session-config FILE` and `--plan-approval ask|auto`, and accepts `models` (`frontdesk`, `orchestrator`, `specialist`, `escalation`) and `extraDirectories` in those files. `node scripts/configure.mjs --print-only` shows the resolved settings without launching.

## Moving from the private development marketplace

If a marketplace named `zilot` is already registered against the private development repository, first uninstall its plugin and remove that marketplace, then add the public repository. The IDs remain the same, so registering a second `zilot` marketplace is not an independent migration.

```sh
copilot plugin uninstall zilot@zilot
copilot plugin marketplace remove zilot
copilot plugin marketplace add goldsziggy/zilot-plugin
copilot plugin install zilot@zilot
```

This does not delete Copilot session history or your `.zilot/config.json`.

## Update

```sh
copilot plugin marketplace update zilot
copilot plugin update zilot
```

In the app, **Customize → Plugins → Update all**.

## Remove

```sh
copilot plugin uninstall zilot@zilot
copilot plugin marketplace remove zilot
```

Use `copilot plugin uninstall zilot` if you installed it directly from a path. In the app, open the plugin's actions in **Customize → Installed** and uninstall it. Delete `.zilot/config.json` or `~/.config/zilot/config.json` if you created them. Copilot keeps its own session history; removing Zilot does not delete it.
