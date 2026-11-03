# Concierge dynamic workflow pilot

This is an opt-in, read-only pilot of execution stages, parallel exploration and a join, progress/checkpoints, and structured result bookkeeping. It is separate from the normal Concierge chat path. It asks workers not to implement changes or publish, and does not include a verification/repair loop or grant permissions. Its prompts are not a security boundary; restrict tools through the host. A completed pilot means its workers returned usable exploration results, not that a development task has been implemented or verified.

Dynamic workflows are a public preview and the SDK API may change. This example uses the experimental `defineWorkflow`, `joinSession`, `ctx.agent`, `ctx.parallel`, `ctx.phase`, `ctx.log`, `ctx.pause` and `ctx.step` APIs documented by [GitHub's SDK](https://github.com/github/copilot-sdk/blob/da61ce3f0cd3e31713f3f7e0f62b37a29d25f448/nodejs/docs/workflows.md). It has not been tested in a live Copilot host. If your host or installed SDK lacks those APIs, do not load the extension: use ordinary Concierge chat instead. No automatic fallback or live compatibility is claimed.

## Try it deliberately

Review this directory, then copy it to `.github/extensions/concierge-explore-pilot/` in a trusted project and reload extensions using your host's documented controls. Installing this plugin alone does not activate the example. The CLI requires experimental features (`--experimental`); the host/account must support dynamic workflows and session storage. Project extension loading executes code, so only trust code you have reviewed. Follow [GitHub's dynamic workflow instructions](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-dynamic-workflows).

Invoke the registered workflow by name, for example with `copilot --experimental workflow run concierge-explore-pilot --args @input.json`. An input file could contain:

```json
{"objective":"Understand the checkout flow","pieces":["Locate entry points","Identify existing tests"],"checkpoint":true}
```

`objective` is a nonempty string of up to 4000 characters; `pieces` has one to six independent strings of up to 2000 characters. `checkpoint` is optional and defaults to false. The pilot explicitly instructs workers to be read-only, but the host's permission controls are authoritative. Grant only the tools needed. Headless workflow runs do not show permission prompts: configure appropriate permissions first, or requests will be denied. Never use blanket permissions just to run this example.

The optional checkpoint pauses *after* exploration and *before* the deterministic join. Resume the same run using the host's documented control. It is a progress checkpoint, not an approval or authorization. The runtime restarts the workflow body on resume; agent calls may be memoized, and journaled steps are at-least-once rather than exactly-once. This pilot keeps its journaled step pure and uses versioned keys. Do not assume external effects are deduplicated. Results belong to the workflow run and may contain repository data; handle them accordingly.

Each piece retains its status, evidence and uncertainties. Null or invalid worker results are marked blocked; any blocked piece yields a partial overall result. Cancellation and hard host errors may abort the run rather than return a result. When invoking through the SDK, inspect the run envelope and consume `result` only when its status is `completed`; a completed run can still contain a `partial` pilot result. The explicit `checks: not_run` field prevents a zero-check outcome from being presented as verification. Worker findings are not automatically facts or permission to act.

`node --test tests/dynamic-workflow.test.mjs` exercises the pure workflow with a simulated context. It does not test registration, provider calls, permissions, durable storage, host replay or live Copilot behavior.
