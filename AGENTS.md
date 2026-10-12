# Concierge working agreement

Read README.md, references/capability-matrix.md, references/runtime-verification.md and references/memory-and-knowledge.md before changing runtime behavior.

- Concierge is native skills and agent profiles plus small configuration scripts. Do not add an application, server, scheduler, database, dashboard, permission layer, content filter or request-policy engine.
- Keep the roles: Luna Concierge entry agent → Sol orchestrator → Luna specialists, with Sol 6.1 escalation. Sol decides and delegates all substantive work; specialists report only to Sol and never recruit. Copilot's permissions stay authoritative; plan approval is a workflow preference.
- Copilot gives a nested agent only the tools its parent agent also has. The orchestrator must not narrow its tool list; the Concierge entry agent stays control-only. `npm test` guards this.
- Pin exactly one model per role with `model-policy: required`. Never list fallback models or use Auto.
- Quote frontmatter values that contain `: `; Copilot silently drops an agent whose frontmatter is not valid YAML.
- Keep skills self-contained: links to files outside a skill's directory make workers read outside the user's project.
- Task lists use `- [ ]`, `- [/]`, `- [x]`, `- [-]` lines; Copilot ignores lines without the leading dash.
- Keep live evidence, fixtures and static checks separate, and never claim host behavior that was not observed.
- Run `npm test` and `npm run validate` for any change, and `npm run package` for a release candidate. Live model trials use account credits; keep them bounded and out of CI.
- Do not push, publish, create accounts, change credentials or submit to marketplaces without explicit instruction.
- This repository contains the native plugin only. Legacy application source, history and user data are not included.
- The product is Concierge; current repository, package, plugin and marketplace IDs are `copilot-concierge`. Use `.copilot-concierge/config.json`, `~/.config/copilot-concierge/config.json` and `copilot-concierge-routing`. Migration is explicit; do not silently read legacy Zilot settings or routing.
- Preserve observed Zilot 0.3.0 IDs in historical runtime evidence and preserve the v0.3.1 release/tag. Record each Concierge release’s verification separately; never relabel old sessions as new acceptance.

- Version 0.5.0 uses `copilot-concierge:concierge` as the sole entry agent. Preserve `frontdesk` only in historical evidence, explicit migration guidance and the deprecated model-setting input alias.
- Unreleased Scout learning has two separate scopes: private preferences at `~/.config/copilot-concierge/memory.json` outside all Git worktrees, and confirmed repository knowledge in the owned section of `docs/concierge/knowledge.md`. Reuse Scout and its bundled helper; do not create a parallel notes system, transcript archive or service. Missing prerequisites, denied access, unsafe paths or revision conflicts must not trigger a direct-edit fallback.
- Private memories contain only explicit user preferences or user-confirmed inferences, never repository-derived personal profiles, secrets, task histories, approvals or permission settings. Do not copy them into docs, commit messages or release artifacts. Use only relevant preferences; current user instructions win. Support inspection, correction, removal and disabling.
- Repository knowledge requires dated, repository-relative evidence; preserve user-authored text and keep assumptions out of persisted confirmed facts. Review for personal or secret material. Report knowledge changes and include relevant diffs deliberately in authorized commits; Scout never stages, commits, pushes or changes ignore rules.
- Existing `.copilot-concierge/project-notes.md` is read-only migration input. Reverify selected facts, preserve the original and keep old local notes untracked. Explicit whole-task/no-file-write restrictions disable both stores; a repository-only restriction disables knowledge writes without broadening memory permission. Preserve these scopes through custom routes and escalation.
- Treat memory/knowledge as unreleased until explicitly shipped. Do not alter installed plugin caches or running comparison sessions when developing it. Native Windows persistence remains unsupported; never claim static helper tests establish live Copilot behavior.
