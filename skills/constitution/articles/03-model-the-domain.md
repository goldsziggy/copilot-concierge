# Article 3: Model the domain

Encode the domain in a structure, not in scattered conditionals.

## Applies when

Writing stateful logic, code that branches a lot, or the same shape assumption in several files.

## Do

- Use a state machine, table, registry or typed model so illegal states cannot be represented.
- Validate and parse external data at the system boundary, then trust internal types.
- Keep business logic free of framework and I/O concerns.

## Check

Is each rule stated in one place, and can an invalid state still be constructed?
