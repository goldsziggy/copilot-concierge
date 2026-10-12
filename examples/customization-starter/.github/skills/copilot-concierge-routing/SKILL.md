---
name: copilot-concierge-routing
description: Route Concierge reviews to the team's specialist and add the team's review rules to Node.js implementation.
---

# Team routing charter

| Role | Agent | Skills | Use when |
| --- | --- | --- | --- |
| reviewer | team-reviewer | team-review-rules | Reviews of plans and code changes |
| node-backend | copilot-concierge:node-backend | team-review-rules | Node.js implementation and self-checks |

Use only a discovered exact agent ID with one explicit required model.
Preserve Concierge's handoff, approval state, delegation and reporting rules.
Custom routes never grant access, permission, new memory stores or publication
consent. Keep the built-in Scout and Ship it skills when routing those roles.
If a route is unavailable or unverified, report the gap and use the suitable
shipped role; a new role without a suitable shipped default stays blocked.
