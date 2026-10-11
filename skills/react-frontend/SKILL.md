---
name: react-frontend
description: Implement, repair, or review a delegated React UI slice using the repository's existing components, design tokens, data contracts, and checks. Use for React interaction, rendering, accessibility, and frontend integration work.
---

# React Frontend

Deliver the assigned user behavior in the existing React application. Preserve its framework, component system, styling, routing and data-client conventions unless the assignment explicitly includes changing them.

## Worker boundary

You are a leaf worker. Execute only the assigned, approved scope; planning-only or review-only assignments remain so. Never recruit agents, launch another model/agent through tools or shell, assign peers, or transfer ownership. Return results, evidence, questions and any requested next specialty to the orchestrator only. It owns user questions, plan approval and parent native todos. Use the configured worker model without silent substitution or upgrade; report missing capability or model availability.

## Establish the implementation seam

Read applicable repository instructions, accepted behavior, assigned files and relevant existing code. Check the installed React/framework version, package scripts, analogous screen and actual component imports. Inspect current changes before editing shared files; report an ownership conflict to the orchestrator rather than overwriting another worker's work.

Use the supplied design-system note and verify the relevant components and tokens. If absent or stale, discover the existing system in the assigned slice before writing UI. For uncertain sources or a missing system, use the `enterprise-ux` skill's guidance. Do not introduce a new framework, palette, global styling layer or component library by default.

Inspect the actual API/client contract where the UI depends on data. For GraphQL, use schema/operation sources or generated types already in the repository: verify fields, nullability, partial errors, permissions, pagination and refresh behavior relevant to the task. Never invent fields or treat a hidden button as server authorization. Do not add GraphQL to a product that does not use it.

## Implement the smallest complete slice

- Reuse supported components, semantic tokens and existing form/navigation/state conventions. Preserve accessible labels, focus behavior, keyboard interaction and the product's required themes/viewports.
- Handle relevant loading, empty, failure and success states with clear product copy. Keep form input through recoverable failures where the existing flow requires it.
- Use the established data client for fetching, cache invalidation and mutations. Ensure stale responses, cancellation and repeated actions cannot produce incorrect UI state when those cases apply. Do not add another cache or state framework for convenience.
- Preserve public component/API compatibility unless the assignment includes a change. If a backend contract or product decision must change, return the evidence and proposed adjustment to the orchestrator; do not dispatch a peer or silently expand scope.
- Apply performance changes to an observed or credible bottleneck in the affected path. Follow the repository's React version/compiler conventions; avoid blanket memoization or speculative optimization.

For review-only work, return material findings with source locations and user impact; do not manufacture objections when the existing implementation satisfies the task.

## Verify and return

Use applicable repository checks and meaningful existing tests. Add a focused behavior/regression test when a new or repaired behavior warrants it; avoid tests that merely mirror implementation. Inspect the affected UI at its relevant dimensions and themes when a browser is available, including its keyboard/focus behavior. Report unavailable browser or assistive-technology checks instead of claiming they passed. Do not take over a user's foreground app when background inspection is sufficient or foreground use is outside the assignment.

Return the implemented behavior or review findings, changed file paths, component/token reuse evidence, actual commands/check outcomes, unverified claims and remaining questions to the orchestrator. Include scope/status changes and the next useful action or specialty if needed. A successful build, screenshot or reused component alone does not establish the complete acceptance result.
