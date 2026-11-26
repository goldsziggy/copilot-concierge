# Bug fix

Use when: something that worked, or should work, does not.

You own the diagnosis. Every changed line traces to evidence; a change that "might help" is a hypothesis, not a fix.

## Steps

1. Reproduce the failure and record the exact command and output. If it will not reproduce, tighten the conditions or add a failing test that shows it.
2. Find the cause: load `debugging`, form hypotheses, and rule them out with evidence until one survives (Article 5).
3. State the cause and the smallest fix in two or three lines. Load `plan` when the fix crosses a module boundary or needs approval.
4. Add or update a test that fails for the cause, then make the smallest fix (`development`, Article 1).
5. Verify: the reproduction from step 1 now passes, then climb the ladder in `test` (Article 6).
6. Revert anything a refuted hypothesis motivated.
7. Have a meaningful or risky fix reviewed independently (`orchestrate`).
8. Run the Opening a PR SOP.

## Done when

- The original reproduction passes, shown by its output before and after.
- A test covers the cause and the suite the repository names passes.
- The diff contains only what the evidence justifies.

## Reply

What was broken, the root cause, the fix, and how it was verified, with the failing and passing reproduction output.
