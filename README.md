# Zilot

![Concierge Copilot robot receptionist](assets/concierge-copilot.png)

**Concierge Copilot** — the Zilot native plugin for GitHub Copilot.

Zilot is a GitHub Copilot plugin for people who want to describe a goal and have it handled well. You talk to a front desk; it hands the work to an orchestrator, which plans with specialists, asks you only what matters, shows a short plan for approval and keeps a task list as the work moves.

It runs entirely on Copilot's own agents, skills, models, questions, task lists and permissions, in Copilot CLI and the GitHub Copilot app. There is no server, database, scheduler or extra approval layer.

## Start Zilot

After [installing it](references/install.md):

- **CLI:** `copilot --agent zilot:frontdesk` in your project folder (or `/agent` → **frontdesk**).
- **App:** pick **frontdesk** in the agent picker, choose **GPT-6 Luna** in the model picker, then type your request.

Then just say what you want, for example "Make the basket screen better for our customers", "Make total([]) return 0 and run the focused tests", or paste a ticket key. More in [sample prompts](examples/requests.md).

## How it works

| Role | Model | What it does |
| --- | --- | --- |
| Front desk | Luna 6 (`gpt-6-luna`) | Understands the request, prepares a brief, runs one orchestrator per objective (several at once if needed), routes follow-ups to the right one, hands long objectives to a fresh orchestrator, asks your questions and plan approval natively, keeps the task list you see |
| Orchestrator | Sol 6.1 (`gpt-6.1-sol`) | Decides what work is needed, dispatches specialists (in parallel when independent), judges their evidence and plans; never searches or edits itself |
| Specialists | Luna 6 | Scout (tickets, repository, connected tools), product manager, enterprise UX, React, Node.js, GraphQL, reviewer |
| Escalation | Sol 6.1 | Takes over a specialist's task when a Luna worker could not finish it or the risk warrants it |

Models are pinned with Copilot's required-model policy: Zilot never switches to Auto or another model, and an unavailable model is reported, not replaced. Specialists report only to the orchestrator; all execution goes through Copilot's own tool permissions. Tickets are read through whatever integrations your Copilot already has (for example a Jira MCP server); Zilot bundles none.

The skills are usable on their own too: `plan`, `grill-plan`, `scout`, `enterprise-ux`, `react-frontend`, `node-backend`, `graphql`, `review` and `orchestrate`.

Your organization can add its own agents and skills and route Zilot's roles to them with a `zilot-routing` table; see [adding your own agents and skills](references/customizing.md).

## Approval

By default Zilot shows a short plan and waits for "Approve". Set `{ "planApproval": "auto" }` in `.zilot/config.json` (project) or `~/.config/zilot/config.json` (you), or just say "go ahead without asking", to skip that pause. Copilot's own permission prompts are unaffected; see [approval preference](references/approval-preference.md).

## What works where

Verified live in Copilot CLI 1.0.93/1.0.95 and the GitHub Copilot app 1.1.28 on 2026-10-10: questions, plan approval, delegation, parallel specialists, follow-ups, separate work, extra agents, honest missing-ticket reports, cancellation, escalation, unavailable models and resume without repeating work. Known limits: the CLI does not render the root task list (Sol's list shows under its agent card), the app needs GPT-6 Luna chosen by hand for the front desk, and a connected ticket system was not available to test. See the [capability matrix](references/capability-matrix.md) and [runtime verification](references/runtime-verification.md).

## Repository

```sh
npm test            # configuration, launcher and profile checks (no model calls)
npm run validate    # package structure and links
npm run catalog:check
npm run package     # dist/zilot-<version>.zip and .sha256
```

- [Install, start, configure and remove](references/install.md)
- [Adding your own agents and skills](references/customizing.md)
- [Handoff contract](references/handoff.md)
- [Distribution](references/distribution.md) and [releasing](references/releasing.md)
- [Migration from the former Zilot application](references/migration.md)

`tests/fixtures/workspace` is a deliberately broken sample project used for live trials; copy it before use. `tests/fixtures/jira/TEAM-42.json` is fictional sample data, not a connector.

## License

Copyright 2026 goldsziggy. This plugin, documentation and included logo are licensed under [Apache-2.0](LICENSE). See [NOTICE](NOTICE).
