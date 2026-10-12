# Capability matrix: Copilot CLI and the GitHub Copilot app

## Concierge 0.6.0 candidate (unreleased)

The development branch replaces Scout's maintained local note with private OS-user preferences and versioned repository knowledge. Concierge and Sol remain control-only; the same Scout (including routed/escalated Scout work) retrieves and curates both stores. Explicit file-write restrictions apply separately to each destination. The bundled Node 20+ helper uses plain files and read-only Git root checks; there is no service or transcript capture.

Private preferences are outside Git at `~/.config/copilot-concierge/memory.json`. Verified facts and decisions are in a managed section of `docs/concierge/knowledge.md`; assumptions remain in the current brief. The old project note is preserved as read-only migration input and is not maintained in parallel. See [memory and knowledge](memory-and-knowledge.md).

Persistence requires Node.js 20+ and Git, existing tool/path permission, and a supported local filesystem. POSIX uses the Node filesystem helper; Windows has a bundled Windows PowerShell 5.1/.NET adapter for local fixed NTFS drives. Windows checks use file handles and SID-based ownership/access rules, not Unix mode bits. Unsupported paths, access rules or host policy stop persistence while ordinary work can continue with session-only context. See [supported storage](memory-and-knowledge.md#supported-storage).

The Windows implementation and portable policy checks do not establish native Windows behavior. Native Windows integration tests and live Copilot workflows require separate runs; no native Windows host or new model-session evidence is available for this local change. The installed plugin and ongoing comparison experiment remain unchanged.

## Released Concierge 0.5.0 scope

The current entry is `copilot-concierge:concierge`; `frontdesk` is a historical name, not an invocation alias. The source adds bounded Scout project notes, an orchestrated Ship it role and verification of custom profile model pins before dispatch. These are instruction contracts; current source, installation and live-trial evidence is recorded separately in [runtime verification](runtime-verification.md).

The 2026-10-11 candidate app smoke observed the sole `concierge` picker entry, a Luna root (selected in the app), Sol orchestrator and Luna Scout, normal note creation, and a follow-up that refreshed a contradicted note fact. Source checks passed 57 tests on Node 20 and 22. This does not establish all host workflows or live provider creation; see the scoped [candidate evidence](runtime-verification.md#reviewed-candidate-checks-2026-10-11).

Scout note maintenance is a narrow file-write exception during normal research, disabled by an explicit user no-write instruction. Unsafe path types, unresolved containment or denied access stop note access or maintenance. Other work keeps its assigned scope.

Actual GitHub/GitLab draft creation and Windows/Linux model workflows remain unverified. Neither static checks nor a marketplace installation prove those workflows.

### Ship it instruction contract (not live acceptance)

| Capability | GitHub | GitLab |
| --- | --- | --- |
| Optional offer after verified implementation | Source contract; Concierge asks, orchestrator delegates | Same |
| Read-only target, published-change and duplicate preflight | Existing authorized capability required; fork/multiple/self-hosted remotes must resolve unambiguously | Same |
| Separate publication consent | Exact provider/host/project, head/base, title/body and draft flag confirmed; independent of plan approval/auto/tool permission | Same |
| Draft creation | Supported native `create_pull_request` where required by host; its session/repository/head restrictions apply | Existing authorized integration/CLI must support creation as a draft on the confirmed instance |
| Unsupported or ambiguous state | Stops safely; no implicit commit/push, duplicate or non-draft conversion | Same |
| Live app preflight smoke | Named Luna Ship it worker stopped on a fixture with no remote or commits; fixture contents and notes unchanged | Not performed |
| Live draft creation | **Not performed** | **Not performed** |

Static regressions cover role/model/tool inheritance, consent/draft gates and safe-stop instructions. They do not demonstrate provider authorization, actual API behavior or user-question rendering in either client. No provider connector, server or credentials are bundled.

## Historical Concierge 0.4.0 status

The 0.4.0 source candidate passed 39 tests, package validation, catalog synchronization and offline host catalog discovery for `copilot-concierge`. Live app/model workflows were not replayed under the new identifiers. See [runtime verification](runtime-verification.md) for scope; the historical table below is not new live acceptance evidence.

## Historical Zilot 0.3.0 observations

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
