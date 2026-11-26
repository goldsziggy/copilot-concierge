# Changelog

## 0.12.0 - 2026-11-26

- Breaking: Concierge now ships exactly two agents instead of seven. `copilot-concierge:concierge` is a thin front agent and `copilot-concierge:worker` is the single back agent that owns each objective and does the work. The `orchestrator`, `scout`, `product-manager`, `reviewer` and `escalation` profiles and the old leaf `worker` are removed; the orchestrator profile became the new `worker`. Scripts, instructions and custom charters that name a removed agent must be updated. See the migration guide.
- This layout has passed the static source-contract tests only. It has not been run live against a model in the CLI, the app or an SDK client. Live trials and measurements recorded for 0.11.1 and earlier describe the three-tier layout and do not cover it.
- Both agents are driven by skills, and Concierge ships 18 skills instead of 12. New: `brief` and `relay` for the entry agent (writing the brief and dispatching, and relaying reports), and `discovery`, `development`, `test` and `escalate` for the worker. `orchestrate` and `orchestrate-reference` are rewritten for sub-agent handoffs and routing tables. The six new names are reserved skill names.
- The entry agent answers simple questions itself: greetings, what Concierge is and how to use it, general questions that do not depend on the user's project, and progress questions from the latest report. Everything that needs a file, repository, ticket, link, command, change, plan, review or memory request goes to the worker with a brief. Its tool list now includes `skill`.
- The worker does the work itself by default. It starts a sub-agent only for independent pieces on disjoint files, an investigation whose result compresses well, independent review of a meaningful or risky change, a long context at a task boundary, or an explicit routing row, with at most three at once. Concierge ships no specialist agents: the worker uses the agent a routing row names, otherwise a general-purpose agent the host offers, otherwise itself. If no independent reviewer is available, it reviews with the `review` skill and says the review was not independent.
- Breaking: the report's `handover` block is replaced by a `progress` object, one JSON object in every report that is the worker's whole memory of the objective. The entry agent keeps the latest one and passes it back verbatim in the brief's new `progress:` line on rollover or resume; it never edits, summarises or shows it.
- Blockers are typed (`question`, `permission`, `repeated_failure`, `missing_dependency`, `ambiguity`, `stall`) and settled through the `escalate` checklist: answer from a source, retry with a hint, mock and continue, use CI, assume and flag (full autonomy only), ask, abort. Hard stops are always `ask`. At most ten assumptions per objective and two outcomes other than `ask` per blocker. Under `guided`, `ask` is reported as `needs_input`; under `full`, as `blocked`. The default stays `guided`.
- Breaking: configuration model roles are now `concierge` (default `auto`, Copilot Fusion) and `worker` (default `gpt-6.1-sol`). `models.orchestrator` is a deprecated alias for `models.worker`, like `models.frontdesk` for `models.concierge`; giving both an alias and its role is an error. `models.specialist` and `models.escalation` are retired: still accepted in old files and checked, then ignored.
- Routing tables keep working. Role keys remain valid and now describe kinds of work, not shipped agents. A row naming `copilot-concierge:worker` means the worker does that work itself with the row's skills. A row naming a retired built-in is treated the same way with the matching skill added, and `npm run check:custom` prints a migration warning. Custom agents named by a row still win. Only `concierge` and `worker` are reserved agent IDs.
- A direct answer from the entry agent has no `CONCIERGE-RESULT` line, except in a run the user said is unattended, where it ends with `CONCIERGE-RESULT: done answered`, which the documented SDK client pattern matches.
- Unchanged: plan approval and autonomy and their precedence, the `CONCIERGE-BRIEF`, `CONCIERGE-HANDOFF` and `CONCIERGE-REPORT` messages, the control messages, the result line for objectives, the learning stores and Scout helper, commits, pushes and pull requests as ordinary requests, one command per shell call, and the fast path for small work.
- Refresh the orchestration diagram and the guides for the two agents, their skills and optional sub-agents.
- Add SOPs: named, reusable workflows with ordered steps, a definition of done and a reply shape, run by the worker's new `sops` skill. Five are bundled (investigation, bug fix, feature, refactoring, opening a PR). "Run the release SOP" runs one by name, and work beyond the fast path is matched to one. The steps become the task list; a step that does not apply stays, marked `n/a` with its reason; the SOP and current step are kept in `progress`. `sops` is a reserved skill name.
- Save your own SOP through `skill-builder` as an ordinary skill named `sop-<title>`, in `.github/skills/` or `~/.copilot/skills/`. A saved SOP with a bundled title replaces it. `npm run check:custom` lists SOPs and reports one that is missing a section, has unnumbered steps or declares `allowed-tools`; `npm run validate` checks the bundled ones the same way. An SOP is a procedure, never a permission: it cannot grant tools, approve a plan, set autonomy or lift a restriction, and a matched SOP's commit, push and pull request steps run only when the user asked. New [SOPs](references/sops.md) guide. Static checks only; no SOP has been run live.
- The bundled SOPs are examples and can be switched off. Ask Concierge to stop using them and the worker sets the new `bundledSops` setting (`on` by default, or `off`) in the user or project configuration file; saved SOPs are unaffected and an example named outright still runs.
- The entry agent looks for SOPs too. It names a fitting SOP in the brief, labelled `named by user` or `suggested by Concierge`, and the worker treats a suggestion as a hint rather than the user's request. It offers once to save steps the user wants repeated, never saves or runs an SOP itself, and makes no offer in an unattended run.
- Add a constitution: eleven numbered Articles of engineering judgment. Ten are condensed from the pstack principles; Article 11, "Enough, then stop", counters over-reading and verification for its own sake. A "How to work" section puts three rules first: one system at a time, smallest change that works, and lean testing focused on business logic. The `test` and `development` skills say the same. It lives in the worker's new `constitution` skill with one short file per Article. Bundled SOPs cite Articles by number, and saved SOPs and skills can do the same. `npm run validate` checks the count and order, and that a bundled SOP cites only Articles that exist. The constitution is judgment, never permission. New [constitution](references/constitution.md) guide. Concierge now ships 20 skills.

