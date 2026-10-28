# Runtime verification

## Concierge 0.7.0 candidate — 2026-10-28

Based on `c937c801e4125f44666349a13f8620e5b3714a32` (0.6.1), this candidate changes Sol from coordination-only to a working objective lead. It preserves the Concierge conversation layer, required model pins, leaf roles, explicit custom routes, learning helper and approval/publication contracts. Project instructions are enabled for Sol. Direct execution, selective delegation, role-neutral skills and material evidence are instruction contracts, not security enforcement or observed model behavior.

Cloud Linux, Node 24.22.1: `npm test` ran 128 tests: **108 passed, 7 failed, 13 native Windows checks skipped**. The seven failures are private-memory persistence fixtures: this host has a pre-existing `/tmp/.git`, so synthetic homes under `/tmp` correctly fail the helper's no-Git-ancestor rule. An unchanged clone of baseline `c937c80` reproduced the same seven failures (118 tests: 98 passed, 7 failed, 13 skipped). The storage helper was not changed and no safeguard or test was disabled to obtain a pass. This is not a full green suite; rerun on an ordinary host with a temporary directory outside Git before release acceptance.

`npm run validate`, `npm run catalog:check`, `npm run package` and `git diff --check` passed for the candidate. The architecture SVG was rendered and visually inspected. New source-contract tests, debugging and task-evaluation skill checks, and evaluation fixtures pass. The candidate contains 12 skills and 11 agents. No new Node 20/22, native Windows, offline Copilot catalog, installed-plugin or live model trial is claimed. No tag, publication or remote CI is established by these local checks.

The twelve-scenario [comparative evaluation](comparative-evaluation.md) includes repeated paired baseline/candidate runs, matched-model analysis where available, acceptance and regression gates, human approval wait, failed attempts and actual usage. Its run template is explicitly unexecuted. No speed, cost, quality improvement or rendered approval behavior is claimed until those measurements exist. Historical sessions below retain their original version and scope.

## Concierge 0.6.1 structured plan approvals — 2026-10-13

The release candidate is based on main `dc08552d6405e88cdc5e2bb6cbfd6c176804ccfb`. It adds structured approval plans to the orchestrator and preserves them through Concierge's existing `ask_user` flow. It also ships the memory, knowledge and customization work from the previously unpublished 0.6.0 candidate; historical evidence below retains its original scope.

Source-contract checks in `tests/approval-format.test.mjs` cover section spacing and numbered steps, exact choices and PLAN DECISION messages, Approve, Change something, Cancel, revised-plan approval, blocking questions, missing/ambiguous answers and fallback when `ask_user` is unavailable. Existing tests still guard role/model/tool boundaries, approval precedence and separate publication consent. These tests inspect instructions and examples; they do not execute a model or demonstrate UI rendering.

The macOS Node 20.19.4 and 22.22.0 source suites each passed 105 tests, with 13 native Windows tests skipped. Validation and synchronized catalog checks passed. Offline Copilot CLI 1.0.95 accepted the 0.6.1 catalog and returned its expected plugin metadata in temporary host state; see `distribution/native-catalog-validation.json`. This metadata check does not install the plugin or invoke models. The release's exact commit, Linux/Windows CI and artifact evidence are recorded in the linked GitHub [release](https://github.com/goldsziggy/copilot-concierge/releases/tag/v0.6.1) and [Actions runs](https://github.com/goldsziggy/copilot-concierge/actions).

No pre-release live model or rendered app/CLI approval test is claimed here. Approve, Change something, Cancel, revision handling and the no-tool fallback are source-contract coverage until observed in a bounded host session. The existing app session was left untouched. The memory/knowledge workflow, GitHub/GitLab draft creation and Windows/Linux model workflows still have the live-verification limits documented below. Installation, catalog discovery and static tests alone do not prove those workflows.

<a id="concierge-060-candidate-unreleased"></a>

## Historical Concierge 0.6.0 candidate checks

The isolated development branch adds a self-contained Scout filesystem helper, private user preference records, confirmed repository knowledge under `docs/concierge`, and reviewed migration of legacy project notes. These are plain-file operations, not a daemon, database or transcript service. The helper checks schemas, bounded storage, paths and revisions; Scout and review still establish truth, appropriate user provenance and privacy of prose.

