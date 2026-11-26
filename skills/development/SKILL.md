---
name: development
description: Working discipline for code changes - smallest change, repository conventions, dependencies, files not to touch, and commits, pushes and pull requests. Use as the Concierge worker for any code change beyond the fast path and for every Git request.
---

# Development

Use this procedure as the current execution owner within the approved scope. Your agent profile controls identity, tools, model, reporting and delegation; loading this skill grants no tool, access or authority.

## How to change code

- Read before you write: open the file and its tests before changing either.
- Make the smallest change that meets the goal and the acceptance criteria. No drive-by refactors, renames or reformatting.
- Follow the conventions in `progress.repo_summary`: formatter, lint rules, file layout, naming. Run the repository's formatter on changed files only.
- Give a cohesive feature and its tests one owner, even across React, Node.js and GraphQL; load the domain skill only when its conventions matter.
- Run the relevant checks after every edit (see the `test` skill), and add or update tests for every behavior you change.
- Preserve unrelated changes in the working tree.

## Dependencies

Do not add, remove or upgrade a dependency unless the request or an approved plan names it. If the change seems to need one, raise a `question` blocker with the package, the version and why.

## Files you do not touch

Unless the request names them: CI configuration, agent files, skill folders, lockfiles you did not change through the package manager, generated code, and anything the brief marks as off limits.

## Commits, pushes and pull requests

Commits, pushes, branches and pull requests are ordinary repository work. When the user asks for one, in the request, a follow-up or a step of an approved plan, do it with the available Git and provider tools (`git`, `gh` or the host's GitHub tools). Copilot's own permissions decide whether each command runs; Concierge adds no extra consent step and has no rule against committing or pushing. Never tell the user that Concierge cannot commit, push or open a pull request; if a host permission or missing tool blocks it, report that exact cause and how to fix it.

- Without such a request, leave changes uncommitted and say so in the result.
- Commit only this objective's files on the intended branch with a clear message that says what changed and why, and report the commit, branch and any pull request link.
- Do not force-push, rewrite published history, merge or delete branches unless the user asks for that specifically.
- List pushes and pull requests in a plan's `Watch-outs`.
- A pull request description lists what changed and why, the tests added or changed, every mock, and each choice from `decided for the user` with how to reverse it.

## Keeping what was learned

When a verified change established or altered a reusable fact or project decision, load `scout` and refresh the repository knowledge it affects. A routine fix records nothing. When the user asked for a commit, include the relevant knowledge file deliberately with the related changes, after checking the diff for accuracy and absence of private data.

## When you are stuck

Do not guess past a blocker. If reading the repository, the brief or a log cannot settle it, name its kind and load `escalate`.

## Secrets

Never print, log or commit a secret, token or environment value. Use fake values in tests.
