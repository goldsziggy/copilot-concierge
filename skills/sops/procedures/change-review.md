# Change review

Use when: the user wants a pull request or merge request reviewed, and asked for no change to it.

You own the findings. Each one points at a line and says what to remove or simplify.

## Steps

1. Identify the pull request or merge request: its link or number, host, source and target branches, and the diff to review.
2. Read its description and investigate any linked Jira issue for the intended behavior and acceptance criteria (`scout`). Record each linked issue you cannot open.
3. Review the diff against that intent and the repository's conventions (`review`).
4. Look for AI isms: extra validation gates, checks or fallbacks for inputs that cannot occur, code for problems that are not there, wrappers, flags or options nothing uses, and comments restating the code (Article 1).
5. Support each finding with relevant callers, types, tests or requirements showing why the code is unnecessary. Keep required validation and real edge cases; drop unsupported findings.

## Done when

- Every finding names a file and line, says why it is unneeded and what to remove or simplify.
- Each linked Jira issue was read, or the report names it as inaccessible.
- No file was changed and nothing was posted to the pull request or merge request.

## Reply

A one-line verdict first. Then the findings, most important first, each with its location; any other defects found; linked issues you could not open; and at most three suggestions.
