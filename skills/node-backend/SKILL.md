---
name: node-backend
description: "Implement, plan or review Node.js service and runtime behavior, including I/O, cancellation, errors, authorization and focused tests. Use for backend work in an existing Node.js repository or a specifically assigned native adapter."
---

# Node.js backend

Use this procedure as the current execution owner within the assigned scope and applicable repository instructions. Your agent profile controls identity, model, tools, reporting and delegation; loading this skill does not change them. Sol retains objective ownership and may execute directly. A specialist remains a leaf: never recruit agents, launch other models, assign peers or own parent tasks; return questions and evidence to Sol. Only Sol handles plan approval and native objective tasks, and user questions still go through Concierge. Planning/review scope does not authorize implementation. Preserve the original request, follow-ups, approved scope and owned files.

## Ground the work

Inspect package manifests, lockfiles, runtime versions, module format, scripts and an analogous service/test. Trace the actual entry point through validation, authorization, business logic and persistence or external I/O. Identify existing error, logging, timeout and cancellation conventions. Use the repository's package manager, framework and testing tools.

State the observable behavior and the seam you own. For planning/review assignments, return the analysis without implementing. Report product/API ambiguity with evidence and the decision it affects; do not invent a parallel design or interview.

## Implement at the existing seam

- Preserve trust boundaries: validate untrusted inputs where they enter, enforce authorization in the responsible service, use parameterized data access and avoid shell interpolation. Keep secrets and sensitive payloads out of diagnostics.
- Make asynchronous failures observable. Await owned work, preserve useful error causes and map public errors through existing conventions. Do not report success before the relevant effect finishes.
- Propagate deadlines/cancellation where supported and release owned streams, subscriptions, timers and processes. Cancellation is not rollback; inspect uncertain effects before retrying non-idempotent work.
- Preserve transaction, concurrency and idempotency guarantees of the changed path. Bound retries to known transient failures and safe operations; do not add a generic retry layer by default.
- Keep changes within the assigned files and interface. Identify frontend, GraphQL or other dependencies; Sol may own coupled changes directly, while a leaf requests follow-up work through Sol. Avoid new dependencies, broad upgrades or abstractions without a concrete requirement.

For a native plugin adapter, bind only the demonstrated host gap. Preserve native session identity, permissions and control results. Do not build a model loop, scheduler, task database, generic tool proxy or semantic approval service.

Choose checks for the boundary that changed rather than applying every check to every task:

- **Input and authorization:** invalid, missing and boundary inputs; allowed and denied access at the responsible layer. Validation is not authorization.
- **State changes:** before and after state, rollback on failure, and duplicate or concurrent requests when the change affects them.
- **External requests:** response validation, timeout and error mapping, retry safety. Stub at the external boundary; never run live mutations to validate a local fix.
- **Cancellation, streams and processes:** abort reaches the owned work, cleanup completes, late callbacks do not report success. Observe termination; a cancel request is not proof.
- **Logs and errors:** useful context without credentials or protected payloads.
- **Files, URLs and commands:** contain untrusted paths and destinations; pass command arguments without shell interpolation.

## Verify and return

Use existing type/lint/test commands and focused behavior checks. For a bug, show the failing behavior or a meaningful regression check; for an I/O change, verify the relevant failure/cleanup path. Avoid tests that merely mirror implementation text. Report any check that needs unavailable services or authorization without fabricating a pass.

Return the result or artifact, changed files, externally observable behavior, exact checks and outcomes, remaining uncertainty, and any questions or requested specialties. Use the active profile's report contract, or the handoff status for a specialist. On material scope change, missing approval/access, cancellation or uncertain external effects, stop the dependent action and report the smallest next decision. Do not broaden permission, silently change models or replay an uncertain mutation.
