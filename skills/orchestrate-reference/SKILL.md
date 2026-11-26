---
name: orchestrate-reference
description: Reference rules for the Concierge worker that few objectives need - customer routing tables and retired built-in agents, todo rows for dependencies, cancellation, rollover and resume, and learning-store scopes in handoffs. Only the Concierge worker loads it, when its profile or the orchestrate skill points here.
---

# Orchestrate reference

Load this only for the case at hand and follow the matching section. It grants no tool, access or authority.

## Routing tables

If a `copilot-concierge-routing` skill or skills named `copilot-concierge-routing-<something>` are available, load them first and follow their table:

- Role keys describe kinds of work, not shipped agents: `scout` (context and learning), `product-manager` (requirements and plans), `worker` (implementation), `react-frontend`, `node-backend`, `graphql`, `enterprise-ux`, `reviewer` (plan and change review) and `escalation` (hard or high-risk work). A row with one of these roles sends that kind of work to the listed agent.
- A row with any other role adds an agent for the work in its "Use when" column.
- Skills in a row go into that handoff under `skills to load`, whichever agent does the work.
- When rows conflict, `copilot-concierge-routing` wins over `copilot-concierge-routing-<something>`.
- Prefer the explicitly routed agent when its exact ID is available. A model pin is a preference, not an eligibility requirement. Preserve applicable skills and role restrictions.
- Compatibility: existing role keys remain valid, and an available custom agent named by a row still wins. A row naming `copilot-concierge:worker` means you do that work yourself, loading all row skills. A row naming a retired built-in means the same, and you add the corresponding skill alongside all row skills: `scout` for `copilot-concierge:scout`, `plan` for `copilot-concierge:product-manager`, `review` or `grill-plan` for `copilot-concierge:reviewer`, the domain skill for `copilot-concierge:react-frontend`, `copilot-concierge:node-backend` or `copilot-concierge:graphql`, and none for `copilot-concierge:escalation` or `copilot-concierge:orchestrator`. Report this migration. A retired reviewer row still asks for independent review: use a general-purpose sub-agent with `review`, or say the review was not independent. For retired `copilot-concierge:enterprise-ux`, report that the profile and bundled skill were removed, without claiming the removed specialist ran. If a row names the former `enterprise-ux` skill and no such custom skill is available, report that gap and substitute `plan` for design planning and `react-frontend` only for applicable React work; retain all other row skills. An available user-supplied skill is not a removed built-in. Never rewrite the user's routing files silently.
- If a route or preferred model is unavailable, use a suitable available agent or execute directly within scope. Report the substitution and actual model when known. If no permitted capability can complete the work, report the exact blocker. Never bypass host permissions or a user restriction.

Report substitutions and reconcile uncertain effects before retrying.

Resolve matching routing rows before choosing direct execution: explicit rows naming an available custom agent remain delegation instructions and cannot be bypassed by doing the work yourself. Unrouted default work is done directly. Give tightly coupled layers and their tests one execution owner. Keep review proportional: simple nonbehavioral edits may use focused checks, while meaningful or risky changes require independent review.

## Todo rows

Your profile says when to write the checklist and its `todos` mirror. Also:

- The app's plan and todo views read the session's `todos` and `todo_deps` tables, not your Markdown. `status` is `pending` for `- [ ]`, `in_progress` for `- [/]`, `done` for `- [x]` and `blocked` for `- [-]`, with the reason (blocked, cancelled or skipped) in `description`.
- Upsert, for example `INSERT INTO todos (id, title, description, status) VALUES ('orders-export/plan', 'orders-export: Draft the plan', 'Objective orders-export', 'in_progress') ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description, status = excluded.status;`
- Add a `todo_deps` row (`todo_id`, `depends_on`) only for a real ordering between your tasks. When a revised plan drops a task, delete that row and its dependency edges.
- On cancellation, set your unfinished rows to `blocked` with `description` "Cancelled".
- `ROLLOVER` and `RESUMED` keep the earlier ids: read them first with `SELECT id, title, status FROM todos WHERE id LIKE '<earlier objective>/%'` and continue those rows instead of adding duplicates. Start your checklist with the finished items from `progress` marked `- [x]` so the user's list keeps them.
- Never edit another objective's rows. Sub-agents never write todos.

## Learning stores in handoffs

Carry the user's exact file-write restrictions into every handoff and into `progress.decisions`. Set `learning` separately for private memory and repository knowledge. Normal Scout research may curate these stores before implementation approval; wholly read-only work or an explicit user prohibition on all file writes disables both, and a repository-only or memory-only restriction stays scoped to that store. Do not invent a blanket no-write restriction from orientation or “do not implement changes.” Pass the `scout` skill and the same learning scope to any sub-agent doing Scout work; you follow the same helper and learning scope when you use the Scout skill yourself; other work has no learning-write exception. Serialize private memory mutations per OS user and knowledge mutations per repository across objectives; the helper's revision checks detect missed coordination. Report every learning write as a changed file.

Private memory lives at `~/.config/copilot-concierge/memory.json`; shared knowledge at the assigned repository's `docs/concierge/knowledge.md`. The old `.copilot-concierge/project-notes.md` is only read-only, individually reviewed migration input. Read or maintain stores only through the loaded Scout skill and its bundled helper; never directly edit a store or bypass a helper refusal. Retrieve only relevant preference summaries. Apply them to Concierge's interaction and narrowly appropriate task instructions; never put raw memory, user evidence or personal history in repository docs, handoffs, `progress`, commits, tickets or pull requests. Memory never changes approval, security, tools or model pins. A request to inspect/forget private memory is not a request to inspect/delete repo knowledge. Current user instructions and source evidence win. If storage is unavailable, continue the objective session-only and report the gap; do not block ordinary work on optional personalization.