Verification for this branch uses synthetic homes and disposable Git repositories. Behavioral tests cover persistence/reload, corrections/removal, disabled memory, repository and private-store isolation, managed-doc preservation, unsafe paths, optimistic concurrency and selected migration. Instruction checks cover control-only routing, privacy scope, routed Scout/escalation, rollover and deliberate knowledge commits. These tests are not evidence that a model followed the new workflow.

The follow-up Windows implementation replaces the blanket platform refusal with a bundled Windows PowerShell 5.1/.NET adapter for local fixed NTFS storage. It adds Windows handle-based path checks, SID-based access rules and staged replacement while retaining the common schema, managed Markdown and migration contract.

Verification has three separate scopes: portable schema, adapter-contract and platform-policy tests; native Windows filesystem integration tests; and live Copilot/model workflows. Native Windows cases in `tests/learning-windows.test.mjs` exercise real filesystem, ACL and handle APIs and skip on other platforms; they are not replaced with a simulated Windows filesystem. No live Copilot/model session has exercised this change on any platform. The historical test counts below do not cover it.

### Native Windows CI, 2026-10-12

GitHub Actions [run 38263163051](https://github.com/goldsziggy/copilot-concierge/actions/runs/38263163051) on commit `1b574fb` passed all four jobs, as did the matching pull-request run. The Windows jobs used the `windows-2025-vs2026` runner image with Node 20.20.2 and 22.23.3. Each ran 13 native storage tests and the portable adapter tests; POSIX-only fixtures were skipped as designed. Commits after `1b574fb` change only documentation and rerun the same jobs. The native tests cover:

- private memory persistence, reload, correction, disabling and refusal to save while disabled, with created folders and the file owned by and granted only to the current account SID through a protected DACL;
- refusal to read a memory file after an Everyone rule is added, without changing that rule;
- repository knowledge whose new file and folders inherit their parent's access, survive a checkout-style rewrite and keep only inherited rules after an update;
- an existing knowledge file with an added explicit rule and user text, preserved across two concurrent writers, exactly one of which succeeds, with no leftover temporary or lock files;
- an update to a knowledge file owned by another account under a folder with a CREATOR OWNER rule, keeping its explicit rule while the writer's default owner applies;
- refusal to write while another lock exists, leaving that lock untouched, and a clean conflict with no leftover files when another program holds the document open during the final rename;
- junction and hard-link rejection without touching their targets; refusal of memory under a `.git` ancestor or below a folder that grants Everyone delete-child access;
- selected, idempotent legacy migration that leaves the old note unchanged and private preferences out of the document;
- the command-line UTF-8 input path, including rejection of malformed input;
- fail-closed behavior when the system PowerShell path is missing or a Process-scope `Restricted` policy blocks the bundled script.

Earlier native runs on this branch found four defects that macOS checks could not show; each is fixed: Git for Windows rejected Node's `\\.\nul` path for the global-config override, so every repository-root check failed; PowerShell converted absent snapshot values to empty strings, so every first write was rejected; `ReplaceFile` turned a repository file's inherited access rules into explicit copies, so updates now rename a staged file that already carries the verified descriptor; and Windows auto-inheritance flags differ between equivalent descriptors, so comparisons now cover owner, group, DACL protection and every rule but not those flags.

An independent read-only review of the branch then found no blockers. Its findings were fixed before the run above: Git now starts from the helper's own folder, so Windows cannot run a lookalike `git` from the repository; repository documents keep their DACL while the writer's default owner applies, so a non-elevated session can update a document an elevated process created; EFS-encrypted store files are replaced by encrypted files; read-only store files are refused; helper file names count toward the path limit; native tests assert exact messages; and the checker rejects reused Concierge agent and skill names. A follow-up review of those fixes found the encryption and CREATOR OWNER cases and two test defects, which were also fixed.

Limits: the runner is Windows Server, whose default execution policy allows local scripts, and it runs as an elevated built-in Administrator account. Windows client editions, whose default `Restricted` policy blocks the adapter, a non-elevated session, EFS-encrypted or read-only store files, non-NTFS or network volumes, a second ordinary user, hostile same-user races and live Copilot workflows were not tested.

No active comparison session, installed plugin or cache, other project checkout or user memory was changed for this work. No new model trials were run. Existing 0.5.0 observations below describe the previous project-notes contract, not acceptance of this feature.

## Published Concierge 0.5.0 — contract and evidence boundaries

Version 0.5.0 uses `copilot-concierge:concierge` as the sole user-facing entry. The launcher accepts `models.concierge`, with `models.frontdesk` as a deprecated input alias; this is configuration compatibility, not an agent alias.

Scout research may maintain one bounded project note after path/type checks, unless the user explicitly prohibits writes. The entry, orchestrator and Scout handoffs preserve that distinction. Custom routes must resolve to a discovered named profile with one required model pin; built-in unpinned workers are not a fallback. Ship it runs only through the orchestrator and needs separate confirmation after read-only preflight.

Source regressions test the written contracts and configuration behavior. They do not prove that a model always follows instructions, that a provider allows draft creation, or that a host displays every control as intended. GitHub/GitLab draft creation and Windows/Linux model workflows remain unverified live. Historical records below retain the exact identifiers and evidence scope of their original runs.

### Reviewed candidate checks, 2026-10-11

The 0.5.0 working tree based on `6cdb6916e77ac2650910ce7eed0d2f96edddee65` passed 57 tests on Node 20.19.4 and Node 22.22.0, package validation (10 skills, 11 agents, 82 files), synchronized marketplace catalogs, offline Copilot CLI 1.0.95 catalog discovery, and 20 static Vally lint checks across all ten skills. An intermediate ZIP matched all 82 source files and excluded local Scout notes. These checks preceded the final release commit; the release record supplies its immutable identity and CI results.

In GitHub Copilot app 1.1.28 with runtime 1.0.94-3 on macOS, a fresh disposable repository session exposed `concierge` as the sole custom picker entry. With GPT-6 Luna selected for the root, the session used `copilot-concierge:orchestrator` on GPT-6.1 Sol and `copilot-concierge:scout` on GPT-6 Luna. The root and orchestrator used only coordination tools; Scout performed the repository reads and note writes.

A normal contributor-orientation request, without a separate save-notes request, created `.copilot-concierge/project-notes.md` with three sourced facts (436 UTF-8 bytes). After the fixture README changed its design guidance from Teal to Coral, a follow-up orientation refreshed that fact while retaining the other two (438 bytes). The model reported both note writes. Repository trust was skipped and individual tool/path permissions were approved once; no persistent permission setting was widened. No product changes or test executions were requested in these trials.

These observations establish one creation and one refresh path on this host. Symlink/junction rejection, malformed notes, denied access, explicit no-write behavior, custom-route pin verification and concurrency remain instruction contracts with source checks, not completed live acceptance scenarios. The filesystem rules are instructions to the model, not an atomic filesystem security mechanism.

A third app request exercised Ship it in research mode with explicit wholly read-only scope. A named Sol orchestrator dispatched `copilot-concierge:ship-it` on Luna. It inspected the fixture's Git state, `gh pr create --help` and existing CLI authentication status, then stopped because the fixture had no commits, remote, upstream, published head or resolved target/base. The reported active CLI account did not establish authorization for a specific repository. Fixture content hashes, including project notes, stayed unchanged; no creation, commit, push, fetch, tests or settings changes occurred. This verifies one safe-stop preflight path, not provider draft creation or the exact-proposal confirmation UI.

## Pre-release dogfood source checks — before the 0.5.0 review

The Ship it addition defines an optional post-verification GitHub/GitLab draft workflow in native skills and profiles. Static regression coverage checks the internal required-model Luna specialist and inherited provider tools, front-desk/Sol/worker separation, existing control messages, exact metadata and separate publication consent, provider/draft capability gates, unpublished/dirty/duplicate safe stops, immediate revalidation and uncertain-outcome recovery. Routing and package validation include the new role/skill (10 skills, 11 agents).

On 2026-10-11 the pre-review working tree passed `npm test` (49 tests, including the existing scout project-notes regression and nine new Ship it/profile/validator/routing tests), `npm run validate` (10 skills, 11 agents, 79 files), `npm run catalog:check` and `git diff --check`. Tests used repository-local scratch state via `TMPDIR`/`TMP`/`TEMP`, with an isolated CommonJS boundary for the existing fake CLI fixture. No catalog regeneration, release archive or offline host-discovery replay was needed for this instruction-only addition.

These are source contracts, not provider simulations or live acceptance. No GitHub PR or GitLab MR was created, no model trial was run, and no commit, push or merge was performed for this change. Actual provider integration, authorization, draft API behavior, self-hosted/fork cases and native confirmation rendering remain unverified live. The earlier rebrand and historical Zilot records above/below retain their original evidence scope.

## Concierge 0.4.0 — source and offline discovery checks

The rebrand changes the plugin and marketplace IDs to `copilot-concierge`, agent namespace to `copilot-concierge:`, settings paths to `.copilot-concierge/config.json` and `~/.config/copilot-concierge/config.json`, routing to `copilot-concierge-routing`, and internal message markers to `CONCIERGE-*`.

On 2026-10-11 the 0.4.0 source candidate passed `npm test` (39 tests), `npm run validate`, `npm run catalog:check` and `node distribution/check-native-catalog.mjs`. Tests include the new metadata, qualified agent namespace and rejection of legacy or wrong plugin namespaces in custom routing. The last command exercises registration and discovery in temporary offline host state; it does not call a model or alter the user's persistent installation.

These checks were performed on the release working tree based on public commit `ecd5d4bf4eeb01f4c3b7cc536ac3bcf58f9319ec`, before the rebrand commit was assigned. The final release/CI record identifies the resulting commit and remote-install evidence. Live app/model workflows were not replayed for 0.4.0, and Windows/Linux model behavior remains unverified. Static checks, packaging, offline discovery and live model trials are distinct evidence; no new live workflow success is claimed here.

## Historical evidence: Zilot 0.3.0

Live acceptance for Zilot 0.3.0, run on 2026-10-10 against real Copilot sessions on macOS with the account's own models. Unit tests and fixtures are listed separately at the end; they are not live evidence.

Hosts: Copilot CLI 1.0.93 (scenarios 1–7 and the bare ticket) and 1.0.95 (it auto-updated mid-run; cancellation, resume, unavailable model and the final regression), and the GitHub Copilot app 1.1.28 with its bundled runtime 1.0.94-3. Models observed in every session: front desk `gpt-6-luna`, orchestrator `gpt-6.1-sol`, specialists `gpt-6-luna`, escalation `gpt-6.1-sol`, all with `modelSelectionSource: configured_required` unless noted.

These are historical maintainer observations. All identifiers, paths, version numbers and quoted output below describe Zilot 0.3.0 as observed; they are not current Concierge installation instructions. Raw session journals and local correlation identifiers are not distributed with this plugin. Static checks do not independently reproduce these live results.

## Host behavior that shaped the design

| Finding | How it was shown | Consequence for Zilot |
| --- | --- | --- |
| A nested agent (depth 2 or deeper) gets only the tools that its parent agent also has. The root's own list does not limit its direct children. | Probe: a reader declaring `[view]` read a file under a root with `[task, read_agent]`, but under a middle agent with `[task, read_agent]` it reported "view tool is missing". Adding `view` to the middle agent fixed it. | This was the real cause of the 0.2.0 scout failure. Sol omits its tool list so specialists inherit their tools through it, and delegates by charter. The front desk stays control-only. |
| `model-policy: required` with one model refuses a per-call `model` override and says so. | "Required model enforcement replaced requested model `gpt-6.1-sol` with `gpt-6-luna`." | Escalation is a separate `zilot:escalation` role pinned to Sol 6.1. |
| A model list (`[a, b]`) allows explicit override but silently falls back when the first model is missing. | `[gpt-6-luna-does-not-exist, gpt-6-luna]` ran on `gpt-6-luna` with no notice. | Every Zilot role pins exactly one model. |
| An unavailable pinned model fails hard and lists the available models. | `Model 'gpt-6-luna-does-not-exist' is not available. Available models: …` | No substitution path exists to guard against. |
| Only background agents accept `write_agent`; a continued background agent keeps its context. | A background worker told a codeword returned it after `write_agent`. | The front desk runs Sol in background and routes follow-ups to it. |
| `tools` aliases `read`/`edit`/`execute` map to `view`/`apply_patch`/`bash`, but `search` and `web` mapped to nothing; `*/*` matches no MCP tools; `server/*` works; omitting `tools` grants all. | Tool-listing probes. | Profiles name exact tools for both model families (`rg` and `grep`, `apply_patch` and `edit`). Roles that need unknown connected integrations omit their tool list. |
| `user-invocable: false` agents are still dispatchable by `task`. | Probe returned `HIDDEN-OK`. | Only the front desk appears in agent pickers. |
| `disable-model-invocation: true` removes an agent from `task` dispatch entirely. | "Unknown agent_type: probe2:noinvoke". | Internal roles stay model-invocable, so Copilot's default agent in other sessions can see them; their descriptions say they are internal to Zilot. |

## Acceptance scenarios

| # | Scenario | Result |
| --- | --- | --- |
| 1 | Vague request ("Make the basket screen better for our customers.") | **Pass.** Sol sent it to the product manager, which grounded one focused question in the repository. The front desk asked it with the native question UI, offering a recommended answer and free text. |
| 2 | Detailed request through plan approval to delegated implementation | **Pass.** Scout read the files, the plan appeared as a native "Approve this plan?" question, Node specialist edited and ran the tests (2/2). Root used only control tools; Sol used only `task` and `update_todo`. |
| 3 | Bare ticket `PROJ-4821` with no ticket connector on this machine | **Pass (missing connection reported).** Scout: "no Jira-reading integration is available in the connected tools … an access gap, not evidence that the ticket is empty." Sol marked the step blocked and asked for the ticket text. No connected Jira source exists here, so the connected path is untested. |
| 4 | Follow-up to the same objective | **Pass in CLI and app.** The front desk sent it to the existing orchestrator with `write_agent`; no new orchestrator; the change and test were added. |
| 5 | Unrelated request | **Pass.** A second orchestrator was started; the first was left alone. |
| 6 | Parallel specialists with a visible task list | **Pass.** `node-backend` and `react-frontend` started in the same second, then `reviewer`; 4/4 tests passed. Root to-do list mirrored Sol's list six times. |
| 7 | Agent and skill from a configured extra directory | **Pass.** With the directory added through native `--add-dir`, Sol dispatched `accessibility-auditor` (not a Zilot role), which loaded the extra `wcag-checklist` skill. |
| 8a | Cancellation | **Pass.** Cooperative cancel at a question ("no workers remain running"). During execution, Esc at the worker's prompts and then the "esc stop agents" control ended the running workers; Sol reported `blocked` with "no confirmation of changes or test results" instead of claiming success. The app shows a native Cancel control per background agent. |
| 8b | Worker failure | **Pass.** After workers failed (denied permissions or stopped), Sol retried once and then explicitly escalated to `zilot:escalation` on `gpt-6.1-sol`, which finished the change. |
| 8c | Unavailable model | **Pass.** With the orchestrator configured as `gpt-6.1-sol-unavailable`, the host refused it and the front desk reported the exact model with no substitution (0.19 credits). |
| 8d | Resume without duplicate execution | **Pass.** After a stop, "continue" made the worker reconcile `git status`/diff first; `average` stayed defined once and only the tests were added. After killing the CLI and `copilot --resume`, `write_agent` to the old orchestrator failed ("Agent not found"); the front desk started a new one whose first task was checking the resumed state; one assertion was added, nothing repeated. |
| 9a | Manual approval (default `ask`) | **Pass in CLI and app.** Approve / Change something / Cancel; only the explicit choice was sent back as `PLAN DECISION`. |
| 9b | Configured auto-approval | **Pass.** Project `.zilot/config.json` set `auto`; Sol reported `plan approval: auto: project .zilot/config.json`, showed the plan as a checkpoint and continued without a question. Copilot's own tool and path prompts still appeared. |
| 11 | Final build smoke test (read-only question) | **Pass after a fix.** The first run of the release candidate surfaced two defects: unquoted `: ` in new agent descriptions made Copilot drop every internal agent ("Unknown agent_type: zilot:orchestrator"), and, once fixed, Sol answered a small question with `view` and `bash` itself. Descriptions are now quoted (with a validator check and regression test), and Sol's charter explicitly overrides Copilot's "handle small lookups directly" guidance. Two fresh runs afterwards: Sol used only `task` and `update_todo`; the scout did the reads. |
| 12 | Several orchestrators at once | **Pass.** A second, unrelated request arrived while the first orchestrator was still planning; both ran concurrently. The root list kept both objectives, prefixed by name, and neither report erased the other's items. Questions named their objective, and a later follow-up for the first objective went to its orchestrator. |
| 13 | Rollover to a fresh orchestrator | **Pass, with a test-only lower threshold** (3 or 2 turns instead of 10). After the old orchestrator reported `done` and passed the threshold, the next follow-up started `<name>-2` with `ROLLOVER from <name>` and the old `handover` verbatim (original request preserved after a fix); the successor redid nothing (one change per file, tests 4/4 and 3/3). In two intermediate runs Luna started a fresh orchestrator with summarized context instead of the template; resolving a conflicting instruction fixed that in the next run. |
| 14 | Plan approval not inferred | **Pass after a fix.** One run's brief claimed approval from an ordinary change request and Sol skipped the question. The front desk now records only the user's explicit words; the next run's brief said `none`, the question appeared, and choosing Cancel ended with "no files were changed". |
| 15 | Customer agent, skill and routing table | **Pass.** A project with `.github/agents/acme-node.agent.md`, an `acme-test-style` skill and a `zilot-routing` table (`node-backend → acme-node`, skill `acme-test-style`): Sol loaded `zilot-routing` first, dispatched `acme-node` instead of `zilot:node-backend` for planning and implementation, `acme-node` loaded `acme-test-style`, and the new test was named `acme: empty array total is zero`. Zilot's reviewer checked it; 3/3 tests passed. `check-custom.mjs` reported no problems beforehand. |
| 10 | Install, discovery and invocation | **Pass with limits, below.** CLI: local marketplace add + `copilot plugin install zilot@zilot`, a direct install, and `--plugin-dir` all discovered the plugin; `copilot --agent zilot:frontdesk` started it. App: after a direct install and an app restart, Customize listed `zilot`, the agent picker listed `frontdesk`, and the full workflow ran. |

## Visibility

- **CLI (interactive):** the root's `update_todo` calls succeed but the interactive timeline does not render a root checklist; Sol's nested updates render inline under its agent card, and `/tasks` shows the agent tree. The front-desk mirror is therefore what the app shows, not what the CLI shows.
- **App:** root progress renders as "Updated todo list 2/4 done" rows and an "Updated plan" group in the main transcript; the Background chip lists the orchestrator (Working/Idle) with a Cancel button; its tab shows Sol's model, brief, children ("Zilot:scout … 13 activities") and reports. Lines without the leading `- ` are not counted ("No checklist items"); 0.3.0 requires `- [ ]` lines.

## Limits observed

- **App root model.** The app applies its session startup model after the agent is chosen, so the first app run's front desk ran on `claude-sonnet-5.5`. Choosing GPT-6 Luna in the model picker before the first message gave `gpt-6-luna` for every root turn; a mid-run model change is queued until the run ends. Sol and specialists always used their pinned models.
- **App and macOS privacy.** The app could not read folders under `~/Documents` or external volumes ("Operation not permitted"), so a marketplace pointing at the repository there showed "Catalog not loaded". Installing a copy elsewhere (or from GitHub) worked. No privacy settings were changed.
- **App and repository instructions.** In the app, Sol saw the fixture's `AGENTS.md` and asked before dispatching specialists; the CLI honored `include-custom-instructions: false`. Asking was the right response to the instruction text, which has since been clarified in the fixture.
- **Delegation is instruction-level.** Sol must carry its specialists' tools, so nothing in Copilot stops it from using them. In 14 orchestrator runs it delegated every time except once (fixed above); a scout also called `update_todo` on its own child-local list once, which does not affect the user's list.
- **Worker reuse.** Sol 6.1 dispatched specialists in `sync` mode in every run, even when told to use background mode, so follow-ups reuse the orchestrator (verified) and get fresh workers with the relevant findings; worker-level `write_agent` reuse was not observed.
- **Plugin files outside the project** trigger path prompts. 0.3.0 skills are self-contained; the scout reads `~/.config/zilot/config.json` only when the project sets no preference, which still prompts once unless allowed.
- **Not tested live:** a connected Jira or other ticket MCP source, VS Code, Windows or Linux, and installation from the GitHub marketplace (the repository is private and nothing was pushed).

## Static checks

`npm test` (23 tests: configuration precedence, launcher arguments, extra directories, profile invariants including the inheritance regression), `npm run validate` and `npm run catalog:check`. These check files, not runtime behavior.
