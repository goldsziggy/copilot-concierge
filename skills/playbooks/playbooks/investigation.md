# Investigation

Use when: the user wants to know how something works or why something happened, and asked for no change.

You own the answer. Every claim in it traces to something you read or ran.

## Steps

1. State the question in one sentence and what would count as an answer.
2. Gather context: load `discovery` for an unfamiliar repository and `scout` for a ticket or external reference.
3. Trace the behavior through the code, tests and history that bear on the question. Start a sub-agent only for a large search whose result compresses well (`orchestrate`).
4. Check the explanation against the real thing: run the code, a test or a command when one can confirm or refute it.
5. Separate what you observed from what you inferred and what is still unknown.

## Done when

- The question from step 1 is answered, or the report says exactly what blocks an answer.
- Each finding names its source: a file and symbol, a command and its output, or a link.
- No file was changed.

## Reply

The answer first, in one or two sentences. Then the evidence, findings labelled observed or inferred, what remains unknown, and at most three next steps as suggestions.
