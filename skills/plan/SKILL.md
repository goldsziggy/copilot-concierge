---
name: plan
description: Produce a short, source-grounded plan with a structured outcome, measurable acceptance, constraints, decisions, dependencies and verification. Use for a feature, clear change request or revised scope; produce a plan and consequential questions without treating planning as implementation approval.
---

# Plan

Use this procedure as the current execution owner within the assigned scope and applicable repository instructions. Your agent profile controls identity, model, tools, reporting and delegation; loading this skill does not change them. The worker retains objective ownership and may execute directly. A sub-agent remains a leaf: never recruit agents, launch other models, assign peers or own parent tasks; return questions and evidence to the worker. Only the worker handles plan approval and native objective tasks, and user questions still go through Concierge. Planning/review scope does not authorize implementation. Preserve the original request, follow-ups, approved scope and owned files. Read the objective brief or bounded handoff. Use the supplied request, amendments, source context and actual repository to establish the outcome and implementation seams. Inspect only evidence needed to make the plan useful. This skill authorizes planning artifacts within assigned scope, not implementation or external writes.

## Build the smallest useful plan

1. State the user outcome and observable acceptance. Keep confirmed decisions, recommendations and assumptions distinct. Preserve the original request; a follow-up amends its current scope rather than erasing it. Distinguish the user's underlying intent from the proposed implementation.
2. Inspect relevant existing code, tests, dependencies and analogous behavior. Cite specific files/symbols or external source references. For UI work, inspect the current components, interaction patterns and accessibility behavior. If specialist work is needed, let the worker choose whether a separate expertise boundary is needed; a leaf requests it from the worker rather than spawning a peer. Missing access is not evidence that no system exists.
3. Draft the implementation path with true dependencies, owned files/resources, outputs and checks. Reuse existing seams. Separate independent work from shared-file/API-contract conflicts. No new service, framework or GraphQL endpoint merely to support an agent role.
4. Ask only when different answers materially change the outcome or plan. Identify the question, the decision it changes and evidence already checked; the worker reports it through Concierge, while a sub-agent returns it to the worker. Continue independent planning. A clear ticket needs no generic discovery interview.
5. Identify consequential risks and the smallest check that resolves them. Recommend a reviewer only when requested or justified by a material assumption; do not manufacture objections or a new approval chain.

## Record the outcome

Return a compact structured outcome that an execution owner can use without reconstructing the conversation. Use the fields below, with short entries for a small clear change and explicit `none` or `unknown` where appropriate. Do not invent requirements to fill a field. This is working context in the existing plan, report or handoff, not a requirement to create a separate file, service or approval stage.

```text
original intent: <original request verbatim or an accessible exact source; relevant amendments and the user problem they address>
objective: <the concrete user-visible result, not just a list of edits>
acceptance criteria: <observable pass/fail conditions; stable labels when needed to connect checks and findings>
constraints and non-goals: <included/excluded scope, compatibility or resource constraints, exact user restrictions>
decisions and inferences: <confirmed decisions and verified facts with sources; separately labeled recommendations, assumptions and unknowns>
dependencies and ownership: <real prerequisites, execution steps, owners, owned files/resources and shared-contract conflicts>
verification: <each acceptance criterion mapped to a check, expected evidence and known access or environment limitations>
consequential open questions: <only decisions that could change outcome, scope, risk or verification; evidence checked, recommendation and what can proceed>
```

Make acceptance measurable through an observable condition or a user-specified threshold. Do not invent numerical targets or silently weaken acceptance to fit an implementation. For consequential decisions and inferences, include the rationale, evidence and what would change the plan; an inference is not a user decision or authorization. Record meaningful risks with their smallest resolving check. If facts are available within scope, inspect them instead of asking the user to rediscover them.

Verification describes planned checks until they run. Distinguish expected evidence from observed results, and later report passed, failed, blocked and not-run checks honestly. A passing build alone does not establish every user outcome.

## Present and retain the plan

Start the user-facing summary with the plain-text `Plan`, `Scope`, `Steps`, `Checks` and optional `Watch-outs` sections. The approval shape below is what the worker puts in a report's `message`. Keep it short and reviewable; the richer working context does not replace that format or the existing `ask`/`auto` approval behavior. Add task details only to the extent the work needs them:

| Task | Depends on | Execution owner | Owned scope | Output and done evidence |
| --- | --- | --- | --- | --- |
| Reuse supplied task ID, or label a proposed ID | Real prerequisites | The worker, or a sub-agent with a stated reason | Files/resources or explicit unknown | Observable behavior/check |

Return evidence references, unresolved questions, risks and suggested next work. A proposed ID is not a native task ID; the worker assigns/tracks actual native tasks. A leaf planner does not update the parent checklist, approve the plan, recruit agents or dispatch implementation. The worker tracks the plan and handles approval through Concierge; the planning skill itself grants no approval.

On an amendment, explain changes to the objective, scope, dependencies, decisions and acceptance/check mapping against the previous plan. Retain unchanged criteria, settled decisions and unresolved findings rather than starting discovery again. The worker carries the current structured outcome, or an accessible reference with the relevant details, into handoffs and `progress` for resume or rollover; a leaf returns it to the worker and does not edit parent state. Preserve the original request and amendment history without copying unrelated conversation. On stop, cease work and return partial findings honestly. Never treat planning completion as implementation completion.

## Approval shape

For `needs_approval`, and for the plan shown in an `auto` checkpoint, use a compact plain-text plan with the sections `Plan`, `Scope`, `Steps`, `Checks` and optional `Watch-outs`. Put each section on its own line, separated by blank lines; use 3–5 short numbered steps where appropriate. Aim for about 120 words, but never omit material scope or risks to meet that target. Describe concrete actions and observable checks. Explicitly identify publishing, deployment, deletion or other consequential actions. Never compress the plan into a paragraph or rely on Markdown tables or cards rendering. Resolve blocking questions through `needs_input` before requesting approval. A revised plan must identify what changed, for example in `Scope`, and return as a new `needs_approval` when approval is required.

Use this shape (omit `Watch-outs` when there are no material risks):

```text
Plan: <concrete outcome>

Scope: <included files or behavior, boundaries; what changed if revised>

Steps:
1. <concrete action>
2. <concrete action>
3. <concrete action>

Checks: <observable completion checks>

Watch-outs: <material risks or consequential actions>
```
