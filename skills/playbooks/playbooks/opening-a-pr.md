# Opening a PR

Use when: the user asked for a pull request, in the request, a follow-up or an approved plan.

You own what a reviewer sees. The description is for someone who was not here.

## Steps

1. Confirm the request covers a commit, a push and a pull request, and note the branch and base it named. Do only what was asked.
2. Check the working tree: this objective's files only, unrelated changes preserved, no secrets or generated noise.
3. Run the checks the repository names and record their results (`test`).
4. Commit on the intended branch with a message that says what changed and why (`development`).
5. Push that branch. Never force-push or push to another branch unless the user asked for that specifically.
6. Follow the repository's pull request template if it has one. Describe what changed and why, how it was verified, every mock, and each choice decided for the user with how to reverse it.
7. Open the pull request against the intended base and report its link. Do not merge it unless the user asked.

## Done when

- The pull request exists, targets the intended base and contains only this objective's changes.
- Its description states the verification that actually ran.
- The report gives the commit, branch and link.

## Reply

The pull request link, the commit and branch, what the description says was verified, and anything left for the reviewer to decide.
