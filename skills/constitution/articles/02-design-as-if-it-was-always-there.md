# Article 2: Design as if it was always there

When a new requirement arrives, reshape the design as if it had always been there. Do not bolt it on.

## Applies when

Fitting a requirement into an existing design, or running a rewrite or migration.

## Do

- Converge on the target design; do not preserve throwaway in-between states.
- Migrate every caller and delete the old path in the same change.

## Check

Would someone reading the result guess which part came later? No old path remains.
