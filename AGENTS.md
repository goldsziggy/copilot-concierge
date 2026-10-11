# Zilot working agreement

Read README.md, references/capability-matrix.md and references/runtime-verification.md before changing runtime behavior.

- Zilot is native skills and agent profiles plus small configuration scripts. Do not add an application, server, scheduler, database, dashboard, permission layer, content filter or request-policy engine.
- Keep the roles: Luna front desk → Sol orchestrator → Luna specialists, with Sol 6.1 escalation. Sol decides and delegates all substantive work; specialists report only to Sol and never recruit. Copilot's permissions stay authoritative; plan approval is a workflow preference.
- Copilot gives a nested agent only the tools its parent agent also has. The orchestrator must not narrow its tool list; the front desk stays control-only. `npm test` guards this.
- Pin exactly one model per role with `model-policy: required`. Never list fallback models or use Auto.
- Quote frontmatter values that contain `: `; Copilot silently drops an agent whose frontmatter is not valid YAML.
- Keep skills self-contained: links to files outside a skill's directory make workers read outside the user's project.
- Task lists use `- [ ]`, `- [/]`, `- [x]`, `- [-]` lines; Copilot ignores lines without the leading dash.
- Keep live evidence, fixtures and static checks separate, and never claim host behavior that was not observed.
- Run `npm test` and `npm run validate` for any change, and `npm run package` for a release candidate. Live model trials use account credits; keep them bounded and out of CI.
- Do not push, publish, create accounts, change credentials or submit to marketplaces without explicit instruction.
- This repository contains the native plugin only. Legacy application source, history and user data are not included.
