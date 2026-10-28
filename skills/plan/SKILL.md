---
name: plan
description: Produce a short, source-grounded implementation plan with scope, dependencies, ownership and observable completion checks. Use for a feature, clear change request or revised scope; produce a plan and material questions without treating planning as implementation approval.
---

# Plan

Use this procedure as the current execution owner within the assigned scope and applicable repository instructions. Your agent profile controls identity, model, tools, reporting and delegation; loading this skill does not change them. Sol retains objective ownership and may execute directly. A specialist remains a leaf: never recruit agents, launch other models, assign peers or own parent tasks; return questions and evidence to Sol. Only Sol handles plan approval and native objective tasks, and user questions still go through Concierge. Planning/review scope does not authorize implementation. Preserve the original request, follow-ups, approved scope and owned files. Read the objective brief or bounded handoff. Use the supplied request, amendments, source context and actual repository to establish the outcome and implementation seams. Inspect only evidence needed to make the plan useful. This skill authorizes planning artifacts within assigned scope, not implementation or external writes.

## Build the smallest useful plan

1. State the user outcome and observable acceptance. Keep confirmed decisions, recommendations and assumptions distinct. Preserve the original request; a follow-up amends its current scope rather than erasing it.
2. Inspect relevant existing code, tests, dependencies and analogous behavior. Cite specific files/symbols or external source references. For UI work, identify the existing enterprise design system and use the available `enterprise-ux` guidance; if specialist work is needed, let Sol choose whether a separate expertise boundary is needed; a leaf requests it from Sol rather than spawning a peer. Missing access is not evidence that no system exists.
3. Draft the implementation path with true dependencies, owned files/resources, outputs and checks. Reuse existing seams. Separate independent work from shared-file/API-contract conflicts. No new service, framework or GraphQL endpoint merely to support an agent role.
4. Ask only when different answers materially change the outcome or plan. Identify the question, the decision it changes and evidence already checked; Sol reports it through Concierge, while a specialist returns it to Sol. Continue independent planning. A clear ticket needs no generic discovery interview.
5. Identify consequential risks and the smallest check that resolves them. Recommend a reviewer only when requested or justified by a material assumption; do not manufacture objections or a new approval chain.

## Produce the plan

Start with a short reviewable plan in plain language: desired result, included scope, key steps, important assumption if any, and how completion will be verified. Add task details only to the extent the work needs them:

| Task | Depends on | Execution owner | Owned scope | Output and done evidence |
| --- | --- | --- | --- | --- |
| Reuse supplied task ID, or label a proposed ID | Real prerequisites | Sol or relevant specialty | Files/resources or explicit unknown | Observable behavior/check |

Return evidence references, unresolved questions, risks and suggested next work. A proposed ID is not a native task ID; Sol assigns/tracks actual native tasks. A leaf planner does not update the parent checklist, approve the plan, recruit workers or dispatch implementation. Sol tracks the plan and handles approval through Concierge; the planning skill itself grants no approval.

On an amendment, explain the scope/dependency/check changes against the previous plan. On stop, cease work and return partial findings honestly. Never treat planning completion as implementation completion.
