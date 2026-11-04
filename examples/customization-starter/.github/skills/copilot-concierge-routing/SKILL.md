---
name: copilot-concierge-routing
description: Route Concierge reviews to the team's specialist and add the team's review rules to Node.js implementation.
---

# Team routing charter

| Role | Agent | Skills | Use when |
| --- | --- | --- | --- |
| reviewer | team-reviewer | team-review-rules | Reviews of plans and code changes |
| node-backend | copilot-concierge:worker | node-backend, team-review-rules | Node.js implementation and self-checks |

Prefer a discovered exact agent ID; model pins are optional.
Preserve Concierge's handoff, approval state, delegation and reporting rules.
Custom routes never grant access, permission or new memory stores. Keep the
built-in Scout skill when routing Scout.
Honor available explicit routes before considering direct work. If a route or
preferred model is unavailable, report the gap and preserve applicable skills,
independent review, exact user restrictions and host permissions in any fallback.
