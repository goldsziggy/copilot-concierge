---
name: task-evaluation
description: Evaluate completed objectives using actual artifacts, constraints, verification evidence, time and available usage. Use for a bounded acceptance review, investigating regressions or comparing execution approaches; plan repeated trials without launching paid model calls automatically.
---

# Task evaluation

Use this procedure on demand as the current execution owner, or within a bounded evaluation assignment. Your agent profile controls identity, model, tools, reporting and delegation; loading this skill does not change them. Sol retains objective ownership and the completion claim. A specialist remains a leaf: never recruit agents, launch other models, assign peers or own parent tasks; return evidence and questions to Sol. An evaluator does not acquire permission to change implementation, publish results, install a plugin or run paid trials. User questions and decisions go through the existing Concierge flow.

## Choose the smallest useful evaluation

Use existing evidence first. For a single objective, assess its final artifact and actual execution against the original request and ordered amendments. For a reported failure, isolate the smallest reproducible acceptance case and distinguish an observed defect from missing evidence. Use repeated baseline/candidate trials only when the comparison requires them and the user has authorized their scope and budget.

Loading this skill is not a mandatory stage for every task and does not force another agent boundary. A spelling fix needs a proportionate check; meaningful behavior changes or consequential assumptions benefit from an independent reviewer. If the execution owner grades its own change, disclose that limitation rather than describing the review as independent. Explicit configured custom review routes remain authoritative.

## Establish the acceptance contract

1. Preserve the original request, current scope, ordered follow-ups, explicit restrictions and approved plan. Current decisions supersede earlier ones. Separate requested outcomes from evaluator hypotheses.
2. Identify the final repository revision or artifact hashes, actual tools/host, and the commands or observations that could establish each acceptance criterion. Read applicable project instructions. A passing check on an older diff does not verify later edits.
3. List the expected outcomes, forbidden effects, relevant prior behavior and material unknowns. Predeclare pass/fail criteria before a comparison. A justified safe stop may be the expected outcome for a cancellation or changed-consent scenario.
4. Inspect actual changes and decisive evidence. Verify command results where available; do not accept a worker's closing summary alone when the artifact or result is decisive. Reuse adequate existing evidence rather than rerunning every check reflexively.
5. Mark each criterion pass, fail or unverified with its source. Any unresolved required criterion prevents an accepted-completion claim. Report passed, failed and never-run checks separately.

## Record the outcome and full execution cost

Use [run-template.json](references/run-template.json) as a small record shape when a durable report is in scope. Keep records in the authorized evaluation destination, not preference memory or repository knowledge. The template is unexecuted: set a unique run ID, scenario, exact revisions, arm and repetition when applicable; replace `recordKind` with `observation` only for an actual observed run. Do not invent sample results.

Record these observations, with null or an explicit unavailable explanation when the host does not expose them:

- Accepted completion and criterion-level artifact evidence.
- Unsupported completion claims, lost user constraints, unintended writes and human corrections.
- Actual models observed, not just requested or configured model names.
- Delegations and useful boundary rationale, retries, repeated discovery and assumptions that changed.
- Elapsed wall time and human approval wait separately. Execution time is elapsed wall time minus measured approval wait, including model/tool waits; do not sum overlapping worker times. Explain other unmeasured idle intervals.
- Actual input/output tokens, credits or monetary cost and currency, with source and complete/partial/unavailable coverage. Include failed attempts, retries and canceled work. Keep units separate and never infer dollars from token counts.
- Changed files/artifacts, final diff, commands, outcomes, relevant output and remaining uncertainty.

Zero means an observed zero, not an unavailable metric. Do not publish private memory, secrets, personal information or raw account transcripts in a report or release. Use synthetic data for trial fixtures and redact evidence. Report preparation never grants publication permission.

## Diagnose a regression without expanding the task

Trace a failed acceptance criterion to its supporting artifact, command or missing observation. Check whether the issue is incorrect behavior, a lost constraint, an approval/cancellation error, stale evidence, unavailable tools or an uncertain remote outcome. Preserve failing evidence and identify the smallest resolving check. Do not replay a side-effecting operation whose outcome is unknown; inspect its state first. Return the diagnosis and a bounded next action to the objective owner. Evaluation alone does not authorize implementation, a retry with new consequences or a different publication target.

## Optional comparative trials

The bundled [protocol](references/protocol.json) and [scenario seeds](references/scenarios.json) describe a proposed 0.6.1 baseline against a 0.7.0 candidate. They contain no completed runs. Adapt the plan to the actual comparison; record any change and pin exact revisions before execution. The candidate revision is intentionally unset until frozen. Do not treat source tests of these files as live model evidence.

Before trials:

1. Confirm an explicit scope, model-call budget and authorized account. No paid trials, model sessions or background evaluations start automatically. The default three repeats per scenario per arm is a planning suggestion, not spend authorization. A smaller pilot is valid but must be labeled partial.
2. Prepare pinned disposable fixture repositories and isolated synthetic learning state. Declare acceptance commands and expected results in advance; use an independent reviewer to check the fixture/criteria when warranted. Never copy the user's real memory into a comparison.
3. Match original requests and follow-ups, fixture revisions, tool permissions, host version, plan decisions and observation windows. Deliver cancellation or changed-plan input at comparable semantic checkpoints rather than racing a fixed sleep. Use fresh objective sessions per repetition, except deliberate follow-up/resume within that repetition.
4. Alternate baseline/candidate ordering, record actual models and any uncontrolled differences. Production-pin results may conflate topology with model capability; a separately budgeted matched-model comparison can help isolate that effect. Never silently change required product model pins.
5. Do not alter installed caches or disturb active sessions. Use an already-authorized isolated loading method. A dry-run provider fixture tests publication decisions; real draft creation still needs the existing exact-proposal consent and authorized capability.

Run only the approved matrix. Record all attempts, including failures, cancellations, blocked and unverified runs. Stop at the budget, cancellation or a consequential regression; report partial coverage rather than filling gaps with estimates.

## Compare and report

Grade outcomes before efficiency. An independent reviewer should examine the actual artifacts and evidence, with arm labels hidden when practical. Report per-scenario regressions alongside aggregate results. New unintended writes, privacy/approval violations, ignored custom routes or unsupported success claims require investigation even when average completion improves.

Report accepted runs divided by all attempts, distinguishing expected safe-stop acceptance from accidental interruption. Show failed, blocked, canceled and unverified counts. For accepted runs, show execution-time median and range, plus time spent on failed attempts and approval wait separately. Small repeated samples are exploratory, not proof of universal improvement.

When usage coverage is complete and units comparable, cost per accepted task is total observed cost of all attempts, including failures and retries, divided by accepted tasks. With no accepted tasks it is undefined. Partial or unavailable cost cannot establish a cheaper approach. Keep token, credit and monetary comparisons separate.

Return a concise decision supported by evidence: what succeeded, what regressed, what remains unverified, and the smallest next action. Recommend retaining a candidate only when required behavior is preserved and the observed benefit survives per-scenario review. Make no speed, quality or savings claim without actual comparative evidence. On interruption, preserve known results and current state; do not report incomplete evaluation as acceptance.
