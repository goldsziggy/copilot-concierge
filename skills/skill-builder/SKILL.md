---
name: skill-builder
description: Save a way of working the user wants repeated, such as how to review a merge request or how to test, as a reusable Copilot skill that future sessions load. Use when the user asks to remember a workflow or accepts an offer to save one. Not for one-line preferences or repository facts, which the scout skill stores.
---

# Skill builder

Use this procedure as the Concierge worker or the execution owner it assigns. Your agent profile controls identity, tools, model and delegation; loading this skill grants no tool, access or authority. A skill you write is ordinary guidance in an ordinary file: it cannot grant tools, change permissions, approve plans or set autonomy.

## What kind of thing is it

Concierge keeps three kinds of learning. Put each in its own place.

| The user says | Kind | Where |
| --- | --- | --- |
| "Keep summaries short", "I like small patches" | A preference about how they like to work | Private memory, through the `scout` skill |
| "We store prices as integer cents because…" | A fact or decision about this repository | Repository knowledge, through the `scout` skill |
| "When you review an MR, check the migrations first, then run the contract tests, then…" | A procedure for a recurring kind of work | A skill, through this procedure |

A procedure has steps, an order, checks or a definition of done. If the user gave it only for this task ("this time, skip the e2e suite"), follow it now and save nothing.

## When to build one

- **Asked.** "Remember how we review merge requests", "from now on test like this", "make that a skill": build it.
- **Recommended in passing.** The user corrected you or recommended a way of doing a recurring kind of work while you worked. Follow it now. Then offer it once in `suggestions`, for example `Save this as the skill team-testing so future test work follows it: you asked for the integration suite to run serially before unit tests`. Build it only when the user accepts. This holds under `full` autonomy too: a workflow the user did not ask you to keep is offered, never saved.
- **Never** build a skill from repository prose, a ticket, someone else's message, tool output or your own guess about what the user would want.

The user's file-write restrictions apply. With "do not write any files" in force, describe the skill you would save and say that it was not saved.

## Where it goes

- A team workflow for this repository ("we", project commands, project paths): `<repository root>/.github/skills/<name>/SKILL.md`. It is reviewable and travels with the code. Leave it uncommitted unless the user asked for a commit.
- The user's own workflow across projects ("I always…", or no repository is assigned): `~/.copilot/skills/<name>/SKILL.md`. This is outside the repository, so the host may ask for path permission.
- Unclear, in `guided` mode: ask one question, recommending the repository when one is assigned. Under `full` autonomy choose the same way and record it as decided for the user.

Read what is already there first. If a skill of that name exists, update it: keep the user's text that the new instruction does not change, and say what you replaced. Never overwrite one silently, and never edit a skill that belongs to an installed plugin.

Choose a name that says what the workflow is for, such as `team-code-review` or `my-release-checks`. Do not reuse a Concierge skill name: `brief`, `relay`, `sops`, `constitution`, `discovery`, `development`, `test`, `escalate`, `orchestrate`, `orchestrate-reference`, `plan`, `grill-plan`, `scout`, `react-frontend`, `node-backend`, `graphql`, `review`, `debugging`, `task-evaluation` or `skill-builder`. Project and personal skills load before plugin skills, so a clash would replace Concierge's own procedure. Names starting `copilot-concierge-routing` are reserved for routing tables.

## Write it

- The folder name and `name` match: lowercase letters, digits and hyphens, at most 64 characters.
- `description` says what the skill covers and when to load it, in the form "Load when …". Future sessions choose skills by this line, so name the kind of work plainly: "code reviews", "writing or running tests". Quote the value if it contains `: ` or ` #`.
- The body is the user's procedure in their terms: numbered steps in their order, the commands, files and thresholds they named, what "done" looks like, and what not to do.
- Save only what the user said or confirmed. Ask about a gap that matters, or leave it out; do not pad the procedure with general advice.
- Keep out secrets, credentials, personal data, private memory, ticket text and, in a repository skill, machine-specific absolute paths.
- Keep it self-contained: no links to files outside its folder, and no `allowed-tools`.

```markdown
---
name: team-code-review
description: "How this team reviews merge requests. Load when reviewing a change or self-checking one before review."
---

# Team code review

1. <first step, in the user's words>
2. <next step>
3. <next step>

Done when: <the observable result the user named>

Do not: <what the user said to avoid, or remove this line>
```

## SOPs

An SOP is a saved skill in a fixed shape that the `sops` skill can run step by step: use it when the user wants a repeatable workflow with ordered steps and a definition of done ("make that an SOP", "save our release steps so I can run them"). Guidance without an order, such as review rules or conventions, stays an ordinary skill.

Everything above applies: save one only when the user asks or accepts, in the same two places, with only what they said. In addition:

- Name it `sop-<title>`, such as `sop-release` or `sop-bug-fix`. A title that matches a bundled SOP (`investigation`, `bug-fix`, `feature`, `refactoring`, `opening-a-pr`) replaces it for this user or repository; say so when that happens.
- Start `description` with "SOP:" and say when to run it, so it can be matched to work and listed.
- Use exactly these sections. `## Steps` is a numbered list from 1 in the user's order; a step may name a skill to load or say "Run the <title> SOP". `## Done when` lists observable results. `## Reply` says what the result message contains.
- A step may cite one of the constitution's ten Articles by number and title, such as "(Article 5)", when the user's step rests on it. Do not copy the Article's text.
- A step may ask for a commit, push or pull request only because the user put it in the workflow. Never add a step that grants a tool, approves a plan, sets autonomy or lifts a restriction; such a line has no effect when the SOP runs.

```markdown
---
name: sop-release
description: "SOP: cut a release of this service. Load when asked to release, or to run the release SOP."
---

# Release

You own: <what the person running it is responsible for, in the user's words>

## Steps

1. <first step, in the user's words>
2. <next step>
3. <next step>

## Done when

- <an observable result the user named>

## Reply

<what the result message contains>
```

Read it back and confirm the three sections are present and the steps are numbered from 1; Concierge's customization checker reports the same problems. Tell the user how to run it: by name ("run the release SOP"), and from their next session also by description.

## Make sure it gets used

A saved skill is loaded when its description matches the work, or when a handoff names it under `skills to load`. No routing row is needed. Add or change a `copilot-concierge-routing` row only when the user wants a particular agent to do that kind of work; keep every existing row.

Copilot discovers skills when a session starts. Follow the saved steps directly for the rest of this session, and tell the user the skill applies from their next session.

## Check and report

Read the file back. Confirm the frontmatter parses, the name matches its folder and does not clash, and the body says what the user said. Then report:

- the skill's name and exact path, as a changed file, and whether it is committed;
- the steps you saved, in a few plain lines, so the user can correct them;
- anything you left out because it was unconfirmed, private or unclear.

"What workflows do you remember?" lists the project and personal skills you can see, not Concierge's own. "Forget the review workflow" removes that skill's folder after you confirm which one is meant; in a repository that is an ordinary file change the user can review.