## 0.11.1 - 2026-11-11

- Fix: Concierge's first dispatch no longer fails about one time in three. The entry agent sometimes called `task` with only `description` and `prompt`, which the host rejects, and then retried. The profile now shows the call as five ordered arguments with `agent_type` first and `prompt` last. In dispatch-only live trials on Copilot CLI 1.0.109, 18 of 18 dispatches succeeded with the fix against 12 of 18 on 0.11.0.

## 0.11.0 - 2026-11-11

- Add a fast path for small, clear work: the orchestrator does it alone, loads no skill, starts no worker and writes the task list twice.
- Write the task list and its todo mirror only when the list changes shape or with a report, not after every step.
- Run one command per shell call in every profile, with independent commands issued in the same turn. Compound lines cannot match permission rules.
- Make the always-loaded text leaner. The `orchestrate` skill is no longer preloaded; it holds the handoff template and dispatch rules and loads before the first delegation. Rare cases (customer routing tables, todo rows for rollover and cancellation, learning scopes in handoffs) moved to a new on-demand `orchestrate-reference` skill. Orchestrator profile 29.4 KB to 23.5 KB; entry profile 19.0 KB to 15.7 KB.
- Make "Decided for you" reliable under full autonomy: the report has a required `decided for the user` block, and Concierge always relays it or says "Decided for you: nothing".
- Remove external coding sessions. The owner binding, collector, return route and receipt states are gone from the profiles, templates and loop guard. The protocol never ran live; it is archived, with restore notes, in `docs/archive/external-sessions/`. Work is done by native sub-agents, and cloud automation is a Copilot SDK client.
- The reviewer is told to load only the skill its assignment needs. Live runs still show it loading both `review` and `grill-plan`.
- Live SDK trials on Copilot CLI 1.0.109 compared the same tasks against 0.10.0. A small fix used no skill and half the task-list writes. A medium four-file change with a review ran in 18 to 21 model calls against 23, with no rejected command once the shell rule reached the reviewer. One later run took 30 calls because its review found a defect that was then fixed and re-reviewed. Each configuration was run once or twice, so the savings are indicative.

## 0.10.0 - 2026-11-10

