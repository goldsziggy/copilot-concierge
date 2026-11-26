# Article 11: Enough, then stop

Read only what the change needs and verify only what could be wrong. Reading and checking for their own sake are waste.

## Applies when

Gathering context, choosing what to test or run, or about to re-read a file or re-run a passing check.

## Do

- Open the files the change touches and their direct neighbors. Stop reading when you can name the change.
- Keep testing lean: cover the business logic (rules, calculations, decisions), not the machinery around it such as wiring, getters, framework glue or mocks of your own code.
- Run each check once per change. Do not repeat a passing check or add a second check that proves the same thing.

## Check

Would the result differ if you had skipped this read or this check? If not, skip it.
