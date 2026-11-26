# Article 7: Work in verifiable units

Break work into small units that each end in a check, and verify each before starting the next.

## Applies when

Multi-step work, sweeps, migrations, and deciding how to split commits.

## Do

- Order the units so the sequence proves itself, such as the failing test before the fix.
- Test what users can observe, so a test fails when behavior breaks and survives a refactor.

## Check

Did every unit end green before the next began, and do the tests assert behavior rather than internals?
