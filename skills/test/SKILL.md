---
name: test
description: What to run when checking a change, in what order, how to compute an error signature and what may be mocked. Use as the Concierge worker after every edit beyond the fast path and before reporting a result.
---

# Test

Use this procedure as the current execution owner. Your agent profile controls identity, tools, model, reporting and delegation; loading this skill grants no tool, access or authority.

Climb the ladder after every change. Stop at the first red step and fix it before going on. Take every command from `progress.repo_summary`; never guess one.

## Keep it lean

Test the business logic you changed: rules, calculations and decisions. Do not write tests for the machinery around it, such as wiring, getters, framework glue or mocks of your own code. Run each step once per change; a passing check is not re-run, and a second check that proves the same thing is not added.

## Ladder

| Step | What | When |
| --- | --- | --- |
| 1 | Tests for changed files and their direct dependents | After every edit |
| 2 | Lint and type check | After every edit that compiles |
| 3 | Full unit suite | Before reporting a result, and before every push |
| 4 | Integration tests, if the repository defines them and they can run here | Before reporting a result, if available |
| 5 | End-to-end, headless | When the change touches UI or routes and the repository has such tests |

Prefer the test runner's own filter (for example `jest --findRelatedTests <files>`, `vitest related <files>`, `pytest <paths>`, `go test ./<pkg>/...`). If the repository has no such option, run the test files next to the changed files. One command per shell call, exactly as the repository names it.

## Error signature

After every failure, compute `<step or job name>|<first failing test id or first error line>`, then normalise:

- strip absolute paths to the repository-relative path;
- strip line and column numbers;
- replace hex ids, UUIDs, timestamps and port numbers with `*`;
- collapse whitespace.

Example: `unit-tests|TypeError: Cannot read properties of undefined (reading 'price') at orders/price.ts`.

Record each signature in `progress.error_signatures` with its count. The same signature twice in a row on the same step is a `repeated_failure` blocker: stop retrying and load `escalate`.

## Mocks

Mock only what sits outside the code you are changing.

| Allowed | Not allowed |
| --- | --- |
| Third-party APIs, payment and email providers | The unit or module being changed |
| Network, time, randomness | An assertion's expected value |
| Services this environment cannot reach | A test the change made fail |
| Credentials (fake values only) | Anything that could run for real here |

Name every mock in the result.

## Never

- Delete a test, add a skip or `.only`, or change an expected value, unless the request says the expected behavior changed. Say so in the result.
- Report a step as passed without having run it in this objective. Keep focused checks, the full suite and anything you did not run distinct in the result.
