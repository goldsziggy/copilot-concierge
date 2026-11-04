---
name: copilot-concierge-routing
description: Concierge agent routing for this repository. Concierge's orchestrator loads it before assigning work; it names which agents and skills to use for each role.
---

# Agent routing

| Role | Agent | Skills | Use when |
| --- | --- | --- | --- |
| react-frontend | acme-react | acme-design-system | Any React or UI change |
| node-backend | copilot-concierge:worker | node-backend, acme-service-conventions | Back-end changes (uses the reusable worker with domain and team guidance) |
| payments | acme-payments | acme-pci | Anything touching checkout, refunds or card data |

- **Role**: a Concierge role (`scout`, `product-manager`, `worker`, `enterprise-ux`, `react-frontend`, `node-backend`, `graphql`, `reviewer`, `escalation`) to replace or extend it, or a new role name to add a specialist.
- **Agent**: the agent ID Copilot shows. Repository and personal agents use their file name (`acme-react.agent.md` is `acme-react`; `team/api.agent.md` is `team--api`). Plugin agents are `<plugin>:<name>`. Use `copilot-concierge:worker` plus the relevant domain skill for built-in implementation work. A role key is not necessarily a shipped agent ID.
- **Skills**: skills the worker should load for this role, comma-separated, or blank.
- **Use when**: what work the row covers.

Honor the exact discovered custom agent; a model pin is optional unless explicitly required. If a route or preferred model is unavailable, report the gap and use a suitable permitted capability while preserving domain and row skills, user restrictions and independent-review requirements. A legacy built-in domain profile uses the reusable worker with its matching skill, never a claim that the removed profile ran. Routed Scout work retains the built-in `scout` skill and its learning boundaries. Routed implementers commit, push or open a pull request only when the handoff's `git` line says the user asked for it.
