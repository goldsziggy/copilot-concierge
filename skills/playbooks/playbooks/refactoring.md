# Refactoring

Use when: the structure should change and the behavior should not.

You own behavior preservation. A refactor that changes what users observe is a different task.

## Steps

1. State what will change in structure and what must stay the same in behavior.
2. Establish the safety net: run the existing tests and record the result. Where the code to be moved has no test, add one that pins its current behavior first.
3. Remove dead code and unused paths before reshaping what remains.
4. Make the change in small steps, running the tests after each (`development`, `test`).
5. Migrate every caller of anything you replaced and delete the old form in the same change.
6. Run the full suite and compare with the result from step 2.
7. Run the Opening a PR playbook.

## Done when

- The tests that passed in step 2 still pass, with no expected value changed.
- No caller of a removed or replaced interface remains.
- The diff contains no behavior change; anything found along the way is reported, not fixed.

## Reply

What changed in structure, the evidence that behavior is unchanged, and anything noticed but left alone.
