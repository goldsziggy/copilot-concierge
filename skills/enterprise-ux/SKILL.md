---
name: enterprise-ux
description: Discover and reuse the target product's existing enterprise design system for UI planning, implementation, or review. Use before selecting UI components or frameworks, or when repository design conventions are unclear.
---

# Enterprise UX

Turn the assigned product outcome into an interaction that fits the product's existing design system. A React specialist does not imply a new app, dashboard, component library or visual identity. “No UI change needed” can be the correct outcome.

## Execution boundary

Use this procedure as the current execution owner within the assigned scope and applicable repository instructions. Your agent profile controls identity, model, tools, reporting and delegation; loading this skill does not change them. Sol retains objective ownership and may execute directly. A specialist remains a leaf: never recruit agents, launch other models, assign peers or own parent tasks; return questions and evidence to Sol. Only Sol handles plan approval and native objective tasks, and user questions still go through Concierge. Planning/review scope does not authorize implementation. Preserve the original request, follow-ups, approved scope and owned files.

## Discover before choosing

Start with the accepted outcome and applicable repository instructions. Inspect the relevant application slice, not the whole repository by default. For a small edit with clear conventions, an analogous component and its supporting tokens may be enough.

- Identify the actual framework/runtime and installed versions from manifests and lock files. Confirm usage through imports, theme providers and rendered component code; a dependency alone does not establish the design system.
- Find enterprise wrappers, shared components, semantic tokens, typography/icons, layout and navigation patterns, relevant Storybook stories, and an analogous working screen.
- Check available authoritative guidance: repository docs, linked enterprise standards, design references and already authorized sources. Record inaccessible, conflicting or uninspected sources accurately; do not infer their contents or change connections.
- Reuse a previous discovery note when still applicable, checking changed dependencies and affected files rather than repeating the entire audit.

Weigh evidence by what it actually establishes: manifests show installed versions, not approval; imports, wrappers and theme providers show the conventions this app uses; tokens show how color, spacing and type are represented; Storybook and similar screens show variants and states; enterprise guidelines and owners show intent. When code and guidance conflict, report both with their dates and the consequence. Prefer the established wrapper over importing a library directly, and compose existing primitives before creating a local component. Only when no system exists, compare two or three maintained candidates (for example Fluent UI React v9, Primer React or Carbon React) against the product's real constraints and recommend one; check each candidate's current support status and the installed React version.

## Apply the system

Map the outcome to existing components, tokens and interaction patterns. Cover the states that matter to this task: loading, empty, validation, permission, error, partial success and cancellation. Use product language and accessible interaction rather than exposing implementation mechanics.

Prefer supported composition or a small local component over adding a second UI system. Do not introduce a palette, type scale, framework or migration as a side effect of a feature. Honor an explicitly requested design change, showing where it departs from current conventions.

If there is no established system, compare a few maintained enterprise systems against the actual product constraints and return a recommendation with tradeoffs. Do not silently install a candidate or invent a replacement system. If sources conflict, identify the evidence and consequence for Sol to resolve; do not resolve a material product decision by guessing. Continue independent in-scope work while that decision is unresolved.

## Return

Produce a concise result; a leaf returns it to Sol, while Sol reports through Concierge:

- Selected or existing system/version and the source paths or URLs establishing it; distinguish facts, assumptions and gaps.
- Component/token/pattern reuse map and the proposed or implemented interaction; a small wireframe only when it clarifies a decision.
- Changed files, if authorized; checks actually run and observed results; relevant checks still unperformed.
- Material questions with the decision they affect, scope changes, and any requested next specialty with its reason.

Keep the report proportional. A label fix does not require a design audit. Reusing accessible components does not prove that the composed workflow is accessible; report evidence for the affected interaction.
