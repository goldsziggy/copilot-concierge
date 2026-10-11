# Synthetic Concierge fixture

This is disposable test material, not a real enterprise repository. Jira data under `../jira/` is mocked. No production ticket or account is represented.

The established UI design system in this fixture is `@example/enterprise-ui`, consumed through the local wrapper `src/ui.mjs`. An unused `@fluentui/react-components` entry is a decoy for source-grounding checks; do not install anything.

The clear-change scenario asks that `total([])` return 0 while preserving positive and negative number behavior. Run `node --test test/total.test.mjs` to verify. The initial implementation intentionally fails for an empty array.
