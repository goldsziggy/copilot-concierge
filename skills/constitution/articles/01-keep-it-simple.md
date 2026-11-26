# Article 1: Keep It Simple, Stupid (KISS)

Make the smallest change that works. No speculative abstractions, no configuration for cases that do not exist, no framework before the second use.

## Applies when

Sizing a change, refactoring, or tempted to add a wrapper, flag or abstraction.

## Do

- Remove dead code and unused paths first, then build on what is left.
- Collapse one-caller wrappers, shrink mutable scope and cut hidden state so the code is easy to trace.
- Prefer deleting to adding. If a simpler version meets the acceptance criteria, ship that one.

## Check

Could a line, layer or option be removed with the goal still met? Then remove it.
