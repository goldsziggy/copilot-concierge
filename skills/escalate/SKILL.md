---
name: escalate
description: Settle a question or blocker with the least risk and decide whether the user is needed - answer from a source, retry, mock, assume and flag, ask, or stop. Use as the Concierge worker before any needs_input or blocked report, for every decision under full autonomy, and on a repeated failure or stall.
---

# Escalate

Use this procedure as the Concierge worker. Your agent profile controls identity, tools, model, reporting and delegation; loading this skill grants no tool, access or authority.

You are judging one blocker. Settle it with the least risk, and hand a question to the user only when no source and no safe default can.

## Before you judge

1. Write the blocker down: its `kind` (see your profile), one answerable question, the goal it blocks, what you tried, the evidence, and two or three options.
2. Compute the fingerprint: kind + normalised question + error signature + touched files. Lower-case; strip paths, line numbers, ids and timestamps.
3. Count it in `progress.counts`. If you have already settled this fingerprint twice without the user, go straight to step 6.

## The checklist

Stop at the first step that settles it.

| Step | Ask | Outcome |
| --- | --- | --- |
| 1 | Does the brief, an earlier user answer, a repository document or `AGENTS.md` already answer it? | `answer`, with the source |
| 2 | Do the attempts leave an untested hypothesis? | `retry_with_hint`, once |
| 3 | Is an external service, credential or data set blocking a check, while the logic under change does not depend on it? | `mock_and_continue` |
| 4 | Can a check that cannot run here run somewhere the request allows, such as CI on a branch the user asked you to push? | `use_ci` |
| 5 | Is every option easy to reverse in review, and is one clearly safest? | `assume_and_flag` under `full`; under `guided`, take the clearly safest ordinary default and say so in `message`, or go to step 6 when the choice is the user's to make |
| 6 | Does it need authority or information no source holds? | `ask` |
| 7 | Can the objective not succeed as written? | `abort` |

## Rules

- Re-read every source you cite. The words you rely on must be there. If they are not, judge again once; if that fails, `ask`.
- `answer` needs at least one source. Inference alone never settles an `ambiguity` or `permission` blocker.
- Never `assume_and_flag` for permission, security, authentication, data migrations, a public API, or anything the brief or a user restriction contradicts.
- A mock's boundary must sit outside the unit under change.
- Never allow deleting a test, adding a skip or changing an expected value unless the request says the behavior changed.
- Your own first preference is one option to check, never the default.
- At most ten assumptions per objective; the next is `ask`. At most two outcomes other than `ask` per fingerprint.
- Never put secrets or environment values in a question or an assumption.

## Hard stops

These are always `ask`, in either autonomy mode:

- something only the user can supply: access, credentials or content you cannot reach;
- an action the request did not name that is destructive, hard to undo or reaches beyond the repository: deleting data, force-pushing or rewriting history, merging, tagging, deploying, publishing, releasing, sending messages or spending money;
- a choice between materially different outcomes that would be costly to reverse;
- a conflict with an explicit user restriction.

A denied tool call is not a hard stop. Follow your profile's "Shell commands" strictly and finish everything the permitted tools allow; `ask` only for what is still denied, naming the exact command or path so it can be allowed.

## Acting on the outcome

| Outcome | `guided` | `full` |
| --- | --- | --- |
| `answer`, `retry_with_hint`, `mock_and_continue`, `use_ci` | Act on it and keep working | Act on it and keep working |
| `assume_and_flag` | Not used | Take the option, record it, keep working |
| `ask` | Report `needs_input` with the question | Report `blocked` once, with exactly what is needed and what is already finished and verified, and end the turn |
| `abort` | Report `blocked` with the reason | Report `blocked` with the reason |

Park only the tasks that depend on the answer (`parked` in `progress.tasks`); finish everything else first when you can.

## Under full autonomy

Nobody will answer, so carry the objective to a verified result without consulting the user.

- Record every `assume_and_flag`, and every default you picked for behavior the request left open (rounding, date boundaries, naming, compatibility), in `progress.decisions` as `decided for the user: <choice>: <why>` and in the report's `decided for the user` block. These are inferences the user can reverse, never user decisions or approvals.
- Do not end a turn to show a plan or to pause between phases the request covers.
- Finish in-scope work you would otherwise offer as a suggestion, such as a check that did not run or a failure your change caused. Keep `suggestions` for work beyond the request.
- If the same step fails the same way twice, stop retrying it and report `blocked`.
- Scope, plan approval, Git requests, file-write restrictions, learning scopes, proportional review, the retry-once rule and Copilot's permissions are unchanged. Full autonomy never justifies a permission bypass, and an inferred preference is not saved to memory without the user's confirmation.

## Writing an assumption

One sentence each for: the option taken, why it is the safest, and exactly how to reverse it (file, setting or commit).

## Writing the question

Write what a busy person can answer in one reply:

- one question, in plain language, with no logs;
- two or three options, each one line, with what it changes;
- your recommendation and the one reason for it;
- the tasks that are parked until it is answered.

## Example

Blocker: `ambiguity`. "Should prices round half-up or half-even?" The brief's acceptance criteria say "match the invoice service". `docs/invoice.md` says "amounts use banker's rounding".

Outcome: `answer`, from `docs/invoice.md`, re-read: use half-even (banker's rounding).
