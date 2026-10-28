<!-- concierge-knowledge:start -->
<!-- concierge-state: {"schema":1,"migration":null,"records":[{"id":"native-copilot-plugin","category":"Tech stack","status":"confirmed","summary":"Concierge is a native Copilot plugin composed of Markdown skills and agent profiles with dependency-free Node.js scripts; source scripts require Node.js 20 or later.","sources":[{"path":"plugin.json","locator":"name and manifest fields","checked_on":"2026-10-12"},{"path":"package.json","locator":"engines and scripts","checked_on":"2026-10-12"}]},{"id":"source-checks-not-live-evidence","category":"Conventions","status":"confirmed","summary":"Run npm test and npm run validate for changes, and package release candidates. Keep static checks separate from observed live host behavior.","sources":[{"path":"AGENTS.md","locator":"verification rules","checked_on":"2026-10-12"},{"path":"references/runtime-verification.md","locator":"evidence boundaries","checked_on":"2026-10-12"}]},{"id":"windows-learning-adapter","category":"Tech stack","status":"confirmed","summary":"On Windows, Scout learning storage uses a bundled Windows PowerShell 5.1/.NET adapter limited to local fixed NTFS drives. It checks ownership and access by SID instead of Unix mode bits and never bypasses execution policy, so default Windows client policy leaves learning session-only.","sources":[{"path":"skills/scout/scripts/learning-windows.mjs","locator":"invokeWindows and createWindowsStorage","checked_on":"2026-10-12"},{"path":"skills/scout/scripts/learning-windows.ps1","locator":"ConciergeLearning.Store","checked_on":"2026-10-12"},{"path":"references/install.md","locator":"Windows execution policy","checked_on":"2026-10-12"}]},{"id":"custom-names-stay-distinct","category":"Conventions","status":"confirmed","summary":"Customer agents and skills use names distinct from Concierge's. Copilot keeps one agent per ID and one skill per name, loading project and personal files before plugins, so check-custom.mjs rejects reused Concierge agent and skill names.","sources":[{"path":"scripts/check-custom.mjs","locator":"CONCIERGE_SKILLS and CONCIERGE_AGENTS checks","checked_on":"2026-10-12"},{"path":"references/custom-skills.md","locator":"Where to put a skill","checked_on":"2026-10-12"},{"path":"tests/check-custom.test.mjs","locator":"custom files cannot silently take over Concierge skill or agent names","checked_on":"2026-10-12"}]},{"id":"windows-rename-preserves-access","category":"Findings","status":"confirmed","summary":"Native Windows CI showed ReplaceFile turns a repository file's inherited access rules into explicit copies. The adapter instead stages a file carrying the verified DACL (plus owner and group for private memory) and renames it over the destination in the same folder.","sources":[{"path":"references/runtime-verification.md","locator":"Native Windows CI, 2026-10-12","checked_on":"2026-10-12"},{"path":"skills/scout/scripts/learning-windows.ps1","locator":"Store.Write publish step","checked_on":"2026-10-12"},{"path":"tests/learning-windows.test.mjs","locator":"inherits ordinary access and survives a checkout-style rewrite","checked_on":"2026-10-12"}]},{"id":"required-role-models","category":"Business rules","status":"confirmed","summary":"Each role pins one required model. Concierge delegates objectives to Sol, which may execute directly within scope or selectively delegate to verified pinned workers. Explicit custom routes remain authoritative; unpinned substitutes are forbidden.","sources":[{"path":"AGENTS.md","locator":"role and model rules","checked_on":"2026-10-28"},{"path":"com.github.copilot/agents/orchestrator.agent.md","locator":"Specialists and Dispatch","checked_on":"2026-10-28"}]},{"id":"nested-tool-inheritance","category":"Findings","status":"confirmed","summary":"Historical Copilot CLI trials found nested specialists receive only tools available to their parent. The orchestrator therefore omits its tool list. The 0.7.0 charter permits direct execution within scope; that new model behavior has not been verified live.","sources":[{"path":"references/runtime-verification.md","locator":"Host behavior that shaped the design","checked_on":"2026-10-28"},{"path":"tests/profiles.test.mjs","locator":"orchestrator passes specialist tools through","checked_on":"2026-10-28"},{"path":"com.github.copilot/agents/orchestrator.agent.md","locator":"working objective lead and tool inheritance","checked_on":"2026-10-28"}]},{"id":"separate-memory-and-knowledge","category":"Decisions","status":"confirmed","summary":"Personalization preferences belong outside Git; verified repository facts and decisions belong in reviewed repository docs. Sol using Scout guidance or Scout workers use the same bounded helper and scoped learning contract; legacy notes remain read-only migration input.","decision_evidence":"Project decision: keep user personalization private while sharing verified repository knowledge with the code.","sources":[{"path":"skills/scout/SKILL.md","locator":"Memory and knowledge","checked_on":"2026-10-28"},{"path":"references/memory-and-knowledge.md","locator":"Memory and repository knowledge","checked_on":"2026-10-28"},{"path":"skills/scout/scripts/learning.mjs","locator":"createLearning store separation","checked_on":"2026-10-28"}]}]} -->