- Concierge is used as a plugin, and unattended automation is a Copilot SDK client that loads it. New [SDK automation](references/sdk-automation.md) guide: load the plugin, select the `concierge` agent, leave out `onUserInputRequest`, state autonomy and plan approval in the prompt, wait for the `CONCIERGE-RESULT` line across turns, and own the deadline. Verified with three live SDK trials.
- Plugin installs stay `guided` by default; no container or CI detection turns on `full`. `COPILOT_CONCIERGE_AUTONOMY` overrides the configuration files in either direction when the orchestrator's one-command shell read is permitted, once per objective; the user's words override all of them.
- Prefer Copilot Fusion. The Concierge entry agent now names `model: auto`, the stored ID for Copilot Fusion, so the conversation follows the session's Fusion choice and tier (CLI 1.0.104 or later; plain Auto on older CLIs). The orchestrator and specialists keep GPT-6.1 Sol and GPT-6 Luna, because Fusion does not route sub-agents: in a live trial a sub-agent set to `auto` ran on GPT-6 Luna without Fusion routing. The launcher accepts `auto` or `fusion` only for the `concierge` role.
- Three live SDK trials, on CLI 1.0.98 and on 1.0.109 with Fusion (the last with the shipped profiles), completed a small task through the plugin and ended with `CONCIERGE-RESULT: done`. Results can arrive after `sendAndWait` returns, so clients read root `assistant.message` events.
- The `CONCIERGE-RESULT` line is plain text with no formatting, quoting or list marker.
- Correct the no-progress guard so owner binding, external control/receipt changes, completion evidence and terminal results can progress without checklist changes. Native direct worker returns no longer require an unavailable owner ID.
- Copilot's `--max-ai-credits` is documented as a soft per-response limit, not a ceiling on a whole run.
- Add an `autonomy` setting: `guided` (default) or `full`. Set it with your words, the `COPILOT_CONCIERGE_AUTONOMY` environment variable or the configuration files; the optional configured-copy launcher also takes `--autonomy`. An invalid value is reported and the mode stays guided; the launcher rejects it.
- Design `full` for unattended runs. The orchestrator settles ordinary questions, records each as decided for the user, skips the plan checkpoint and phase pauses, and finishes in-scope work. It stops only for a hard stop reported as `blocked`, for `needs_approval` when plan approval is `ask`, or for a result. Concierge never asks, checks the result against the acceptance criteria once, lists what was decided, and ends with a `CONCIERGE-RESULT` line. Scope, plan approval, Git requests, file-write restrictions and Copilot's permissions are unchanged.
- Lighten the always-loaded instructions. The orchestrator's external-session protocol is now the on-demand `external-sessions` skill, and the `orchestrate` skill no longer repeats the routing-migration and learning rules that the orchestrator profile already states.
- Remember workflows as skills. "Remember how we review merge requests: …" saves the steps as an ordinary Copilot skill through the new on-demand `skill-builder` skill, in `.github/skills/` for a team workflow or `~/.copilot/skills/` for a personal one. The orchestrator loads saved skills whose description matches the work. A recommendation made in passing is followed and offered once as a suggestion; nothing is saved without the user's request or acceptance, in either autonomy mode.
- Concierge answers progress questions from the report it already holds instead of interrupting a working orchestrator, and reuses an answer you already gave instead of asking again.
- Fix: the rollover brief now carries the acceptance criteria. Remove stale wording about Ship it, the scout reading configuration, required model pins and "unreleased" learning from the guides.
- Fixes from live trials on Copilot CLI 1.0.98: settings are read with the file tool and an unreadable one never blocks; a denied tool call under `full` is retried in its plain form; skills load in proportion to the work; the owner binding is sent only when an external session needs it; the dispatch names every field the host requires; and the `CONCIERGE-RESULT` line is always the last line.
- Source-contract tests cover these changes. Six bounded non-interactive trials ran `full` autonomy, two hard stops, a saved workflow and a `guided` run; questions that need a person, plan approval `ask` and the completion check were not run live. See runtime verification.
- Guard against runaway runs. The orchestrator reports a hard stop once, never repeats a denied call and stops retrying a step that fails the same way twice. Concierge sends at most one completion check, nothing after a `blocked` report, and stops sending a bare `CONTINUE` when nothing advanced between two checkpoints.

## 0.9.0 - 2026-11-04

- Refresh the orchestration diagram to show workers and skills, conditional plan approval and proportional plan/grill review. Keep the existing Concierge logo.
- Replace the React, Node and GraphQL agent profiles with a generic implementation worker that loads the relevant domain skills. Remove the enterprise UX agent and skill. These profile removals are breaking for direct references; documented route migration preserves domain role keys, custom routes and row skills while reporting legacy substitutions.
- Give the plan skill a compact structured outcome capturing the original intent, objective, observable acceptance, constraints, decisions and inferences, dependencies, verification and consequential questions. Retain it through amendments and handovers.
- Formalize proportional grill findings with severity, evidence, resolution and disposition without adding an approval gate or repeated review loop. Preserve host permissions and existing approval preferences.
- Source-contract checks and CI cover the migration and planning guidance. Live Copilot tool inheritance, skill loading and route migration are not yet verified; no runtime improvement is claimed.

