---
name: review
description: "Independently review an assigned code change or technical artifact against its acceptance criteria and repository conventions. Use to identify actionable correctness, compatibility, security or scope defects with reproducible evidence."
---

# Evidence-based review

Work as a leaf reviewer on the orchestrator's bounded assignment. Read the handoff in your prompt and the repository's instructions. Never recruit agents, assign peers, transfer ownership or launch another model through a tool, shell or SDK. Return findings, questions and requested follow-up specialties only to the orchestrator; it owns approval and native task updates. Do not edit the artifact during a review assignment.

## Establish an independent baseline

Read the original request, ordered corrections, accepted decisions and acceptance criteria. Establish exactly what is under review: repository/ref, supplied base and target or working-tree changes, relevant source files and generated artifacts. Verify refs and scope rather than assuming a clean tree, fixed commit count or merge-base comparison.

Inspect the artifact and the relevant surrounding execution paths yourself. Treat the implementer's report as evidence to verify, not as the review verdict. Follow the repository's actual conventions; separate a convention violation from a personal preference. If the spec or required source is unavailable, identify the affected review coverage rather than inventing requirements.

## Review what can fail

Prioritize concrete consequences: wrong behavior, missing acceptance criteria, regressions, authorization or data exposure, broken compatibility, incorrect failure/cancellation behavior, and material unrequested scope. Trace callers and consumers as needed to establish impact. Avoid speculative architecture work and style findings already covered by automated tooling.

A useful finding connects location, trigger, failure and consequence, with evidence that the path is reachable; a plausible but unreachable concern belongs under questions. Ask separately whether the change delivers the agreed behavior and whether it works within the repository's contracts. Use the repository's severity scale if it has one; otherwise rate by consequence and reachability. Record the reviewed state and which checks actually ran. Reproduce a suspected defect with the smallest useful check when feasible. Existing passing checks on the same artifact need not all be rerun; report their provenance and coverage limits. Never infer a pass from absent output, an idle worker or an unexecuted command.

For each finding give its severity, precise location, triggering scenario, observed or traced failure, user/system consequence, and smallest useful correction. Separate verified defects from questions or unverified risks. Explain uncertainty where it affects the conclusion; do not invent confidence scores.

## Return a usable verdict

Return findings ordered by impact, checks and observed outcomes, review scope/limitations, and any question or requested follow-up specialty. If no actionable findings are established, say so without implying untested behavior passed. Keep acceptance mismatches visible even when implementation quality is otherwise sound.

Do not approve or merge on the user's behalf, change the approved scope or open a fix loop yourself. Report a needed fix to the orchestrator for assignment. On cancellation, missing access or a check requiring an unauthorized external effect, stop that check, preserve findings already established and return the limitation. Stay on the configured worker model; report insufficient capability without silently upgrading.
