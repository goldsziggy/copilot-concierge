# Concierge

<img src="assets/concierge-copilot.png" alt="Concierge robot receptionist in navy, white and teal" width="128" align="right">

Tell Concierge what you want to get done. It brings in the right specialists, helps shape a plan, coordinates the work and comes back with results you can check.

Concierge is a native plugin for **GitHub Copilot CLI and the GitHub Copilot app**. It uses Copilot's agents, skills and permissions. You need a signed-in Copilot account with access to the configured models; the defaults are GPT-6 Luna and GPT-6.1 Sol.

## Get started

From your project folder:

```sh
copilot plugin marketplace add goldsziggy/copilot-concierge
copilot plugin install copilot-concierge@copilot-concierge
copilot --agent copilot-concierge:concierge
```

Then give it a goal:

> Make the basket screen easier to use. Follow our existing design system, show me the plan, then implement it and run the relevant tests.

**In the app:** open **Customize → Plugins**, add the `goldsziggy/copilot-concierge` marketplace and install **copilot-concierge**. Open your project, select **concierge** in the agent picker and **GPT-6 Luna** in the model picker, then send your request. Restart the app if a CLI installation does not appear.

Upgrading from 0.4? The entry agent is now **concierge**, replacing **frontdesk**. Update shortcuts and start a fresh session. [Install, update and migrate →](references/install.md)

## A small team behind one conversation

![Orchestration: you talk to Concierge, which routes your goal to an orchestrator. The orchestrator chooses Scout for context and local project notes, planning and UX specialists, and implementation and review specialists. Evidence and questions return through the orchestrator to Concierge.](assets/orchestration.svg)

You stay in one conversation. Concierge relays questions, shows the plan and keeps you updated. Its orchestrator decides which specialists the task needs, coordinates independent work and checks their evidence. A small request does not need the whole team.

- **Scout** finds repository, document and ticket context through tools you already have. It can maintain a small project note so future requests do less rediscovery.
- **Planning and design** specialists clarify requirements, challenge the plan and work with your existing design system.
- **Implementation and review** specialists cover React, Node.js and GraphQL, run focused checks and review changes. An escalation role is available when more help is needed.

Ticket access depends on your existing integrations. Concierge does not bundle a ticket connector or provider credentials.

## You're in control

Concierge asks you to approve a short plan by default. Say “go ahead without asking” to skip that pause, or set `{"planApproval":"auto"}` in `.copilot-concierge/config.json`. Copilot's tool permissions still apply. [Approval settings →](references/approval-preference.md)

**Ship it is optional.** After verified implementation, Concierge can offer to prepare a draft GitHub pull request or GitLab merge request. Accepting starts read-only preflight. Creating the draft requires a separate confirmation of the exact destination, commits, title and body. Ship it uses an existing authorized integration or CLI; it stops if the destination, access or draft capability is unclear. It does not commit, push or merge. Ship it runs through Concierge's orchestrator, not as a standalone skill. [Shipping details →](references/handoff.md#optional-ship-it-decisions)

**Project notes stay small.** Scout uses only `.copilot-concierge/project-notes.md` in the assigned repository: at most 12 sourced facts and 2 KiB. Current files take precedence over these advisory notes. An explicit no-write request disables maintenance; unsafe paths or denied access stop note maintenance. These are local project files, not a synced memory service. [Scout's note rules →](skills/scout/SKILL.md#project-notes)

## Make it yours

Add your organization's agents, skills and routing rules without changing Concierge. Roles use one explicitly configured model with Copilot's required-model policy; an unavailable model is reported. The app's root session model still needs attention in its model picker. [Custom agents and skills →](references/customizing.md) · [Model configuration →](references/install.md#session-local-launcher)

## Verification and limits

Source checks, installation checks and live model sessions are different kinds of evidence. [Runtime verification](references/runtime-verification.md) records their scope, including historical sessions under the old Zilot name. The [capability matrix](references/capability-matrix.md) covers host differences. App smoke tests exercised Scout note creation and refresh, plus a Ship it preflight that stopped safely on a repository without a remote or commits. Live draft creation on GitHub and GitLab, and Windows/Linux model workflows, remain unverified.

The plugin is available through its own marketplace above. An Awesome Copilot listing requires separate maintainer approval and publication.

## Working on Concierge

```sh
npm test
npm run validate
npm run catalog:check
npm run package
```

These source checks make no model calls. Packaging creates a versioned ZIP and checksum under `dist/`. Live Copilot trials use your account's credits.

[Install and remove](references/install.md) · [Sample requests](examples/requests.md) · [Handoff contract](references/handoff.md) · [Distribution](references/distribution.md) · [Release process](references/releasing.md) · [Migration from Zilot](references/migration.md)

## License

Copyright 2026 goldsziggy. The plugin, documentation and included artwork are licensed under [Apache-2.0](LICENSE). See [NOTICE](NOTICE).