# Concierge repository knowledge

Confirmed repository facts; source files and current instructions take precedence.

## Tech stack

- **native-copilot-plugin**: Concierge is a native Copilot plugin composed of Markdown skills and agent profiles with dependency-free Node.js scripts; source scripts require Node.js 20 or later.
  - Source: `plugin.json` — name and manifest fields (checked 2026-10-12)
  - Source: `package.json` — engines and scripts (checked 2026-10-12)
- **windows-learning-adapter**: On Windows, Scout learning storage uses a bundled Windows PowerShell 5.1/.NET adapter limited to local fixed NTFS drives. It checks ownership and access by SID instead of Unix mode bits and never bypasses execution policy, so default Windows client policy leaves learning session-only.
  - Source: `skills/scout/scripts/learning-windows.mjs` — invokeWindows and createWindowsStorage (checked 2026-10-12)
  - Source: `skills/scout/scripts/learning-windows.ps1` — ConciergeLearning.Store (checked 2026-10-12)
  - Source: `references/install.md` — Windows execution policy (checked 2026-10-12)

## Conventions

- **source-checks-not-live-evidence**: Run npm test and npm run validate for changes, and package release candidates. Keep static checks separate from observed live host behavior.
  - Source: `AGENTS.md` — verification rules (checked 2026-10-12)
  - Source: `references/runtime-verification.md` — evidence boundaries (checked 2026-10-12)
- **custom-names-stay-distinct**: Customer agents and skills use names distinct from Concierge's. Copilot keeps one agent per ID and one skill per name, loading project and personal files before plugins, so check-custom.mjs rejects reused Concierge agent and skill names.
  - Source: `scripts/check-custom.mjs` — CONCIERGE\_SKILLS and CONCIERGE\_AGENTS checks (checked 2026-10-12)
  - Source: `references/custom-skills.md` — Where to put a skill (checked 2026-10-12)
  - Source: `tests/check-custom.test.mjs` — custom files cannot silently take over Concierge skill or agent names (checked 2026-10-12)

## Business rules

- **required-role-models**: Each role pins one required model. Concierge delegates objectives to Sol, which may execute directly within scope or selectively delegate to verified pinned workers. Explicit custom routes remain authoritative; unpinned substitutes are forbidden.
  - Source: `AGENTS.md` — role and model rules (checked 2026-10-28)
  - Source: `com.github.copilot/agents/orchestrator.agent.md` — Specialists and Dispatch (checked 2026-10-28)

## Findings

- **windows-rename-preserves-access**: Native Windows CI showed ReplaceFile turns a repository file's inherited access rules into explicit copies. The adapter instead stages a file carrying the verified DACL (plus owner and group for private memory) and renames it over the destination in the same folder.
  - Source: `references/runtime-verification.md` — Native Windows CI, 2026-10-12 (checked 2026-10-12)
  - Source: `skills/scout/scripts/learning-windows.ps1` — Store.Write publish step (checked 2026-10-12)
  - Source: `tests/learning-windows.test.mjs` — inherits ordinary access and survives a checkout-style rewrite (checked 2026-10-12)
- **nested-tool-inheritance**: Historical Copilot CLI trials found nested specialists receive only tools available to their parent. The orchestrator therefore omits its tool list. The 0.7.0 charter permits direct execution within scope; that new model behavior has not been verified live.
  - Source: `references/runtime-verification.md` — Host behavior that shaped the design (checked 2026-10-28)
  - Source: `tests/profiles.test.mjs` — orchestrator passes specialist tools through (checked 2026-10-28)
  - Source: `com.github.copilot/agents/orchestrator.agent.md` — working objective lead and tool inheritance (checked 2026-10-28)

## Decisions

- **separate-memory-and-knowledge**: Personalization preferences belong outside Git; verified repository facts and decisions belong in reviewed repository docs. Sol using Scout guidance or Scout workers use the same bounded helper and scoped learning contract; legacy notes remain read-only migration input.
  - Source: `skills/scout/SKILL.md` — Memory and knowledge (checked 2026-10-28)
  - Source: `references/memory-and-knowledge.md` — Memory and repository knowledge (checked 2026-10-28)
  - Source: `skills/scout/scripts/learning.mjs` — createLearning store separation (checked 2026-10-28)
  - User decision: Project decision: keep user personalization private while sharing verified repository knowledge with the code.

<!-- concierge-knowledge:end -->
