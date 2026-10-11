---
name: zilot-routing
description: Zilot agent routing for this repository. Zilot's orchestrator loads it before assigning work; it names which agents and skills to use for each role.
---

# Agent routing

| Role | Agent | Skills | Use when |
| --- | --- | --- | --- |
| react-frontend | acme-react | acme-design-system | Any React or UI change |
| node-backend | zilot:node-backend | acme-service-conventions | Back-end changes (keeps Zilot's agent, adds a skill) |
| payments | acme-payments | acme-pci | Anything touching checkout, refunds or card data |

- **Role**: a Zilot role (`scout`, `product-manager`, `enterprise-ux`, `react-frontend`, `node-backend`, `graphql`, `reviewer`, `escalation`) to replace or extend it, or a new role name to add a specialist.
- **Agent**: the agent ID Copilot shows. Repository and personal agents use their file name (`acme-react.agent.md` is `acme-react`; `team/api.agent.md` is `team--api`). Plugin agents are `<plugin>:<name>`. Use a `zilot:` ID to keep Zilot's agent.
- **Skills**: skills the worker should load for this role, comma-separated, or blank.
- **Use when**: what work the row covers.
