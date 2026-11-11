# Archived: external-session protocol

Retired after Concierge 0.10.0. It is kept here for reference and is not loaded, validated or supported.

## What it was

An external session is a coding session the orchestrator starts but cannot read back through its own agent tools, such as a cloud coding agent. The protocol let the Concierge entry agent launch such a session, collect its result and relay it to the orchestrator, with an owner binding, a collector, a return route and tracked receipt states.

## Why it was retired

- It never ran in a live trial.
- It was the most intricate part of both profiles, and its text was loaded on every entry-agent call.
- Work is done by native sub-agents, and cloud automation is a Copilot SDK client that drives the plugin from outside. See `references/sdk-automation.md`.

## What is here

- `external-sessions.skill.md`: the orchestrator-side skill, unchanged apart from its file name. It is renamed so that Copilot and the package validator do not treat it as a skill.

## Restoring it

The skill alone is not enough. The rest of the protocol lived in these places at tag `v0.10.0`:

- `com.github.copilot/agents/concierge.agent.md`: the "External sessions" section, the owner-binding paragraph, and the external clauses of the loop guard and the `checkpoint` step.
- `com.github.copilot/agents/orchestrator.agent.md`: the "External sessions" paragraph, the `returns` line of the report, and the `owner`, `collector`, `return route` and `session` lines of the handoff template.
- `references/handoff.md`: the "External-session returns and recovery" section.
- `tests/profiles.test.mjs`: the contract tests for collection, receipts and recovery.

To restore, move the skill back to `skills/external-sessions/SKILL.md`, recover those passages with `git show v0.10.0:<path>`, add the name to `CONCIERGE_SKILLS` and the skill count in `scripts/validate.mjs`, and run a live trial before documenting it as supported.
