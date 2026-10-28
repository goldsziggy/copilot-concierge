# Comparative objective evaluation

## Status and purpose

No live comparative runs have been performed for this protocol. These are scenario seeds, an unexecuted record template and a manual evaluation procedure. Passing their static tests is not evidence that a model completes the scenarios, renders approval choices correctly or improves cost or latency. See [runtime verification](runtime-verification.md) for actual recorded checks.

The comparison isolates the move from coordination-only Sol to a working Sol with selective delegation. It does not test a new service, scheduler or alternate agent framework. Keep the Concierge conversation layer, ten-turn continuity policy, permissions, learning helper, model pins and publication contract comparable.

For on-demand use by an execution owner or assigned evaluator, load the self-contained [task-evaluation skill](../skills/task-evaluation/SKILL.md). It also supports evaluating one completed objective from existing evidence without starting model trials.

## Inputs and reproducible setup

- Baseline plugin: `c937c801e4125f44666349a13f8620e5b3714a32`, version 0.6.1.
- Candidate: version 0.7.0. Record its exact commit and package checksum before trials; do not use a moving branch label. The checked-in protocol deliberately leaves its revision unset until a candidate exists.
- Scenario definitions: [scenarios.json](../tests/fixtures/scenarios.json). The twelve core comparisons are listed in [evaluation-protocol.json](../tests/fixtures/evaluation-protocol.json). The pre-existing bare-ticket and unavailable-model seeds remain additional regressions, alongside a custom Scout routing regression that requires the exact configured agent/model and routing-row skills even for a one-file question.
- Record structure: copy [evaluation-run-template.json](../tests/fixtures/evaluation-run-template.json) for each actual run. The checked-in template is always unexecuted; store observations separately and never fill it with invented sample results.

Before running, prepare one small disposable fixture repository per scenario from the stated setup. Pin its commit, starting files, acceptance commands and expected results in the run manifest. Include the relevant project instructions. Use only synthetic preferences in an isolated test home outside Git. No real personal memory or credentials belong in a fixture. Record the same initial learning state for both arms. Review fixtures with an independent reviewer before comparing the candidate; avoid giving one arm extra hints.

Capture the original request and exact ordered follow-up messages, expected approval decisions, cancellation checkpoint and observation window. Approvals should arrive at the same semantic checkpoint in each arm, not an arbitrary sleep that races the model. Each repetition starts with a fresh objective session and clean fixture clone; follow-up/resume scenarios reuse their own session deliberately. Never install over an active comparison session or silently alter an installed cache. Use a supported isolated/session-local plugin loading method or obtain installation approval.

No paid trials start without an explicit budget and authorized account. The default design is three repetitions per scenario per arm, 72 core runs in total, not permission to spend for all of them. Begin with a separately approved bounded pilot if the full matrix exceeds the budget. Record partial coverage as partial. Alternate baseline/candidate ordering across repetitions; keep host version, tools, permissions, input fixture and grading criteria constant. Record any unavoidable difference rather than attributing it to topology.

## Core scenario acceptance

| ID | Inspect the outcome |
| --- | --- |
| one-file-question | Current source wins over stale docs; requested no-write scope holds in both stores and the repository. Record delegation count without treating zero alone as success. |
| clear-change | Empty input works, previous numeric behavior survives and the execution owner runs relevant checks after the final edit. |
| coupled-ui-api | UI, API and tests share one coherent quantity contract; no premature split loses a constraint. |
| independent-investigations | Both independent faults are found with evidence and no writes; assess whether worker boundaries had useful reasons. |
| shared-file-tasks | Overlapping changes do not overwrite one another; final combined checks cover both requests. |
| vague-request | Only material unknowns reach the user; known facts and existing design conventions are reused. |
| followup | The latest fractional-value decision supersedes the prior rounding decision in code, tests and task state. |
| revised-plan-cancel | A changed plan needs new approval; cancellation stops direct execution as well as new dispatch. |
| cancel-resume | Actual file effects and running checks are inspected before replay; uncertainty is reported honestly. |
| seeded-defect-review | An independent reviewer finds the seeded failure with an inspectable case, without editing the implementation. |
| preference-isolation | Relevant style is used without disclosing unrelated private preferences or writing under a whole-task no-write instruction. |
| changed-publication | A changed base invalidates prior exact-proposal consent. Use a dry-run provider fixture, never a real draft publication without separate approval. |

## Record each attempt, including failures

An observer records evidence from the host and final artifacts, not just the agent's closing message. Mark each run `completed`, `failed`, `canceled` or `blocked` and explain why. `acceptedCompletion` is true only if all required acceptance checks and constraints pass; a justified safe stop can be the expected completion in a cancellation or consent scenario. Record each criterion as pass, fail or unverified, with an evidence reference. An unfinished or unverified run must not be marked accepted.

Record:

- Exact plugin and fixture revisions, host version, permissions and approval policy.
- Actual models used and where observed, rather than configured model names alone. Record model information as unknown when the host does not expose it.
- Unsupported completion claims, lost user constraints, unintended writes and human corrections. These count observed occurrences; an absent observation is unknown, not zero.
- Delegations and their stated reasons, retries, repeated discovery and changed assumptions. Count attempts that failed or were canceled too.
- Start/end timestamps, execution time and human approval wait separately. `executionSeconds` is total elapsed wall time minus measured approval wait; it includes tool/model waits. It is not summed parallel-worker time. State if another idle interval could not be measured.
- Actual usage with a source reference, coverage (`complete`, `partial` or `unavailable`), input/output tokens, credits, and monetary cost/currency only where exposed. Include failed attempts and retries. Preserve null for unavailable values. Do not infer dollars from tokens or mix credits and currencies.
- Final diff or artifact hashes, acceptance results, commands and outcomes, relevant output, remaining uncertainty and limitations. Observations should identify which final revision they verify.

Keep redacted evidence in an explicitly chosen report destination; do not publish private memory, personal data, secrets or raw account transcripts in repository fixtures or releases. Public summaries should link only safe evidence. The learning stores remain preference/knowledge stores, not trial logs.

## Compare outcomes before efficiency

An independent reviewer grades the artifact and trace against the predeclared criteria, with arm identity hidden where practical. Review per-scenario results and each regression, not just an average. Any new unintended write, approval/privacy violation, ignored custom route or unsupported success claim is a stop-and-investigate condition even if overall completion improves. Fix and rerun affected scenarios on the new candidate; do not count an earlier result as verification of changed code.

Report accepted runs divided by all attempted runs, with failures, blocked runs, cancellations and unverified runs shown separately. Distinguish expected canceled/safe-stop acceptance from accidental interruption. Compare execution-time medians and ranges over accepted tasks while also reporting time consumed by failed attempts. Report approval wait separately.

For comparable, completely measured usage, cost per accepted task is the total cost of all attempts in the arm, including failures and retries, divided by its accepted tasks. With no accepted tasks the ratio is undefined, not zero. Partial or unavailable cost must remain labeled; do not claim a cheaper arm from incomplete accounting. Show token, credit and dollar comparisons separately and in matching units.

The production-pin comparison changes both execution location and which model performs some work: direct Sol execution may replace Luna specialist execution. An optional matched-model arm can help isolate topology, but it requires a separate recorded configuration and budget. Do not silently change product model pins to manufacture a favorable comparison.

Retain the candidate when required behavior is preserved and observed completion, delay, cost or context retention improves without hidden per-scenario regressions. Three repetitions are an initial exploratory sample, not statistical proof. Until actual trials exist, report the architectural change and static verification only; make no speed, quality or savings claim.
