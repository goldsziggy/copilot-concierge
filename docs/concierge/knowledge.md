<!-- concierge-knowledge:start -->
<!-- concierge-state: {"schema":1,"migration":null,"records":[{"id":"native-copilot-plugin","category":"Tech stack","status":"confirmed","summary":"Concierge is a native Copilot plugin composed of Markdown skills and agent profiles with dependency-free Node.js scripts; source scripts require Node.js 20 or later.","sources":[{"path":"plugin.json","locator":"name and manifest fields","checked_on":"2026-10-12"},{"path":"package.json","locator":"engines and scripts","checked_on":"2026-10-12"}]},{"id":"required-role-models","category":"Business rules","status":"confirmed","summary":"Each role pins one required model. Concierge defaults to Luna and delegates substantive work through the Sol orchestrator; unpinned built-in workers and silent model substitution are not allowed.","sources":[{"path":"AGENTS.md","locator":"role and model rules","checked_on":"2026-10-12"},{"path":"com.github.copilot/agents/orchestrator.agent.md","locator":"Specialists and Dispatch","checked_on":"2026-10-12"}]},{"id":"source-checks-not-live-evidence","category":"Conventions","status":"confirmed","summary":"Run npm test and npm run validate for changes, and package release candidates. Keep static checks separate from observed live host behavior.","sources":[{"path":"AGENTS.md","locator":"verification rules","checked_on":"2026-10-12"},{"path":"references/runtime-verification.md","locator":"evidence boundaries","checked_on":"2026-10-12"}]},{"id":"nested-tool-inheritance","category":"Findings","status":"confirmed","summary":"Historical Copilot CLI trials found nested specialists receive only tools available to their parent. The orchestrator therefore omits its tool list while its charter limits it to coordination.","sources":[{"path":"references/runtime-verification.md","locator":"Host behavior that shaped the design","checked_on":"2026-10-12"},{"path":"tests/profiles.test.mjs","locator":"orchestrator passes specialist tools through","checked_on":"2026-10-12"}]},{"id":"separate-memory-and-knowledge","category":"Decisions","status":"confirmed","summary":"Personalization preferences belong outside Git; verified repository facts and code decisions belong in reviewed repository docs. Scout owns both workflows and retires legacy notes as read-only migration input.","decision_evidence":"Project decision: keep user personalization private while sharing verified repository knowledge with the code.","sources":[{"path":"skills/scout/SKILL.md","locator":"Memory and knowledge","checked_on":"2026-10-12"},{"path":"references/memory-and-knowledge.md","locator":"Memory and repository knowledge","checked_on":"2026-10-12"},{"path":"skills/scout/scripts/learning.mjs","locator":"createLearning store separation","checked_on":"2026-10-12"}]}]} -->

# Concierge repository knowledge

Confirmed repository facts; source files and current instructions take precedence.

## Tech stack

- **native-copilot-plugin**: Concierge is a native Copilot plugin composed of Markdown skills and agent profiles with dependency-free Node.js scripts; source scripts require Node.js 20 or later.
  - Source: `plugin.json` — name and manifest fields (checked 2026-10-12)
  - Source: `package.json` — engines and scripts (checked 2026-10-12)

## Conventions

- **source-checks-not-live-evidence**: Run npm test and npm run validate for changes, and package release candidates. Keep static checks separate from observed live host behavior.
  - Source: `AGENTS.md` — verification rules (checked 2026-10-12)
  - Source: `references/runtime-verification.md` — evidence boundaries (checked 2026-10-12)

## Business rules

- **required-role-models**: Each role pins one required model. Concierge defaults to Luna and delegates substantive work through the Sol orchestrator; unpinned built-in workers and silent model substitution are not allowed.
  - Source: `AGENTS.md` — role and model rules (checked 2026-10-12)
  - Source: `com.github.copilot/agents/orchestrator.agent.md` — Specialists and Dispatch (checked 2026-10-12)

## Findings

- **nested-tool-inheritance**: Historical Copilot CLI trials found nested specialists receive only tools available to their parent. The orchestrator therefore omits its tool list while its charter limits it to coordination.
  - Source: `references/runtime-verification.md` — Host behavior that shaped the design (checked 2026-10-12)
  - Source: `tests/profiles.test.mjs` — orchestrator passes specialist tools through (checked 2026-10-12)

## Decisions

- **separate-memory-and-knowledge**: Personalization preferences belong outside Git; verified repository facts and code decisions belong in reviewed repository docs. Scout owns both workflows and retires legacy notes as read-only migration input.
  - Source: `skills/scout/SKILL.md` — Memory and knowledge (checked 2026-10-12)
  - Source: `references/memory-and-knowledge.md` — Memory and repository knowledge (checked 2026-10-12)
  - Source: `skills/scout/scripts/learning.mjs` — createLearning store separation (checked 2026-10-12)
  - User decision: Project decision: keep user personalization private while sharing verified repository knowledge with the code.

<!-- concierge-knowledge:end -->
