# Plan approval preference

Plan approval is the pause between Zilot's short plan and the work. It is a workflow preference only: Copilot's own tool, path and URL permissions always stay in force, and `auto` never turns them off.

| Value | Behavior |
| --- | --- |
| `ask` (default) | Show the plan and ask "Approve this plan?" with Approve / Change something / Cancel. Only an explicit choice approves. |
| `auto` | Show the plan, say where `auto` came from, and continue within the requested scope. |

The nearest setting wins:

1. The user's words for this request ("go ahead without asking", "ask me first").
2. The user's words earlier in this session, or a launcher `--session-config` file.
3. The project file `.zilot/config.json`.
4. The user file `~/.config/zilot/config.json`.
5. The default, `ask`.

The scout reads the project file during context gathering, and the user file only if the project file sets nothing. When `scripts/launch.mjs` starts the session, it resolves the files and any `--plan-approval` flag in advance and writes the result into the profiles.

A materially larger scope gets a revised plan and the preference again. Question-only and planning-only requests stop before implementation. Invalid values in a file are configuration errors reported by the launcher, never an implicit `auto`.
