---
name: relay
description: Concierge entry agent only. Read a worker report and relay it - the to-do list, questions, plan approval, checkpoints, results, suggestions, unattended runs, the loop guard and stop requests. Load before acting on the first worker report in a conversation.
---

# Relay

This procedure belongs to the Concierge entry agent. Your agent profile keeps your identity, tools and limits; loading this skill grants no tool, access or authority. You relay reports; you read no files and judge no code.

## Reading a report

Read the newest turn with `read_agent` (`since_turn`). Each report starts with `CONCIERGE-REPORT`, then `status`, `objective`, `objective-id`, the `plan approval` and `autonomy` lines, a `decided for the user` block, a `tasks` checklist, a `progress` object, `suggestions` and a `message` for the user. Match the report to its objective-id before changing anything. Keep the `progress` object for follow-ups, rollover and resume; never show it to the user.

Update the root list with `update_todo` from the `tasks` lines, copied line for line: same wording, same markers (`- [ ]`, `- [/]`, `- [x]`, `- [-]`); add the leading `- ` if a line lacks it. When more than one objective is open, prefix each line with its objective name and keep the latest lines of every open objective, so one report never erases another objective's items. Drop an objective's lines once it is done and another objective has reported since. The worker mirrors its own tasks into the session's todo tables; you do not write those.

## By status

1. `needs_input`: if the user already answered a question in this conversation, send their exact words back instead of asking again. Ask the rest with `ask_user`, one at a time, offering the recommended answer first; send the answers back verbatim with `write_agent`.
2. `needs_approval`: preserve the plan's labels, numbering and line breaks, including blank lines and any revision details. Include the structured plan in the approval question when the existing `ask_user` schema supports it; otherwise show it immediately before the short question. Ask "Approve this plan?" with choices "Approve", "Change something", "Cancel". Do not invent schema fields or rely on Markdown tables or cards rendering. Send `PLAN DECISION: <exact choice and any text>` back to the same worker, associated with the displayed plan. Only "Approve" authorizes that displayed plan. "Change something" requests revision without authorizing work; relay any requested changes verbatim, using `needs_input` to resolve missing details. "Cancel" cancels that objective without authorizing work. Revisions require a new approval; an earlier approval does not carry over. A missing or ambiguous answer is not approval: clarify and wait.
3. `checkpoint`: relay the update in one or two sentences, then `write_agent` `CONTINUE` (or forward the user's newer message instead).
4. `done`, `blocked`, `cancelled`: relay the outcome plainly: what changed, how it was verified, how each of the user's follow-ups was handled, and what is left. Under `guided`, name any acceptance criterion the report left unverified. State only causes the report states. Keep the worker for follow-ups.

If `ask_user` is unavailable, present the same structured plan with its labels, numbering and line breaks, followed by "Approve this plan?" and the same choices "Approve", "Change something", "Cancel" in your reply, then end the turn and wait. Apply the same decision rules to the user's answer; never assume approval or send `CONTINUE` while waiting. For other questions, show the question and suggested answers and wait.

With several objectives, say which objective a question, plan or result belongs to.

## Suggestions

When a report's `suggestions` block is not `none`, follow the outcome with those items as a short numbered list headed "Next steps you might want:", keeping the worker's wording and reasons. They are offers: do not ask them with `ask_user`, do not repeat ones the user already declined, and never start one yourself. When the user picks one ("yes", "do 2" or its wording), send `USER FOLLOW-UP: <the user's exact words> (accepted suggestion: <the full suggestion text>)` to that objective's worker. You may add one item of your own only about the session itself, such as another objective that is waiting for the user.

## Unattended runs

The worker resolves `autonomy` and states it on each report's `autonomy:` line: `guided` (the default) or `full`. Autonomy changes who settles ordinary decisions, never plan approval `ask`, scope, Git requests, file-write restrictions or Copilot's permissions. `full` is built for unattended runs, such as a cloud agent driven through the Copilot SDK: assume nobody is there to answer and that this may be your only turn.

- **Let the host wake you.** A non-interactive run stays alive while background agents work, and their completion notification starts your next turn. If you must have a report inside the current turn, call `read_agent` with `wait: true` and a `timeout` of at most 180 seconds; if the worker is still running after that, end the turn rather than polling.
- **Never ask.** Do not call `ask_user` or wait for a reply. State a `needs_approval` plan, or the decision a `blocked` report says only the user can make, in your reply, add the `CONCIERGE-RESULT` line and end the turn. If the user later answers a displayed approval plan, apply the same plan-decision rules as in `guided` and send `PLAN DECISION: <exact choice and any text>` to its worker; silence or an ambiguous reply never approves it.
- **Completion check.** Before relaying `done`, compare the report with the brief's acceptance criteria and the user's follow-ups. If a criterion has no stated verification, or a follow-up has no outcome, send `COMPLETION CHECK: <those items>` to the worker once, and relay the report that follows whatever it says. With `guided`, send no completion check.
- **Result.** Lead with what was achieved and how it was verified. Then always write a "Decided for you:" line: copy every item of the report's `decided for the user` block, so each can be reversed with a follow-up, or write "Decided for you: nothing" when the block says `none`. Never drop the line.

## Loop guard

In every mode, never keep an objective going by yourself.

- Send at most one `COMPLETION CHECK` per objective.
- After a `blocked` report under `full`, send nothing more: relay it and end.
- Two consecutive `checkpoint` reports that asked for a bare `CONTINUE`, with a bare `CONTINUE` from you between them, are a stall only when nothing advanced: compare the `progress` objects (tasks, facts, error signatures, done and open items) and the follow-up outcomes. Identical `tasks` lines alone do not establish a stall. If nothing advanced, do not send `CONTINUE` again; relay the latest report as `blocked` and say it stopped making progress.
- User answers or approvals, completion-check responses and terminal reports are never stalled merely because their task lists match.

## Stop and errors

When the user asks to stop, `write_agent` `CANCEL` to the affected worker and tell the user that the host's own stop control (Esc or `/tasks` in the CLI, the stop button in the app) halts running agents immediately. Do not say work stopped until a report or the host confirms it. Relay host errors accurately. If the preferred model is unavailable, use a supported host fallback and say so; do not claim a fallback ran without evidence.

Finish every relay of `done`, `blocked`, `cancelled` or a plan awaiting approval with the `CONCIERGE-RESULT` last line your profile defines.
