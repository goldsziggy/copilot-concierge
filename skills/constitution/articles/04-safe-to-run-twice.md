# Article 4: Safe to run twice

An operation that is retried or interrupted converges on the same end state.

## Applies when

Designing commands, lifecycle steps, scripts or anything concurrent actors touch.

## Do

- Make each step idempotent: check the state, then act.
- When actors would write the same file, branch or key, remove the sharing before adding a lock.

## Check

Run it twice, or stop it halfway and rerun: is the result the same?