## 0.8.0 - 2026-11-03

- Make Concierge more conversational: preserve the user's exact request and derive observable acceptance criteria, while proceeding with ordinary in-scope work by default. Users can still require plan approval.
- Allow Scout to perform assigned, authorized edits, checks and requested Git actions while respecting host permissions, explicit read-only restrictions and destructive-action safeguards.
- Prefer available routes and models, and allow a suitable host-supported fallback or direct execution when available. Report substitutions; host fallback behavior, including entry-agent startup, remains unverified in live Copilot sessions.
- Update documentation and source-contract tests. PR #7 CI passed on Linux and Windows with Node 20 and 22; static checks do not prove live model behavior.

## 0.7.1 - 2026-10-30

- Make external-session collection and return routing explicit. The actor with result access collects and relays; the current Sol orchestrator accepts evidence and owns completion. Preserve native worker direct returns and the root's control-only role.
- Carry a stable objective ID, unique handoff/attempt ID, owner binding, collector, supported route/destination and actual post-launch session ID. Distinguish launch, activity, collection, relay and owner acceptance; idle never means completed.
- Preserve mappings and receipts in the existing handover, reconcile original sessions before retries, deduplicate returns, and handle wrong owners, stale attempts, rollover, cancellation and late evidence. Report unavailable return capabilities precisely without inventing callbacks or adding a service.
- Add source-contract regression and consistency coverage. Live two-objective external-session relay and recovery remain unverified; see runtime verification for the exact host limitation. Static checks do not establish live Copilot behavior or a historical transport failure.

## 0.7.0 — 2026-10-29

- Make Sol a working objective lead that investigates, plans, implements and verifies directly within approval and host permissions. Keep Concierge as the conversation and concurrent-objective layer. Load applicable repository instructions.
- Delegate for independent investigation, context reduction, coherent implementation ownership, independent verification or explicit custom routing/model requirements. Preserve configured routes and single required models.
- Reuse role-neutral procedures without changing agent identity. Keep cohesive cross-stack behavior and tests with one owner, proportional review, helper-only learning and private-data boundaries.
- Preserve plan approval, cancellation, recovery and ten-turn rollover. Capture decisive artifact, repository-state, check and uncertainty evidence in returns.
- **Breaking:** remove the Ship it specialist, its `ship-it` skill and its two-step draft PR/MR offer. Commits, pushes, branches and pull requests are ordinary requests: Sol carries them in the handoff's new `git` line and the execution owner runs them under Copilot's permissions, with no separate Concierge consent step. Concierge no longer answers that it cannot commit or push; Scout's no-commit rule now applies only to the Scout procedure. A leftover `ship-it` routing row is reported as a missing agent.
- Add helpful follow-ups. Reports carry up to three evidence-grounded `suggestions`, which Concierge relays as a numbered list and starts only when the user accepts one. Every user follow-up gets an `applied`, `deferred` or `no change` outcome, and long or multi-phase work stops for a go-ahead between phases.
- Mirror each objective's checklist into the session's `todos` and `todo_deps` tables, which Copilot's plan and todo views read, under `<objective>/<slug>` ids. The Markdown `update_todo` mirror is unchanged.
- Add on-demand, role-neutral debugging and task-evaluation skills without new agents, background trials or paid-call defaults.
- Add twelve comparative task scenarios, including a commit-on-request scenario, and unexecuted measurement templates. No performance, cost or live Copilot acceptance claim is made; see runtime verification and comparative evaluation.

## 0.6.1 — 2026-10-13

- Present approval plans as plain-text Plan, Scope, Steps, Checks and optional Watch-outs sections, with blank lines and short numbered steps. Keep material scope, risks and consequential actions visible; resolve blocking questions before approval.
- Preserve the plan in the existing `ask_user` question or immediately before it. Keep the exact Approve / Change something / Cancel choices and PLAN DECISION protocol; only Approve authorizes the displayed plan, and revisions need fresh approval. With no question tool, show the same plan and choices and wait.
- Add a copyable example and source-contract regressions for formatting, decisions, revisions and fallback. Copilot permissions and separate Ship it publication consent are unchanged.
- Include the memory, knowledge, Windows storage and customization changes developed for 0.6.0 below; 0.6.0 was not published separately. See runtime verification for source checks and host limits.

