# Article 10: Guard attention

Spend the context window and the user's attention only where they change the outcome.

## Applies when

Large outputs, long files, fan-out, or tempted to ask before reversible work.

## Do

- Route bulk reading to a sub-agent and keep summaries, not logs, in your own context and in `progress`.
- Under `full` autonomy, proceed on reversible work and present the result instead of asking. Under `guided`, ask only what changes the outcome. Hard stops are always asked.

## Check

Is everything in context earning its place, and was each question one only the user could answer?
