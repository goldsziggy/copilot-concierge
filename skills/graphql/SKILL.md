---
name: graphql
description: "Implement, plan or review GraphQL schema, operation and resolver changes, including client compatibility, authorization and data loading. Use when repository evidence connects the requested behavior to GraphQL, even when the user describes only a business outcome."
---

# GraphQL contracts

Use this procedure as the current execution owner within the assigned scope and applicable repository instructions. Your agent profile controls identity, model, tools, reporting and delegation; loading this skill does not change them. Sol retains objective ownership and may execute directly. A specialist remains a leaf: never recruit agents, launch other models, assign peers or own parent tasks; return questions and evidence to Sol. Only Sol handles plan approval and native objective tasks, and user questions still go through Concierge. Planning/review scope does not authorize implementation. Preserve the original request, follow-ups, approved scope and owned files.

## Establish the contract

Find the authoritative schema, generation path, operations/fragments, resolver and business-service ownership, deployed consumers, and relevant checks. Read an analogous implementation and the actual dependency versions. Follow the existing code-first or schema-first approach, client library, error conventions and code generation. Do not add a GraphQL service or replace a framework merely because this skill is active.

Identify the behavioral change and affected clients before editing. For planning/review assignments, return the analysis without implementing. Distinguish missing evidence from product decisions; ask through Concierge when the answer changes the work; a leaf returns the question to Sol.

## Make the assigned change

- Compare schema contracts and validate affected operations. Account for input/output nullability, list/item nullability, enum/union evolution, defaults, pagination and deprecation. Schema diff alone does not establish compatibility with deployed consumers.
- Trace object, field and tenant authorization through the existing business layer. A hidden UI control or unrequested field is not an authorization boundary. Preserve error behavior without exposing protected data.
- Inspect resolver data access for the changed query shape. Use existing batching/caching; keep loader caches scoped to the request and authorization context. Measure query counts where nested access creates a plausible N+1 risk.
- Keep generated types, operations and resolver behavior consistent. Identify React/Node dependencies with the required interface and evidence. Sol keeps coupled changes with one owner or chooses a justified boundary; a leaf reports dependencies to Sol and does not dispatch workers.

Choose checks for the boundary that changed; apply only what the change warrants and use the repository's existing tooling:

- **Schema or input contract:** compare against the baseline with the project's schema tooling and validate known operations. Watch required inputs, removed fields, defaults, scalar serialization and new enum or union values that exhaustive clients may not handle.
- **Null and error behavior:** distinguish a nullable list from nullable items and exercise the real failure path; a non-null failure can null out its parent.
- **Authorization:** exercise allowed and denied callers and tenant or object boundaries through the real business service. Never weaken access to make a fixture pass.
- **Nested data loading:** measure backend calls for a representative operation, and check batch ordering, missing keys and per-request cache isolation.
- **Pagination and mutations:** check stable ordering and cursors, success and error contracts, and repeat behavior where retries are possible.
- **Generated types:** run the existing generator and inspect its diff; generated types alone do not prove runtime behavior.

## Verify and return

Exercise relevant operations with real schema execution and appropriate fixtures, including the changed success/failure behavior. Check generated artifacts through their source/generator rather than hand-editing outputs. Reuse current trustworthy check evidence; rerun affected checks after changes.

Return the result or artifact, changed files, schema/operation implications, affected consumers, commands and observed outcomes, unverified behavior, and any questions or requested specialties. Report status using the active profile's contract, or the handoff for a specialist. On material scope change, missing approval/access, cancellation or unsafe uncertainty about an external effect, stop the dependent action and report the smallest next decision. Do not broaden permission, silently change models or replay an uncertain mutation.
