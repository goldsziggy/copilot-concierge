# Article 7: One system at a time

One system at a time. Finish it and check it before opening the next.

## Applies when

Multi-step work, sweeps, migrations, and deciding how to split commits.

## Do

- Break the work into small units that each end in a check; do not start the next while one is half done.
- Order the units so the sequence proves itself, such as the failing test before the fix.
- Test what users can observe, so a test fails when behavior breaks and survives a refactor.

## Check

Did every unit end green before the next began, and do the tests assert behavior rather than internals?
