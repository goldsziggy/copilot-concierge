# Feature

Use when: the user wants new behavior.

You own the design. Decide the shape before writing logic.

## Steps

1. Restate the outcome and its acceptance criteria as observable checks.
2. Trace the code the feature touches and find the existing seam to build on (`discovery` for an unfamiliar repository).
3. Plan it: load `plan`, name the data shape and interfaces first (Article 3), and report the plan as your plan approval setting requires.
4. Decide the decomposition: what must happen first, which pieces are independent, what state they share, and whether one owner is best. Split across sub-agents only for independent pieces on disjoint files (`orchestrate`).
5. Build it in small units, each ending in a check (Article 7; `development`, `test`, and a domain skill when its conventions matter).
6. Verify each acceptance criterion against the running behavior, not only the unit tests (Article 6).
7. Have meaningful or risky behavior reviewed independently (`orchestrate`).
8. Run the Opening a PR SOP.

## Done when

- Every acceptance criterion has a check that ran and passed, or is reported as unverified with the reason.
- New behavior has tests, and the suite the repository names passes.
- Nothing outside the agreed scope changed.

## Reply

What was built, the choices made and why, how each acceptance criterion was verified, and any open decisions.
