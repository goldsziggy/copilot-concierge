# Changelog

## 0.6.0 — unreleased candidate

- Separate Scout learning into small private preferences outside Git worktrees and confirmed repository knowledge in `docs/concierge/knowledge.md`. Keep the existing roles and model requirements.
- Support inspecting, correcting, forgetting, disabling and resuming private memory. Save explicit user preferences or user-confirmed inferences without storing transcripts, task histories, secrets or approval settings.
- Organize knowledge into tech stacks, conventions, business rules, findings and decisions, with current repository sources and dates. Preserve user-written documentation, report changes and include relevant knowledge deliberately in commits only when committing is authorized.
- Reuse Scout and a bounded Node.js helper with separate storage scopes, path checks and revision checks. Continue with session-only context when persistence is unavailable.
- Add a bundled Windows PowerShell 5.1/.NET storage adapter for local fixed NTFS drives. It checks paths through file handles, rejects links, reparse points and aliases, and checks ownership and access by SID rather than Unix mode bits. Private memory gets a protected current-user-only DACL; repository knowledge keeps inherited or existing access. Updates are staged with the original descriptor and renamed into place; an unverifiable outcome keeps recovery files and the lock.
- Never change or bypass PowerShell execution policy, request elevation or repair ACLs. Windows client editions block the adapter under their default `Restricted` policy, so learning stays session-only there unless local scripts are already allowed.
- Add focused guides for custom agents, routing charters and skills, plus a customization quick start. They cover supported locations and Copilot's documented loading order, copyable examples, discovery, verification, troubleshooting and unsupported behavior.
- Extend `check-custom.mjs` to `.claude/agents`, `.agents/skills` and `.claude/skills`. It reports duplicate agent IDs and skill names, rejects team skills that reuse a Concierge skill name and warns about agent IDs that reuse a Concierge agent name.
- Treat 0.5.0 local project notes as read-only migration input: reverify useful facts, preserve the original file and stop maintaining duplicate note stores.
- Verification: source tests pass on Node 20 and 22, and native Windows storage tests pass on a GitHub-hosted Windows Server 2025 runner. No live Copilot session has verified the 0.6.0 learning workflow or the new customization examples on any platform. This work is separate from the published 0.5.0 installation.

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
