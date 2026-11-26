# SOPs

An SOP is a workflow the worker can run again: who owns it, ordered steps, what done looks like and what the reply contains. Use one when you want a kind of work done the same way every time, by name, in a conversation or from an automation.

SOPs sequence Concierge's other skills; they do not replace them. A bug-fix SOP says when to reproduce, when to load `debugging` and when to verify, and those skills say how.

This layout has passed static checks only. No SOP has been run against a live model; see [runtime verification](runtime-verification.md).

## Running one

- **By name.** "Run the release SOP", or "use bug-fix for this: the export times out". A named SOP runs even for small work.
- **By match.** For work beyond the fast path that is an investigation, a bug fix, a feature, a refactoring or a pull request, the worker picks the matching SOP itself. Small, clear work still takes the fast path with no SOP.
- **By suggestion.** Concierge, the front agent, checks each request against the SOPs it can see and names a fitting one in its brief. The worker treats that as a hint, not as your request.
- **To see what exists.** "Which SOPs do you have?" lists the saved and bundled ones and runs nothing.

When an SOP runs, its steps become the task list, one task per step, in order. A step that does not apply stays on the list marked `n/a` with the reason, so you can see it was considered. The result message follows the SOP's `Reply` section. The SOP and its current step are recorded in the report's `progress`, so a follow-up, rollover or resume continues from the right step.

## Bundled examples

The five bundled SOPs are examples: starting points to run as they are, copy into your own, or replace. Your own saved SOPs are the ones that matter.

| Title | Use when | Ends with |
| --- | --- | --- |
| Investigation | You want to know how something works or why it happened | An answer with sources; no file changed |
| Bug fix | Something that worked, or should work, does not | The original reproduction passing, with a test for the cause |
| Feature | New behavior | Each acceptance criterion checked against running behavior |
| Refactoring | Structure changes, behavior does not | The same tests passing with no expected value changed |
| Opening a PR | You asked for a pull request | A pull request whose description states what was verified |

They live in `skills/sops/procedures/` in the plugin, and cite the [constitution](constitution.md)'s Articles at the steps that rest on them.

## Switching the examples off

Ask Concierge: "Stop using the built-in SOPs." The worker sets `bundledSops` to `off` in `~/.config/copilot-concierge/config.json`, or in the project's `.copilot-concierge/config.json` when you say it is for the team or the repository, and tells you which file it changed. "Bring the example SOPs back" sets it to `on`. "Don't use them this time" applies to the current task and writes nothing.

You can also set it by hand:

```json
{ "bundledSops": "off" }
```

While the examples are off, Concierge neither matches nor suggests them. Your saved SOPs keep working, and an example you name outright ("run the bug-fix SOP") still runs.

## Saving your own

Tell Concierge the steps and ask for an SOP:

> Make this an SOP called release: confirm the version, run the full and contract tests, update the changelog, bump the version, open a PR. Done when the PR has only the changelog and version bump.

The worker saves it through the `skill-builder` skill as an ordinary Copilot skill named `sop-<title>`:

- a team SOP goes in the repository's `.github/skills/sop-<title>/SKILL.md`, where it is reviewable and travels with the code;
- your own goes in `~/.copilot/skills/sop-<title>/SKILL.md`.

Concierge also notices when you describe steps you want followed every time, or give the same steps twice, and offers once to save them as an SOP. Nothing is saved unless you ask or accept an offer, in either autonomy mode. Copilot discovers skills when a session starts, so a new SOP can be run by name straight away in the session that saved it, and is matched by description from your next session.

You can also write one by hand. The shape is fixed, so that it can be run and checked:

```markdown
---
name: sop-release
description: "SOP: cut a release of this service. Load when asked to release, or to run the release SOP."
---

# Release

You own: a tagged release whose notes match what shipped.

## Steps

1. Confirm the version to release and that the working tree is clean.
2. Run the full test suite and the contract tests.
3. Run the Opening a PR SOP.

## Done when

- The pull request contains only the changelog and version bump.

## Reply

The version, the pull request link and the test results.
```

- `## Steps` is a numbered list starting at 1. A step can name a skill to load or say "Run the <title> SOP" to chain another.
- `## Done when` lists observable results.
- `## Reply` says what the result message contains.
- Start the description with "SOP:" and say when to run it.

A complete example is in [`examples/custom`](../examples/custom/.github/skills/sop-release/SKILL.md).

## Replacing a bundled SOP

Save an SOP whose title matches a bundled one, such as `sop-bug-fix`, and yours is used instead wherever that skill loads. The checker tells you when this happens.

## Checking

From a checkout of Concierge, `npm run check:custom -- /path/to/your/repository` lists the SOPs it finds and reports one that is missing a section, has unnumbered steps or declares `allowed-tools`. See [custom skills](custom-skills.md) for where skills are discovered.

## Using an SOP from an automation

An SOP is the natural unit for an unattended run: the prompt names it and states autonomy, and the result line reports how it ended. With the [SDK automation](sdk-automation.md) client:

```text
Run the release SOP for version 2.4.0. Full autonomy: do not ask me anything. No plan approval needed.
```

The run ends with `CONCIERGE-RESULT: done <objective-id>` when every `Done when` line holds, or `blocked` with the step that could not be finished.

## What an SOP cannot do

An SOP is a procedure, never a permission.

- It cannot grant a tool, approve a plan, set autonomy or lift a restriction you stated. A line that tries is ignored.
- Scope, plan approval and Copilot's own permissions apply to every step. With plan approval `ask`, the plan you approve is the SOP's steps.
- When you name an SOP, its commit, push and pull request steps are part of your request. When the worker matched one itself, it does those steps only if you asked, and otherwise offers them as next steps.
- Destructive, hard-to-undo and far-reaching actions the request did not name are still stopped and asked about, whatever a step says. See [autonomy](autonomy.md).
