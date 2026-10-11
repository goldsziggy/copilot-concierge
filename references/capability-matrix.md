# Capability matrix: Copilot CLI and the GitHub Copilot app

What Zilot 0.3.0 does in each client, as observed on 2026-10-10 (CLI 1.0.93 and 1.0.95; app 1.1.28 with runtime 1.0.94-3). "Verified" means seen in a real session; details and limits are in [runtime verification](runtime-verification.md). GitHub Desktop is a different product and is not supported.

| Capability | Copilot CLI | GitHub Copilot app |
| --- | --- | --- |
| Install | Verified: `copilot plugin marketplace add <repo or path>` then `copilot plugin install zilot@zilot`; also direct install and session-only `--plugin-dir` | Verified: Customize → Plugins (marketplace, or a plugin installed by the CLI after an app restart). The app cannot read folders under `~/Documents` or external drives on macOS |
| Start Zilot | Verified: `copilot --agent zilot:frontdesk`, or `/agent` → frontdesk | Verified: agent picker → **frontdesk**, then choose **GPT-6 Luna** in the model picker before the first message |
| Only the front desk listed in pickers | Verified (`user-invocable: false` on internal roles) | Verified |
| Front desk on Luna 6 | Verified (profile model applied automatically) | Partial: the app applies its startup model unless GPT-6 Luna is chosen first; with it chosen, verified |
| Sol 6.1 orchestrator and Luna 6 specialists | Verified (required model policy) | Verified |
| Specialists read and change the project | Verified | Verified |
| Sol delegates instead of doing the work | Verified: Sol called only `task` and `update_todo` | Verified |
| Parallel specialists | Verified | Not observed: the app run used scout, enterprise UX, Node and reviewer one after another |
| Focused question for missing information | Verified: native question form with suggestions and free text | Verified |
| Plan approval (default) | Verified: native question, Approve / Change something / Cancel | Verified |
| Configured auto-approval | Verified (project `.zilot/config.json`) | Not separately exercised; same instructions |
| Copilot tool permissions | Host prompts, or `--allow-all` / `/allow-all` | Host prompts, or Mode → Tool permissions → Approve all |
| Root task list | Root `update_todo` succeeds but the interactive timeline does not render it; Sol's updates render under its agent; `/tasks` shows the agent tree | Verified: "Updated todo list n/m done" rows and "Updated plan" in the main conversation |
| Subagent status and results | `/tasks` tree; inline agent cards with results | Background chip (Working/Idle, Cancel) and a tab per agent with model, children and reports |
| Follow-up to the same work | Verified: same orchestrator via `write_agent` | Verified |
| Several objectives at once | Verified: concurrent orchestrators, root list keeps each objective's items | Not separately exercised; same profiles |
| Rollover of long objectives | Verified with a lowered test threshold: `<name>-2` continues from the handover without redoing work | Not separately exercised; same profiles |
| Unrelated request | Verified: new orchestrator | Not separately exercised |
| Bare ticket | Verified honest "no connector" report; connected ticket source untested | Not exercised |
| Customer agents, skills and `zilot-routing` | Verified: repository `.github/agents` and `.github/skills`, routing override, customer skill applied; `--add-dir` folders too | Skills in repositories and `~/.copilot` are documented to appear; agents and routing not exercised in the app |
| Cancel | Verified: say "stop", Esc, "esc stop agents", `/tasks` | Stop button and per-agent Cancel present; not exercised |
| Unavailable model | Verified: host refuses, Zilot reports, no substitution | Same host check; not exercised |
| Resume | Verified: `copilot --resume`; lost orchestrator replaced after checking existing work | Sessions reopen from the sidebar; not exercised |
| Explicit escalation to Sol 6.1 | Verified (`zilot:escalation` after repeated worker failure) | Same profiles; not exercised |
