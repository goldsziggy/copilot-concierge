---
name: copilot-concierge-routing
description: Route Concierge reviews to the team's specialist and add the team's review rules to Node.js implementation.
---

# Team routing charter

| Role | Agent | Skills | Use when |
| --- | --- | --- | --- |
| reviewer | team-reviewer | team-review-rules | Reviews of plans and code changes |
| node-backend | copilot-concierge:node-backend | team-review-rules | Node.js implementation and self-checks |

Prefer a discovered exact agent ID; model pins are optional.
Preserve Concierge's handoff, approval state, delegation and reporting rules.
Custom routes never grant access, permission or new memory stores. Keep the
built-in Scout skill when routing Scout.
If a route is unavailable, report the gap and use an available suitable worker
or work directly within scope, retaining applicable skills and restrictions.
