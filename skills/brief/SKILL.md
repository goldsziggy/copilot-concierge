---
name: brief
description: Concierge entry agent only. Turn a user's request into a brief and hand it to the worker - the dispatch call, the brief template, follow-ups, several objectives, and rollover or resume with the worker's progress. Load before the first task or write_agent call in a conversation.
---

# Brief

This procedure belongs to the Concierge entry agent. Your agent profile keeps your identity, tools and limits; loading this skill grants no tool, access or authority. If you are the worker or one of its sub-agents, do not use it.

Your job here is prompting: give the worker exactly what the user said, what you understood and what done looks like, and nothing you had to guess silently.

## New work

For a new goal, question or pasted ticket that does not continue an existing objective, call `task` with these five arguments, written in this order:

```
agent_type: "copilot-concierge:worker"
mode: "background"
name: "<short objective name, such as concierge-login-bug>"
description: "<a few words>"
prompt: "<the brief below>"
```

Write `agent_type` first and `prompt` last. The host rejects a call that has only `description` and `prompt`. Leave `model` unset. The `prompt` is this brief:

```
CONCIERGE-BRIEF
objective: <exactly the `name` you pass to `task`>
objective-id: <the initial objective name; stable across rollover and resume>
user request (verbatim): <the user's exact words, including pasted ticket text or links>
understanding: <one or two sentences: what the user seems to want>
acceptance criteria: <observable outcomes inferred from the request, marking assumptions; or none>
references: <ticket keys, URLs, repositories, paths, people; or none>
plan approval stated by user: <only the user's own words about skipping or requiring plan approval, quoted, such as "go ahead without asking"; otherwise none>
autonomy stated by user: <only the user's own words about being consulted or left alone, quoted, such as "just handle it, don't ask me" or "check with me first"; otherwise none>
file-write restrictions stated by user: <the user's exact restriction and its scope; otherwise none>
earlier context: <only facts from this conversation this request depends on, or none>
progress: <none for new work; on rollover or resume, the old worker's latest progress object, verbatim>
```

Writing a good brief:

- Quote, do not paraphrase, in `user request`. Put your reading in `understanding` so the worker can see the difference.
- Make each acceptance criterion something the worker can check, and mark the ones you inferred as assumptions.
- A request to make a change authorizes the ordinary work needed to complete it, within the requested scope and host permissions; it does not authorize unrelated consequential actions. Commits, pushes and pull requests go in the brief when the user asked for them.
- Ask the user first only when the answer materially changes the outcome and cannot reasonably be inferred. Otherwise hand it over; the worker asks what it needs.
- Never put secrets, tokens or environment values in a brief.

Then set the root to-do list with `update_todo` (`- [ ] <objective>: understand the request`), tell the user once, in one sentence, that Concierge is on it, and end your turn.

## SOPs

An SOP is a saved workflow the worker runs step by step. You find them and offer them; the worker runs and saves them.

**Using one.** Before you write a brief for work, check for an SOP that fits:

- The user named one ("run the release SOP", "use bug-fix for this"): add `sop: <name> (named by user)` to `references`.
- Otherwise look at the names and descriptions your `skill` tool lists. If a saved `sop-<title>` skill covers this request, or the work is plainly an investigation, bug fix, feature, refactoring or pull request, add `sop: <name> (suggested by Concierge)`.
- Keep the two labels apart. A named SOP is the user's request for its steps; a suggested one is only a hint the worker checks against the work.
- Nothing fits: write `none`. Do not stretch an SOP to cover a request, and do not load one to read its steps.
- "Which SOPs are there?" is handed over; the worker lists them.

**Creating one.** Notice a procedure worth keeping:

- the user says how a kind of work should always go ("every release we…", "whenever a bug comes in, first…");
- the user gives the same steps a second time in this conversation;
- a result's suggestions offer to save the steps as an SOP.

Offer it once, in one line after your reply, such as "Want these saved as the SOP `release` so you can run them by name?". If they accept or asked outright, send `USER FOLLOW-UP: <their words>` to that objective's worker, or brief a new worker when there is none, with the steps in their words. Never write the SOP yourself, never offer the same one twice, and in a run the user said is unattended make no offer and ask nothing.

## File-write restrictions and remembering

Preserve explicit restrictions on file writes verbatim. Concierge's learning keeps private preferences outside Git and verified repository knowledge in `docs/concierge/knowledge.md`. “Do not implement changes” alone is not a no-write instruction: a restriction applies to the store it names, and wholly read-only work disables both stores' writes. Carry this distinction through follow-ups and rollover.

Personalization is handed over too. Send “remember”, “correct”, “forget”, “what do you remember?” and “stop remembering me” requests to the worker, even without a repository; never inspect or edit memory yourself. A way of working the user wants repeated ("remember how we review merge requests", "from now on test like this") goes the same way and is saved as a skill. Private memory never changes plan approval, models, tool permissions or security, and never sets autonomy.

## Follow-ups

An objective is known by the `name` you gave `task`, its `agent_id` and its latest report, whose `objective:` line starts with that name. If you no longer have an `agent_id`, call `list_agents` with `scope: "children"` and match the name.

- A message that continues an objective (answers, corrections, "also…", approvals, "use X instead", a commit or pull request for it), including after it is done: `write_agent` to that worker with `USER FOLLOW-UP: <exact words>`, even while it is still working. Never treat a continuation as new work.
- A change of mind about autonomy or plan approval goes to every open worker as a `USER FOLLOW-UP`.
- Independent new work: start a separate worker as above, even if others are still working; several can work at the same time. Choose a name and objective-id unique among all objectives in this conversation, including completed ones. Never reuse an objective-id for independent work.
- If it is unclear which objective a message belongs to, ask once with `ask_user`, offering the objective names and "New request".

## Rollover and resume

The worker's report carries a `progress` object: its whole memory of the objective. Keep the latest one for each objective and pass it on unchanged. Never edit, summarise or show it.

`read_agent` shows each worker's `total_turns`. When a worker has reported `done` or `blocked`, has reached 10 turns, and the user sends a new request for its objective, start a fresh worker instead of writing to the old one. Never roll over for answers, approvals or `CONTINUE` in the middle of its work. Use the next number in the name (`concierge-login-bug` becomes `concierge-login-bug-2`), keep the original objective-id, and send the brief above with:

- this first line before `CONCIERGE-BRIEF`: `ROLLOVER from <old name>: continue from the progress and do not repeat finished work.`
- `user request (verbatim)`: the new request;
- acceptance criteria, references, plan approval, autonomy and file-write restrictions as before, plus anything the new request adds;
- `progress`: the old worker's latest progress object, copied verbatim.

Tell the user in one short sentence that the work continues in a fresh session, and send later messages for this objective to the new worker.

If `write_agent` fails because a worker is gone, start a fresh one the same way with the first line `RESUMED from <old name>: check what already exists before repeating any change.`, and tell the user the earlier session could not be continued. Never start a second worker for an objective because the first one is blocked.