## 0.6.0 — development work included in 0.6.1

- Separate Scout learning into small private preferences outside Git worktrees and confirmed repository knowledge in `docs/concierge/knowledge.md`. Keep the existing roles and model requirements.
- Support inspecting, correcting, forgetting, disabling and resuming private memory. Save explicit user preferences or user-confirmed inferences without storing transcripts, task histories, secrets or approval settings.
- Organize knowledge into tech stacks, conventions, business rules, findings and decisions, with current repository sources and dates. Preserve user-written documentation, report changes and include relevant knowledge deliberately in commits only when committing is authorized.
- Reuse Scout and a bounded Node.js helper with separate storage scopes, path checks and revision checks. Continue with session-only context when persistence is unavailable.
- Add a bundled Windows PowerShell 5.1/.NET storage adapter for local fixed NTFS drives. It checks paths through file handles, rejects links, reparse points and aliases, and checks ownership and access by SID rather than Unix mode bits. Private memory gets a protected current-user-only DACL; repository knowledge keeps inherited or existing access. Updates are staged with the original DACL and renamed into place; an unverifiable outcome keeps recovery files and the lock. Git root checks start Git from the helper's own folder, so a repository cannot supply a lookalike `git` executable.
- Never change or bypass PowerShell execution policy, request elevation or repair ACLs. Windows client editions block the adapter under their default `Restricted` policy, so learning stays session-only there unless local scripts are already allowed.
- Add focused guides for custom agents, routing charters and skills, plus a customization quick start. They cover supported locations and Copilot's documented loading order, copyable examples, discovery, verification, troubleshooting and unsupported behavior.
- Extend `check-custom.mjs` to `.claude/agents`, `.agents/skills` and `.claude/skills`. It reports duplicate agent IDs and skill names, and rejects team agents or skills that reuse a Concierge name. Its summary lists are sorted.
- Treat 0.5.0 local project notes as read-only migration input: reverify useful facts, preserve the original file and stop maintaining duplicate note stores.
- Verification: source tests pass on Node 20 and 22, and native Windows storage tests pass on a GitHub-hosted Windows Server 2025 runner. No live Copilot session has verified the 0.6.0 learning workflow or the new customization examples on any platform. These candidate checks preceded the 0.6.1 release; they did not change the then-installed 0.5.0 plugin.

## 0.5.0 — 2026-10-11

- Rename the visible entry agent to **concierge** and the CLI invocation to `copilot-concierge:concierge`. There is no `frontdesk` agent alias; update launch commands and start a fresh session.
- Use `models.concierge` in launcher configuration while retaining `models.frontdesk` as a deprecated input alias. Reject both keys in the same file to avoid ambiguous settings.
- Add bounded Scout project notes: up to 12 sourced facts and 2 KiB in the assigned repository, checked against current evidence. Keep notes advisory, honor explicit no-write instructions, and stop note maintenance on unsafe paths or denied access.
- Add an optional, orchestrated Ship it specialist for GitHub draft PRs and GitLab draft MRs. Read-only preflight and separate confirmation of the exact publication proposal are required. No implicit commits, pushes, merges or non-draft creation. Provider access comes from existing authorized tools.
- Tighten specialist routing to discovered, explicitly pinned profiles; do not fall back to an unpinned built-in worker. Preserve the Scout note exception across delegation.
- Keep generated local project notes out of public source and release packages; check for accidentally tracked local state before release.
- Rewrite the README around installation and a first request, with an editable orchestration diagram and clearer configuration, migration and verification limits.
- Record release validation and live-trial scope in `references/runtime-verification.md`. Static instruction checks do not establish live provider draft creation or Windows/Linux model behavior.

## 0.4.0 — 2026-10-11

