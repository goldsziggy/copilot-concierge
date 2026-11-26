---
name: sop-release
description: "SOP: cut a release of the Acme service. Load when asked to release, or to run the release SOP."
---

# Release

You own: a tagged release whose notes match what shipped.

## Steps

1. Confirm the version to release and that the working tree is clean.
2. Run the full test suite and the contract tests.
3. Update `CHANGELOG.md` with the changes since the last tag.
4. Bump the version in `package.json` and commit both files.
5. Run the Opening a PR SOP.

## Done when

- The pull request contains only the changelog and version bump.
- The test and contract results are stated in its description.

## Reply

The version, the pull request link, the test results, and anything a human must do next, such as tagging after merge.
