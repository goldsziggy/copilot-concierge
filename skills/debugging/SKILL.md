---
name: debugging
description: Reproduce and isolate a fault using competing hypotheses, targeted evidence and a minimal verified fix. Use for cross-stack bugs, intermittent failures, unexpected outputs or regressions before speculative edits.
---

# Debugging

Use this procedure as the current execution owner. Your agent profile determines identity, tools, model, delegation and reporting. Sol may work directly within approved scope; a specialist remains a leaf and returns findings or questions to Sol. This skill grants no new tool, write, deployment, spending or data-access authority. Follow applicable repository instructions and the user's current restrictions. A diagnosis-only request remains read-only except explicitly allowed learning.

## Establish the failure

1. State expected versus observed behavior and its impact. Identify the repository/ref, environment, versions, inputs, relevant timeline and affected scope. Distinguish a user report, inference and reproduced observation.
2. Inspect existing changes and preserve concurrent work. Check the actual error and relevant code path before reusing an older diagnosis. Reduce the failure to the smallest safe reproducer using synthetic or redacted inputs. Record the exact command, outcome and evidence location.
3. If reproduction is unavailable or intermittent, record what was tried and what remains unknown. Compare successful and failing cases, collect bounded diagnostics and establish frequency when measurable. An absent failure in one run does not prove a fix.

## Test explanations before changing code

Keep a short hypothesis list in the current working context, not a new persistent service or dossier. For each plausible explanation, state supporting evidence, a disconfirming observation and the cheapest safe test that distinguishes it from alternatives. Prioritize tests by information gained and user impact, not by confidence language alone.

Trace the behavior across relevant boundaries, such as UI state, API payload, validation, persistence and asynchronous jobs. Load the existing domain procedures as needed. Keep a tightly coupled fault with one owner; only Sol chooses whether an independent investigation warrants another agent. Use a known-good baseline or bounded diff comparison where available. Do not call correlation a root cause.

Change one explanatory variable at a time when practical. Re-run the failing case after each informative change. Prefer existing logs, tests and local fixtures over production mutations. Never log secrets, private payloads or unnecessary personal data. Do not replay a timed-out or interrupted external action until its actual effects are reconciled; an error does not prove nothing happened. Respect cancellation, permissions and approved resource budgets.

## Fix and verify within authority

Once evidence supports a cause, explain the causal chain and make the smallest coherent fix if implementation is authorized. Diagnosis does not authorize edits, dependency upgrades, security-setting changes, deployment or production-data repair. If implementation needs a decision or expanded scope, return the precise question and continue independent allowed analysis.

Add a regression check that fails on the known-bad behavior and passes on the fix, where feasible. Verify the original reproducer and nearby boundary, negative, retry, cancellation and concurrency cases relevant to the defect. Run applicable repository checks on the final code, including after subsequent edits. Avoid broad refactors or new dependencies unless necessary for the approved fix.

For intermittent faults, repeat the relevant exercise and report the number of runs and remaining limits. Keep focused tests, full-suite results and actual runtime observation distinct. Independent review is a separate assessment by another reviewer when requested or required for meaningful/risky changes; self-checking cannot supply independence.

## Return usable evidence

Report:
- Expected and observed behavior, reproduction status and affected repository/environment.
- Hypotheses tested, evidence that supported or rejected them, and the demonstrated cause or unresolved gap.
- Changed files and minimal fix, or no implementation performed.
- Exact checks and outcomes, including failures, skipped checks and untested environments.
- Remaining uncertainty and the smallest next decision or action.

Do not claim resolution from a successful build alone. On stop, halt pending work, preserve evidence and report completed or uncertain effects without automatically undoing or replaying them.
