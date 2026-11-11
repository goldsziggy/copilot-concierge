# Concierge

<img src="assets/concierge-copilot.png" alt="Concierge robot receptionist in navy, white and teal" width="128" align="right">

Tell Concierge what you want done. It briefs a working lead, keeps you informed in one conversation, and comes back with a result you can check.

Concierge is a native plugin for **GitHub Copilot CLI and the GitHub Copilot app**. It adds no service, no credentials and no permission bypass: it is agent profiles and skills that run on Copilot's own agents, tools and permissions.

The main branch tracks **0.11.1**. For a published build, see the [latest GitHub release](https://github.com/goldsziggy/copilot-concierge/releases/latest); main may contain changes not yet included there.

## Why choose Concierge

**You talk to one agent, not a crowd.** Concierge takes your goal, asks only what it needs, and relays the plan and the result. The planning, coding and reviewing happen behind it, so your conversation stays short and readable.

**Small work stays small.** A clear, bounded change takes a fast path: the working lead does it in one pass with no skill loaded and no extra agent. Larger work gets a plan, the relevant skills, and a specialist only when a separate context earns its cost.

**Results you can check.** A result says what changed, which checks ran and what they showed. Risky changes get an independent reviewer. When something only you can supply is missing, Concierge reports `blocked` with exactly what it needs instead of guessing or working around it.

**You choose how involved to be.** By default it is `guided`: it asks, shows the plan and pauses between phases. Say "just handle it" and it runs to a verified result, then lists every choice it made under "Decided for you" so you can reverse one. Copilot's own tool permissions apply either way.

**It learns how you and your team work.** Preferences, project facts and whole workflows ("remember how we review merge requests") are saved where you can read and edit them, and reused in later sessions.

**It fits your organization.** Add your own agents, skills and routing rules in the places Copilot already reads. Concierge uses them without being modified.

**It can run unattended.** A cloud agent built on the Copilot SDK loads the same plugin, states the task, and reads a one-line result.

### Measured, not promised

We compared 0.11.1 with 0.7.1 on the same two tasks, two runs each, through the Copilot SDK on Copilot CLI 1.0.109 with a narrow permission allowlist. Results were graded by independent probes, not by the agent's own report.

| Task | Version | Solved | Model calls | Input tokens | Time |
| --- | --- | --- | --- | --- | --- |
| Small: one-line fix and a test | 0.7.1 | 2 of 2 | 17–22 | 385k–511k | 2m 21s – 2m 54s |
| Small | 0.11.1 | 2 of 2 | 11 | 188k–189k | 1m 20s – 1m 22s |
| Medium: four-file feature, tests, docs and review | 0.7.1 | 1 of 2 | 34 | 794k | 5m 17s |
| Medium | 0.11.1 | 2 of 2 | 21–27 | 416k–564k | 3m 22s – 4m 58s |

The medium figures for 0.7.1 are for its one completed run; the other gave up after its chained shell commands were denied. Where both versions finished, the code they produced was equivalent. This is a small sample under unattended conditions, which favor the current version. [Full method and results →](references/runtime-verification.md)

**When not to use it.** For a quick question or a one-line edit you can describe exactly, ask Copilot directly. Concierge's smallest task still takes about eleven model calls and over a minute, because a lead plans, verifies and reports.

## Get started

From your project folder:

```sh
copilot plugin marketplace add goldsziggy/copilot-concierge
copilot plugin install copilot-concierge@copilot-concierge
copilot --agent copilot-concierge:concierge
```

Then give it a goal:

> Make the basket screen easier to use. Follow our existing design system, show me the plan, then implement it and run the relevant tests.

**In the app:** open **Customize → Plugins**, add the `goldsziggy/copilot-concierge` marketplace and install **copilot-concierge**. Open your project, select **concierge** in the agent picker and **Copilot Fusion** in the model picker, then send your request. Restart the app if a CLI installation does not appear.

**Models.** You need a signed-in Copilot account. Concierge prefers **Copilot Fusion** for the conversation (Copilot CLI 1.0.104 or later). Its working lead and specialists keep GPT-6.1 Sol and GPT-6 Luna, because Fusion does not route sub-agents. [Models →](references/install.md#models)

Upgrading from 0.4? The entry agent is now **concierge**, replacing **frontdesk**. Update shortcuts and start a fresh session. [Install, update and migrate →](references/install.md)

## How it works

![You talk to Concierge, which briefs Sol, the working lead. Sol takes a fast path for small work, plans and loads skills for larger work, and brings in specialists when a separate context pays. Every result is verified, lists what was decided for you, suggests next steps and ends with a result line. Guided mode, full autonomy and SDK automation use the same plugin.](assets/orchestration.svg)

**Concierge** is the agent you talk to. It writes a brief, starts a working lead for each objective, relays questions and plans, and reports the result. It never reads your repository or writes code itself.

**Sol**, the working lead, owns the objective: the plan, the work, the checks and the claim that it is done. It picks the lightest path that finishes the job:

- **Fast path.** For a clear, bounded change it reads what it needs, makes the change, runs the named checks and reports. No skill is loaded and no worker is started.
- **Plan and skills.** For larger or unclear work it states the outcome and its checks first, then loads the procedures the work needs: React, Node.js, GraphQL, debugging, planning, or a workflow you saved. One owner keeps a feature and its tests together across layers.
- **Specialists.** It delegates when a separate context earns its cost: a **worker** for owned implementation, a **reviewer** for an independent check of meaningful or risky changes, a **scout** for substantial repository, document or ticket discovery, and an **escalation** role when more help is needed. Each gets a written handoff and returns evidence, which Sol checks before accepting it.

Skills are procedures; they do not grant tools or permissions. Ticket access depends on your existing integrations: Concierge bundles no connector or credentials. [Handoff contract →](references/handoff.md)

Two procedures are loaded only when asked for or needed:

- **Debugging** reproduces a fault, tests competing explanations and verifies a minimal fix.
- **Task evaluation** compares a baseline and a candidate on outcomes, constraints, time and usage. Live trials need an explicit budget. [Comparative evaluation →](references/comparative-evaluation.md)

## You're in control

**Guided by default.** Concierge asks focused questions, shows a short plan and continues. Set `{"planApproval":"ask"}`, or ask for a plan-only review, to approve the plan before any work starts. Copilot's tool permissions and your explicit restrictions always apply. [Approval settings →](references/approval-preference.md)

**Hand the whole task over.** Say "just handle it, don't ask me", or set `{"autonomy":"full"}` in the project file or `COPILOT_CONCIERGE_AUTONOMY=full`. Concierge settles ordinary questions itself and carries the task to a verified result. It still stops, with a precise `blocked` report, for a missing credential, a destructive or outward-facing action you did not ask for, or a choice that would be costly to reverse. Plan approval `ask` is never overridden. [Autonomy →](references/autonomy.md)

**Every result tells you the same things:**

- what was done and how it was verified;
- **Decided for you:** each choice it made on your behalf under full autonomy, so you can reverse one with a follow-up;
- up to three suggested next steps grounded in the work, such as a check that did not run or committing the changes. Nothing starts until you accept one;
- a last line, `CONCIERGE-RESULT: <done|blocked|cancelled|needs_approval> <objective-id>`, that scripts can read.

**Automate it with the Copilot SDK.** A cloud agent or job service is a [Copilot SDK](https://github.com/github/copilot-sdk) client. It loads this plugin, selects the `concierge` agent, states full autonomy in the prompt and waits for the result line. Concierge itself stays a plugin. [SDK automation →](references/sdk-automation.md)

**Commits and pull requests are just requests.** Ask Concierge to commit, push or open a pull request, in the original request, as a follow-up or as a plan step, and it does it with your existing Git and GitHub tools. Copilot's tool permissions decide each command. Without such a request, Concierge leaves changes uncommitted and tells you so.

**Tasks show in Copilot's todo view.** Each objective's checklist is also written to the session's todo tables, so the app's built-in plan and todo views show Concierge's progress.

## What Concierge learns

**Memories are about how you like to work.** Say “Remember that I prefer a short summary, then details.” Concierge can use that preference in your other projects on the same computer. It keeps a small private file outside Git repositories, rather than saving conversations or a history of your tasks. It asks before saving a preference inferred from a pattern in your usage.

**Knowledge is about the project.** Sol or Scout records verified tech stacks, conventions, business rules, findings and code decisions in `docs/concierge/knowledge.md`, with source references and dates. For example: “Document why we use integer cents for prices.” Knowledge stays with the repository and can be reviewed and included deliberately in a relevant commit when you ask for one. Existing documentation is preserved; Concierge changes only its own clearly marked section.

**Workflows become skills.** Tell Concierge how you want a recurring kind of work done: “Remember how we review merge requests: migrations first, then the contract tests, then…” or “From now on, test like this.” It saves the steps as an ordinary Copilot skill, in the repository's `.github/skills/` for a team workflow or in `~/.copilot/skills/` for your own, and loads it in later sessions when the work matches. If you recommend a way of doing something while it works, Concierge follows it and offers once to save it; nothing is saved until you say yes. [Remembered workflows →](references/memory-and-knowledge.md#workflows-become-skills)

You can say “What do you remember about me?”, “Forget my preference for short answers”, “Stop remembering my preferences” or “Correct that project rule.” Current instructions and current source evidence always take precedence. Private preferences, personal information and secrets do not belong in repository knowledge. Approval and security settings stay in their existing controls, separate from memory.

Say “Do not write any files” to keep both kinds of learning in the current session. Persistent learning needs Node.js 20+ and Git; when unavailable or access is denied, Concierge continues without saving. On Windows, persistence uses a bundled Windows PowerShell 5.1 adapter on local NTFS drives, and its native tests pass in CI. Windows client editions block that script under their default execution policy, so learning stays session-only there unless local scripts are already allowed. [Memory, knowledge and migration details →](references/memory-and-knowledge.md)

## Make it yours

Add your organization's agents, skills and routing rules without changing Concierge. Each guide covers file locations, a copyable example, discovery, verification, troubleshooting and what is not supported:

- [Customization quick start](references/customizing.md): add a team reviewer and rules in four steps, then share them as a team plugin.
- [Custom agents](references/custom-agents.md): specialist profiles with a preferred model, tools and a charter.
- [Routing charters](references/routing-charters.md): tell Concierge which agent and skills handle each role. A routing row is a delegation instruction that Sol does not bypass.
- [Skills](references/custom-skills.md): reusable guidance for Sol, Concierge's workers or your own.

Roles specify a preferred model. When the host supports an alternative, an unavailable model need not block work; actual fallback behavior depends on the host and is not guaranteed. [Model configuration →](references/install.md#session-local-launcher)

## Verification and limits

Source checks, installation checks and live model sessions are different kinds of evidence, and this project keeps them apart.

**Run live** on Copilot CLI 1.0.98 and 1.0.109, mostly through the Copilot SDK under full autonomy:

- small and medium tasks from request to verified result, including delegation to an independent reviewer;
- two hard stops (a missing ticket and a missing credential), which ended `blocked` without a loop or a workaround;
- a guided run through its plan checkpoint;
- a saved workflow, reused in a later session;
- the result line and the "Decided for you" list.

**Not yet run live:** a question that needs a person to answer, plan approval `ask` with a reply, a follow-up to a running objective, several objectives in parallel, rollover of a long objective, custom routing tables, and the interactive app with the current profiles. These are instruction contracts covered by source tests only.

**Known limits:**

- Concierge's guards against runaway work are instructions, not enforcement. Copilot's `--max-ai-credits` is a soft limit per response, so an unattended client should set its own deadline.
- External coding sessions are not supported. The retired protocol is [archived](docs/archive/external-sessions/README.md).
- Windows and Linux interactive workflows, and live pull-request creation on GitHub and GitLab, remain unverified.

[Runtime verification](references/runtime-verification.md) records each trial and its scope, including historical sessions under the old Zilot name. The [capability matrix](references/capability-matrix.md) covers host differences.

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
