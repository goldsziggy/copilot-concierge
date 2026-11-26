# Playbooks

A playbook is a workflow the worker can run again: who owns it, ordered steps, what done looks like and what the reply contains. Use one when you want a kind of work done the same way every time, by name, in a conversation or from an automation.

Playbooks sequence Concierge's other skills; they do not replace them. A bug-fix playbook says when to reproduce, when to load `debugging` and when to verify, and those skills say how.

This layout has passed static checks only. No playbook has been run against a live model; see [runtime verification](runtime-verification.md).

## Running one

- **By name.** "Run the release playbook", or "use bug-fix for this: the export times out". A named playbook runs even for small work.
- **By match.** For work beyond the fast path that is an investigation, a bug fix, a feature, a refactoring or a pull request, the worker picks the matching playbook itself. Small, clear work still takes the fast path with no playbook.
- **To see what exists.** "Which playbooks do you have?" lists the saved and bundled ones and runs nothing.

When a playbook runs, its steps become the task list, one task per step, in order. A step that does not apply stays on the list marked `n/a` with the reason, so you can see it was considered. The result message follows the playbook's `Reply` section. The playbook and its current step are recorded in the report's `progress`, so a follow-up, rollover or resume continues from the right step.

## Bundled playbooks

| Title | Use when | Ends with |
| --- | --- | --- |
| Investigation | You want to know how something works or why it happened | An answer with sources; no file changed |
| Bug fix | Something that worked, or should work, does not | The original reproduction passing, with a test for the cause |
| Feature | New behavior | Each acceptance criterion checked against running behavior |
| Refactoring | Structure changes, behavior does not | The same tests passing with no expected value changed |
| Opening a PR | You asked for a pull request | A pull request whose description states what was verified |

They live in `skills/playbooks/playbooks/` in the plugin.

## Saving your own

Tell Concierge the steps and ask for a playbook:

> Make this a playbook called release: confirm the version, run the full and contract tests, update the changelog, bump the version, open a PR. Done when the PR has only the changelog and version bump.

The worker saves it through the `skill-builder` skill as an ordinary Copilot skill named `playbook-<title>`:

- a team playbook goes in the repository's `.github/skills/playbook-<title>/SKILL.md`, where it is reviewable and travels with the code;
- your own goes in `~/.copilot/skills/playbook-<title>/SKILL.md`.

Nothing is saved unless you ask or accept an offer, in either autonomy mode. Copilot discovers skills when a session starts, so a new playbook can be run by name straight away in the session that saved it, and is matched by description from your next session.

You can also write one by hand. The shape is fixed, so that it can be run and checked:

```markdown
---
name: playbook-release
description: "Playbook: cut a release of this service. Load when asked to release, or to run the release playbook."
---

# Release

You own: a tagged release whose notes match what shipped.

## Steps

1. Confirm the version to release and that the working tree is clean.
2. Run the full test suite and the contract tests.
3. Run the Opening a PR playbook.

## Done when

- The pull request contains only the changelog and version bump.

## Reply

The version, the pull request link and the test results.
```

- `## Steps` is a numbered list starting at 1. A step can name a skill to load or say "Run the <title> playbook" to chain another.
- `## Done when` lists observable results.
- `## Reply` says what the result message contains.
- Start the description with "Playbook:" and say when to run it.

A complete example is in [`examples/custom`](../examples/custom/.github/skills/playbook-release/SKILL.md).

## Replacing a bundled playbook

Save a playbook whose title matches a bundled one, such as `playbook-bug-fix`, and yours is used instead wherever that skill loads. The checker tells you when this happens.

## Checking

From a checkout of Concierge, `npm run check:custom -- /path/to/your/repository` lists the playbooks it finds and reports one that is missing a section, has unnumbered steps or declares `allowed-tools`. See [custom skills](custom-skills.md) for where skills are discovered.

## Using a playbook from an automation

A playbook is the natural unit for an unattended run: the prompt names it and states autonomy, and the result line reports how it ended. With the [SDK automation](sdk-automation.md) client:

```text
Run the release playbook for version 2.4.0. Full autonomy: do not ask me anything. No plan approval needed.
```

The run ends with `CONCIERGE-RESULT: done <objective-id>` when every `Done when` line holds, or `blocked` with the step that could not be finished.

## What a playbook cannot do

A playbook is a procedure, never a permission.

- It cannot grant a tool, approve a plan, set autonomy or lift a restriction you stated. A line that tries is ignored.
- Scope, plan approval and Copilot's own permissions apply to every step. With plan approval `ask`, the plan you approve is the playbook's steps.
- When you name a playbook, its commit, push and pull request steps are part of your request. When the worker matched one itself, it does those steps only if you asked, and otherwise offers them as next steps.
- Destructive, hard-to-undo and far-reaching actions the request did not name are still stopped and asked about, whatever a step says. See [autonomy](autonomy.md).
