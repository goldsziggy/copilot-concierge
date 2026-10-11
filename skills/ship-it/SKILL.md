---
name: ship-it
description: "Orchestrator-only Concierge workflow: prepare and, only after separate explicit publication consent, create a draft GitHub pull request or GitLab merge request through existing authorized capabilities. For direct use, start copilot-concierge:concierge. Stop safely on missing capabilities, ambiguous targets or unpublished changes."
---

# Ship it

Work on the orchestrator's bounded handoff. Read the project's instructions and the verified implementation results. Never recruit agents, ask the user directly, approve plans or own the task list; report only to the orchestrator. Use only capabilities already available and authorized in this host. This skill bundles no connector, credentials or server.

This workflow is orchestrator-only, not a standalone shipping command. Without a bounded handoff from `copilot-concierge:orchestrator`, do not run preflight or create anything. Explain that the user should start `copilot-concierge:concierge` for the offer, exact proposal and separate confirmation. Do not recruit an orchestrator yourself or invent another question/consent path. A routed or escalated worker keeps this same contract.

## Two separate stages

An optional Ship it offer follows verified implementation. Accepting the offer authorizes read-only preflight, not publication. Declining leaves repository and provider state unchanged. Plan approval, `planApproval: auto`, an earlier go-ahead, `CONTINUE` and tool permission are not publication consent.

1. **Preflight (`mode: research`).** Inspect and prepare the exact proposal below without any mutation. Return it to Sol, which reports `needs_input` through the Concierge entry agent.
2. **Create (`mode: implement`).** Proceed only when the handoff contains the user's exact affirmative publication response to the displayed proposal and the confirmed metadata. A generic approval or interest in shipping is insufficient. If consent or metadata is absent or ambiguous, return the missing decision without creating anything.

The Concierge entry agent presents the proposal and asks separately whether to create this draft. The answer travels as `USER FOLLOW-UP`, not `PLAN DECISION`; the handoff's plan-approval field alone never authorizes publication.

## Read-only preflight

- Inspect git status, remotes, current branch and commit IDs, tracking state and local/remote changes using read-only operations. Do not commit, push, fetch, edit files, change repository settings or credentials, publish branches, merge or mark a request ready. Report dirty tree and unpushed commits explicitly.
- Resolve provider (GitHub or GitLab), host and project, source/head project and branch, and target/base project and branch from remotes and existing authorized provider evidence. Do not infer provider from an arbitrary hostname, assume the default branch, choose the first remote or assume `origin` is the target. Forks, multiple remotes and self-hosted instances need an unambiguous source/target mapping; ask via Sol when evidence cannot resolve them. Sanitize credentials in remote URLs and outputs.
- Confirm authorization for the exact host/project and supported draft creation before proposing creation. Read the available capability's documented schema/help and restrictions; do not invent tool/API names, probe unsupported tools or bypass host restrictions. Do not use creation commands to probe capability, including `gh pr create --dry-run`, which may push. Use help/schema and supported read-only authorization and repository queries. If the native GitHub creation tool is absent, an already available and authorized `gh` with documented draft support is a valid capability when host rules permit it; do not report a capability gap solely because the native tool is absent. If the target, authorization, read/query capability or draft capability is missing, stop safely and report the specific gap through Sol. Do not install integrations, create accounts or request credentials.
- Verify the intended changes are represented by the published remote head commit. A clean working tree alone is not proof. Dirty tree or unpushed commits must be reported; if any intended change is absent from remote head, stop without implicit commit/push. Unrelated dirty files are not automatically part of the draft: identify excluded changes explicitly and include that limitation in the proposal for confirmation. If scope cannot be distinguished, stop for clarification.
- Query applicable existing open PRs/MRs on the exact provider/host/project, including fork source project and head/base branches. An applicable existing request returns its link and status rather than a duplicate; do not modify it, convert it to draft or create another. If the query is unavailable or incomplete, stop instead of assuming none exist.
- Establish that the published head has an actual relevant diff against the intended base. No changes means no request. Prepare a title and body grounded in the verified changes and checks; state exclusions and unverified behavior honestly, and keep secrets out.

Return evidence and this complete proposal (no publication yet):

```text
provider: GitHub | GitLab
host/project: <exact target host and owner/repository or group/project>
head: <exact source host/project, branch and published commit ID>
base: <exact target project, branch and observed commit ID>
title: <exact title>
body: <exact complete body>
draft: true
repository state: <dirty/unpushed state, excluded changes, or clean and published>
existing request: <link/status, or none with query evidence>
capability: <available authorized draft-creation mechanism and scope limits>
```

## Confirmed creation

Immediately before mutation, revalidate authorization, draft capability, relevant target/head/base state, intended diff and duplicate state with read-only checks. If an applicable request appeared, return its link/status without creating. If any material proposal field, commit, scope, repository state or capability changed, return the updated proposal for renewed confirmation through Sol; do not reuse stale consent. Recovery after a lost session or uncertain create result also requires checking provider state before any retry.

Consent remains bound to the exact displayed proposal. If recovery or handover loses that proposal or its affirmative response, do not reconstruct consent from a summary or plan approval: repeat preflight and request renewed confirmation through Sol before creation.

- **GitHub:** use the native `create_pull_request` tool where supported and required by the host, with `draft: true`, the confirmed title/body and supported target/base. Its current-session repository/head restrictions are authoritative. Do not call it to test unsupported repositories, branches or hosts. Do not switch to `gh` or another API to bypass restrictions or a generic failure; use a fallback only when the tool's failure explicitly permits it and it supports the confirmed draft proposal. In hosts without that tool, an already available, supported, authorized `gh` CLI is valid when host rules permit it, as is another existing authorized draft-creation capability. Verify exact host/project access and documented draft support before selecting it; missing native integration alone is not missing draft capability. No creation command runs until the separate exact publication consent and immediate revalidation above.
- **GitLab:** use an existing authorized integration or CLI only when its documented capabilities support the confirmed host/project, source/target and creation as a draft. Tool names and draft conventions vary: verify the actual supported mechanism, not an assumed API name or a title prefix alone. If draft creation cannot be established, stop.

Create as a draft in the initial mutation. Never create a non-draft then convert it. Never merge, enable auto-merge, mark ready, push or commit. Confirm the returned link, target/head and draft status with supported read-only evidence. If outcome or draft status is uncertain, report that uncertainty and reconcile provider state without blind retries or corrective mutations.

## Return to Sol

Return findings (provider/target, repository state, duplicate and capability evidence), changes (none in preflight; link/status after creation), verification (exact read-only checks and creation result, if authorized), blockers and next decision needed. Sol uses existing report statuses: `needs_input` for the offer or metadata/publication confirmation, `blocked` for gaps, and `done` for decline, an existing request or a verified draft result. Keep completed implementation distinct from shipping blockers. Static instruction checks do not establish live GitHub or GitLab behavior.
