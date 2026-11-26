# Article 1: Keep It Simple, Stupid (KISS)

Make the smallest change that meets the goal. Prefer deleting to adding, and add no layer, option or abstraction the request does not need.

## Applies when

Sizing a change, refactoring, or tempted to add a wrapper, flag or abstraction.

## Do

- Remove dead code and unused paths first, then build on what is left.
- Collapse one-caller wrappers, shrink mutable scope and cut hidden state so the code is easy to trace.
- If a simpler version meets the acceptance criteria, ship that one.

## Check

Could a line, layer or option be removed with the goal still met? Then remove it.
