---
name: copilot-concierge-routing
description: Concierge agent routing for this repository. Concierge's worker loads it before choosing how to do the work; it names which agents and skills to use for each role.
---

# Agent routing

| Role | Agent | Skills | Use when |
| --- | --- | --- | --- |
| react-frontend | acme-react | acme-design-system | Any React or UI change |
| node-backend | copilot-concierge:worker | node-backend, acme-service-conventions | Back-end changes (the Concierge worker does these itself with domain and team guidance) |
| payments | acme-payments | acme-pci | Anything touching checkout, refunds or card data |

- **Role**: a kind of work Concierge knows (`scout`, `product-manager`, `worker`, `enterprise-ux`, `react-frontend`, `node-backend`, `graphql`, `reviewer`, `escalation`) to send it to the listed agent, or a new role name to add a specialist. Role keys describe kinds of work, not shipped agents.
- **Agent**: the agent ID Copilot shows. Repository and personal agents use their file name (`acme-react.agent.md` is `acme-react`; `team/api.agent.md` is `team--api`). Plugin agents are `<plugin>:<name>`. Use `copilot-concierge:worker` plus the relevant skill to have the Concierge worker do that work itself; it is the only shipped agent a row may name.
- **Skills**: skills to load for this work, comma-separated, or blank.
- **Use when**: what work the row covers.

Honor the exact discovered custom agent; a model pin is optional unless explicitly required. If a route or preferred model is unavailable, report the gap and use a suitable permitted capability while preserving domain and row skills, user restrictions and independent-review requirements. A row naming a retired built-in agent is handled by the Concierge worker with the matching skill, never a claim that the removed profile ran. Routed Scout work retains the built-in `scout` skill and its learning boundaries. Routed implementers commit, push or open a pull request only when the handoff's `git` line says the user asked for it.
