---
name: copilot-concierge-routing
description: Concierge agent routing for this repository. Concierge's orchestrator loads it before assigning work; it names which agents and skills to use for each role.
---

# Agent routing

| Role | Agent | Skills | Use when |
| --- | --- | --- | --- |
| react-frontend | acme-react | acme-design-system | Any React or UI change |
| node-backend | copilot-concierge:node-backend | acme-service-conventions | Back-end changes (keeps Concierge's agent, adds a skill) |
| payments | acme-payments | acme-pci | Anything touching checkout, refunds or card data |

- **Role**: a Concierge role (`scout`, `product-manager`, `enterprise-ux`, `react-frontend`, `node-backend`, `graphql`, `reviewer`, `ship-it`, `escalation`) to replace or extend it, or a new role name to add a specialist.
- **Agent**: the agent ID Copilot shows. Repository and personal agents use their file name (`acme-react.agent.md` is `acme-react`; `team/api.agent.md` is `team--api`). Plugin agents are `<plugin>:<name>`. Use a `copilot-concierge:` ID to keep Concierge's agent.
- **Skills**: skills the worker should load for this role, comma-separated, or blank.
- **Use when**: what work the row covers.

The exact agent must be discovered and its effective profile must pin one explicit model with `model-policy: required`. Missing, unverified or unpinned routes use a suitable shipped Concierge role with a reported gap, or stop if none fits. Never use an unpinned built-in worker as a substitute. Routed Scout and Ship it work retain the built-in skills and their note/publication boundaries.
