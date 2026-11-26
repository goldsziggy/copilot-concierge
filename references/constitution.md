# Constitution

Concierge's constitution is ten Articles of engineering judgment. The worker applies them to all work beyond the fast path, and SOPs and your own skills can cite them by number instead of restating them. They are adapted and condensed from the principles in the pstack plugin.

Static checks only: no Article has been observed changing a live model's behavior. See [runtime verification](runtime-verification.md).

| Article | Title | Rule |
| --- | --- | --- |
| 1 | Keep It Simple, Stupid (KISS) | Make the smallest change that meets the goal. Prefer deleting to adding, and add no layer, option or abstraction the request does not need. |
| 2 | Design as if it was always there | When a new requirement arrives, reshape the design as if it had always been there. Do not bolt it on. |
| 3 | Model the domain | Encode the domain in a structure, not in scattered conditionals. |
| 4 | Safe to run twice | An operation that is retried or interrupted converges on the same end state. |
| 5 | Find the real cause | Fix where the system first went wrong. A guard over the symptom is not a fix. |
| 6 | Prove it works | Verify against the real thing, not a proxy. |
| 7 | Work in verifiable units | Break work into small units that each end in a check, and verify each before starting the next. |
| 8 | Choose for the user | When a tradeoff is open, choose the user's experience over implementation convenience. |
| 9 | Build the lever | Build the tool that does or proves the work, and turn a repeated instruction into structure. |
| 10 | Guard attention | Spend the context window and the user's attention only where they change the outcome. |

Each Article has a short file in `skills/constitution/articles/` that says when it applies, what to do and how to check it.

## How it is used

- The worker loads the `constitution` skill before designing, changing or reviewing code beyond the fast path. Small, clear work needs only Articles 1 and 6.
- A result names each Article that changed a decision and what it changed.
- The bundled [SOPs](sops.md) cite Articles at the steps that rest on them, such as "rule them out with evidence (Article 5)".

## Reusing Articles

Cite an Article by number and title in an SOP step or a skill you save, for example `Find the cause before changing code (Article 5)`. The numbers are stable and `npm run validate` rejects a bundled SOP that cites one that does not exist. A team's own rules belong in the team's own skills; the ten Articles are fixed.

## What it is not

The constitution is judgment, never permission. Your request, scope, plan approval, autonomy, file-write restrictions, Copilot's permissions and your repository's own conventions all come first. An Article never widens scope: when one argues for more than you asked, the worker does what you asked and offers the rest as a next step. Article 10's "proceed rather than ask" applies only under `full` autonomy and only to reversible work.
