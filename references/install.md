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

`goldsziggy/copilot-concierge` is the canonical, maintained plugin repository. Its marketplace follows `main`; use `goldsziggy/copilot-concierge#v0.5.0` to pin the published 0.5.0 release. No access to the former private development repository is needed.

### From a local copy

Unzip `copilot-concierge-0.5.0.zip` (it contains a `copilot-concierge` folder) or clone the repository. On macOS, choose a location the app can read: historical app trials encountered privacy restrictions under `~/Documents` and external drives. Then point Copilot at the extracted or cloned `copilot-concierge` folder:

```sh
copilot plugin marketplace add /path/to/copilot-concierge
copilot plugin install copilot-concierge@copilot-concierge
```

A marketplace that points at a local folder loads the plugin live from that folder. To try Concierge for a single CLI session without installing anything, use `copilot --plugin-dir /path/to/copilot-concierge --agent copilot-concierge:concierge`.

## Start

CLI, from the project folder:

```sh
copilot --agent copilot-concierge:concierge
```

Or run `/agent` in an open session and pick **concierge**.

App: open a project, choose **concierge** in the agent picker under the message box, then choose **GPT-6 Luna** in the model picker **before sending the first message**. The app otherwise starts the session on its default model; Concierge's orchestrator and specialists keep their own pinned models either way.

Then describe the goal, ask a question or paste a ticket. Concierge asks focused questions, shows a short plan for approval and reports back. See [sample prompts](../examples/requests.md).

Copilot keeps its own tool permissions. To stop being asked before each command or edit, use `copilot --agent copilot-concierge:concierge --allow-all` (or `/allow-all`) in the CLI, or **Mode → Tool permissions → Approve all** in the app. That is separate from Concierge's plan approval.

## Persistent learning in the 0.6.0 candidate (unreleased)

The published 0.5.0 plugin uses local Scout project notes. The unreleased 0.6.0 candidate separates private preferences from repository knowledge; marketplace installation does not yet include that change.

Persistence needs Node.js 20 or later and Git on the host where Scout runs. Scout uses the bundled helper; no service, database or background process is installed. If a prerequisite is missing, access is denied, or a safe path cannot be established, it continues with session-only context.

On Windows, the helper uses the included adapter through **Windows PowerShell 5.1** and .NET Framework at the system path. This is separate from the PowerShell version used to run Copilot above; you do not select or install a PowerShell module for Concierge. Storage is limited to local fixed NTFS drives. Network shares, unsupported filesystems, linked paths and path aliases are rejected. The adapter checks Windows ownership and access rules rather than Unix permission bits. It does not elevate access, change execution policy or repair existing permissions. See [supported storage and Windows limits](memory-and-knowledge.md#supported-storage).

**Windows execution policy.** The adapter is a PowerShell script, so Windows PowerShell's execution policy must allow it. Windows client editions, such as Windows 10 and 11, default to `Restricted`, which blocks all scripts: on a default client, learning stays session-only. Windows Server defaults to `RemoteSigned`, which runs local unsigned scripts but not unsigned scripts marked as downloaded from the internet, such as files from a ZIP that kept its download mark. Group Policy can set either. Windows PowerShell 5.1 has its own policy settings, separate from PowerShell 7; run `Get-ExecutionPolicy -List` in Windows PowerShell to see them. Concierge never changes or bypasses the policy. Whether to allow local scripts is your or your administrator's decision. [Microsoft: execution policies](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_execution_policies?view=powershell-5.1)

Native Windows tests for this adapter pass in GitHub Actions on a Windows Server 2025 runner with Node 20 and 22, using real NTFS, ACL and file-handle APIs under the runner's default policy. They do not cover Windows client editions, other filesystems, a second ordinary user or live Copilot sessions. See [verification status](runtime-verification.md#concierge-060-candidate-unreleased).

Private preferences use `~/.config/copilot-concierge/memory.json` in your operating-system account's home directory, outside every Git worktree. They are shared across your projects on that computer, not synced between devices and not separated by Copilot sign-in. Repository knowledge uses only `docs/concierge/knowledge.md` in the assigned Git worktree. The helper does not write into an installed plugin or redirect storage into the project if private storage is unavailable. See [memory and knowledge](memory-and-knowledge.md).

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

For different models or a scripted setup, `node scripts/launch.mjs --project /path/to/project` creates a configured copy of the plugin and starts the CLI with it. It reads the same files plus `--session-config FILE` and `--plan-approval ask|auto`, and accepts `models` (`concierge`, `orchestrator`, `specialist`, `escalation`) and `extraDirectories` in those files. `node scripts/configure.mjs --print-only` shows the resolved settings without launching.

The deprecated `models.frontdesk` setting remains accepted as an input alias for `models.concierge`. Use only one of these keys in each configuration file; specifying both is an error. This setting compatibility does not preserve the old agent invocation.

## Moving from Concierge 0.4.x

Update the plugin using the commands below, replace `copilot-concierge:frontdesk` with `copilot-concierge:concierge` in launch commands, and select **concierge** in the app. There is no `frontdesk` agent alias. Finish or stop active work, then start a fresh session; existing sessions can still refer to the old profile. Restart the app if its picker has not refreshed. Prefer `models.concierge` in new configuration files. See [migration](migration.md).

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

Use `copilot plugin uninstall copilot-concierge` if you installed it directly from a path. In the app, open the plugin's actions in **Customize → Installed** and uninstall it. Your configuration and learning files remain in place. In the development version these include private `~/.config/copilot-concierge/memory.json` and repository `docs/concierge/knowledge.md`; earlier `.copilot-concierge/project-notes.md` files are also preserved. Before uninstalling, you can ask Concierge to forget saved preferences or remove its managed knowledge entries. Inspect files before deleting them yourself, and preserve any user-written text in the knowledge document. Uninstalling does not remove files from repositories or erase earlier commits. Copilot keeps its own session history; removing Concierge does not delete it.