- Rename the maintained product to Concierge and the public repository, package, plugin and marketplace IDs to `copilot-concierge`.
- **Breaking identifiers:** start `copilot-concierge:frontdesk`, install `copilot-concierge@copilot-concierge`, use `.copilot-concierge/config.json` or `~/.config/copilot-concierge/config.json`, and rename custom routing skills to `copilot-concierge-routing` (including prefixed variants).
- Rename the internal message markers to `CONCIERGE-BRIEF`, `CONCIERGE-HANDOFF` and `CONCIERGE-REPORT`; keep the existing models and role boundaries.
- Require explicit migration from the Zilot plugin. Users remove the old installation, install Concierge and manually copy chosen settings and update custom routing. There is no silent fallback to old configuration or routing.
- Preserve the v0.3.1 tag/release and its original Zilot IDs. The public repository remains the maintained native product; the former private development repository and history remain separate.
- Pass 39 source tests, validation, catalog synchronization and offline host catalog discovery for the new metadata and namespace. Custom routing checks now reject a plugin agent under the wrong manifest namespace; full YAML parsing remains outside the preflight checker.
- Live app/model workflows have not been replayed for 0.4.0. Historical Zilot 0.3.0 runtime observations remain under their original names and do not establish live acceptance of the new identifiers.

## 0.3.1 — 2026-10-11

- Accept LF and Windows CRLF Markdown frontmatter during validation and packaging; retain required-model and tool-boundary checks. Markdown files also use explicit LF Git attributes.
- Enumerate test files in Node so `npm test` also works with Windows shells that do not expand wildcards.
- Add the Concierge Copilot logo to the README and distributable package while retaining the native `zilot` plugin and marketplace IDs.
- Release the plugin, documentation and included logo under Apache-2.0, with LICENSE and NOTICE included in packaged copies.
- Prepare a plugin-only public distribution, with no prior private Git history, local sessions or legacy benchmark outputs.
- Keep the existing default agents and model policy. Known custom-preflight limitations remain: malformed YAML and a wrong plugin namespace can escape the checker; verify custom profiles in Copilot before use.
- Live runtime evidence remains the historical macOS 0.3.0 verification. CRLF regression checks do not establish Windows Copilot runtime acceptance.

## 0.3.0 — 2026-10-11

- Fixed the 0.2.0 scout failure. Copilot gives a nested agent only the tools its parent agent also has, so the control-only orchestrator left every specialist without file access. The orchestrator now carries the full tool set for its specialists and delegates by charter; a regression test guards this.
- The front desk runs the orchestrator as a background agent, routes follow-ups to it, asks questions and plan approval with Copilot's native question tool, and mirrors the orchestrator's task list into the root to-do list.
- Added a Sol 6.1 `escalation` role for explicit escalation; every role pins one model with no fallback list.
- Customers can add their own agents and skills in the places Copilot already reads and route Zilot's roles to them with a `zilot-routing` skill table; `scripts/check-custom.mjs` checks them, and `examples/custom/` has templates. The launcher's `extraDirectories` loads extra folders with `--add-dir` or `--plugin-dir`.
- The front desk runs several orchestrators at once, recovers lost IDs with `list_agents`, and keeps every open objective in the root task list.
- Every report carries a short `handover` (request, follow-ups, decisions, done, open, sources). After 10 turns, a new request for a finished objective goes to a fresh `<name>-2` orchestrator that continues from the handover, keeping orchestrator context small without hooks or token measurement.
- The front desk records a plan-approval preference only from the user's explicit words.
- Only the front desk appears in agent pickers; internal roles are `user-invocable: false`.
- Skills are self-contained, so workers stay inside the user's project.
- Removed the experimental extension adapter and its `--native-config` launch option.
- Live acceptance in Copilot CLI 1.0.93/1.0.95 and the GitHub Copilot app 1.1.28 is recorded in `references/runtime-verification.md`, with known limits in `references/capability-matrix.md`.

## 0.2.0 — 2026-10-08 (local preview)

- Zilot replacement plugin with new internals, planning, plan grilling, source scouting, enterprise UX, React, Node, GraphQL and independent review skills; legacy repository history is retained.
- Required-model role definitions for Luna frontdesk, Sol orchestration and Luna specialists.
- Session-local configuration with explicit model IDs, per-setting provenance and task/session/project/user approval precedence.
- Dependency-free configuration tests, package checks and reproducible local packaging.
- Experimental session-local native configuration adapter; observed computer-use and extension-management tools are excluded from the frontdesk role.
- Live ordinary CLI evidence confirms required native Luna → Sol → Luna routing and Sol todo updates. Nested source access remains blocked; actual app transcript rendering does not establish a working app workflow or root objective list.

Runtime and desktop acceptance results are recorded in the compatibility reference. A valid package is not proof of the complete three-tier runtime contract.
