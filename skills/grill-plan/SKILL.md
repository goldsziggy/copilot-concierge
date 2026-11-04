---
name: grill-plan
description: Challenge a proposed plan or important assumption using source evidence, concrete failure cases and smaller alternatives. Use for requested plan review or consequential uncertainty; return actionable findings to the orchestrator without inventing objections, creating approval gates or implementing fixes.
---

# Grill a plan

Use this procedure for evidence-based assessment within the assigned read scope. Your profile determines identity and delegation. When independent review is required, a different reviewer must inspect the author's work; Sol checking its own change is self-checking, never independent review. A reviewer profile remains a non-implementing leaf. Read the handoff in your prompt, the original acceptance criteria, the proposed plan and relevant evidence. Inspect source material needed to test the plan, within assigned read scope. Do not rely only on the author's success summary. Do not implement fixes during assessment. A leaf reviewer must not recruit another reviewer, contact peers, approve work or change native parent tasks; Sol retains its profile responsibilities.

## Review proportionally

Review the decisions most likely to cause rework or miss the user's outcome. Compare the original intent, objective, acceptance criteria, constraints, decisions/inferences, dependencies and verification in the structured outcome with the proposed steps. Consider whether the plan addresses the actual problem, reuses the existing system, assigns coherent ownership, accounts for important API/UI behavior, and has checks capable of disproving its success claim. Apply only the considerations relevant to this task; a small clear change does not need a ceremony. This skill is not a mandatory stage for every plan. Use it for requested review or consequential uncertainty, not to manufacture an objection quota or approval gate.

## Return actionable findings

For each material finding return:

- Finding: a short label, with a stable ID when needed to track revisions; the disputed assumption, criterion or plan step.
- Severity: high, medium or low, with the concrete user/engineering consequence. High threatens the intended outcome, an explicit constraint or a costly/irreversible decision; medium risks meaningful rework or a gap in acceptance evidence; low is a bounded improvement. Severity describes impact, not certainty or permission.
- Failure case: a plausible concrete situation that would expose the problem.
- Evidence: source/file location, observed result, or an explicitly unverified inference; distinguish a supported defect from a preference, open question or missing proof.
- Resolution: the smallest plan adjustment, bounded investigation, check or user decision, and the evidence that would demonstrate resolution.
- Disposition: open, resolved with evidence, or accepted/deferred by the authorized owner with the reason and any remaining limitation. Do not invent a resolution or acceptance that has not occurred.

Prioritize consequential findings. Distinguish a defect supported by evidence from a preference, open question or missing proof. Do not give a confidence score as a substitute for evidence. “No material findings” is a valid result; state the important coverage and remaining limitations without implying every risk was eliminated.

If missing facts can be inspected within your scope, inspect them. If another specialty or access is needed, identify the exact gap and requested expertise; a leaf returns it to Sol and never recruits. Questions for the user must identify the decision they change and what was already checked. Sol owns finding disposition and the next action within existing scope and permissions; a reviewer recommends a resolution, not authorization to implement it or waive a user requirement. The orchestrator owns user interaction and plan approval; your review adds no approval step. A severity label does not create a new gate or change `ask`/`auto` approval behavior.

On a revised plan, focus on changed decisions and unresolved findings. Reuse adequate evidence and settled dispositions; reopen a finding only when new evidence or a changed assumption makes it relevant again. Do not demand an endless re-review loop or reread unchanged sources merely to repeat a review. Sol retains consequential findings and their dispositions with the existing plan/handover so amendments, resume and rollover do not lose them. On stop, return completed findings and unexamined areas. End with findings, evidence, scope reviewed, remaining limitations and the next useful action for Sol; a clean review is not proof of implementation completion.
