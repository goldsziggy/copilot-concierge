# Releasing Concierge

Concierge is the native Copilot plugin with package ID `copilot-concierge`. Distribution is the repository's marketplace plus a release ZIP, not a VSIX (see [distribution](distribution.md)). The workflows support publication; creating these files does not publish, push a tag, install a plugin or change account access.

## Local and continuous checks

Use Node.js 20 or 22 and Python 3 with its standard library. Python must be available through the `python3` executable. No npm dependencies or Python packages need installation:

```sh
npm test
npm run validate
node distribution/catalog.mjs --check
npm run package
```

Packaging writes `dist/copilot-concierge-<version>.zip` and its `.zip.sha256` file. It refuses to overwrite an existing archive: move the previous build aside or explicitly remove it before rebuilding. These checks do not call Copilot or establish live CLI/desktop behavior, model availability, or store acceptance.

[CI](../.github/workflows/ci.yml) runs all checks and packaging on Ubuntu with Node 20 and 22. A separate Windows Node 20/22 job runs the test suite, validation and catalog checks; it does not run Python packaging or Copilot sessions. POSIX launcher fixtures remain skipped on Windows. These jobs run for pull requests, branch pushes and manual dispatches. It uses read-only repository permissions and retains the Node 22 ZIP/checksum as a build artifact. It does not publish a release. The Python modules used by packaging are available on the selected Ubuntu runner; the workflow checks them before packaging.

## Prepare a release

1. Update `package.json` and `plugin.json` to the same SemVer, keep the ID `copilot-concierge`, and update `CHANGELOG.md` with the release's changes and actual verification limits. Keep canonical `.github/plugin/marketplace.json` and `distribution/marketplace.json` aligned with the plugin; `node distribution/catalog.mjs --check` verifies the catalogs. Version `0.4.0` introduces the breaking Concierge IDs and configuration paths. Preserve the historical Zilot `v0.3.1` tag/release and its uploaded assets.
2. Run the local checks and inspect the ZIP contents, checksum, manifest and host compatibility notes. Commit the reviewed source through the normal repository process. This plugin-only public repository starts from the approved native snapshot. Do not import private development history, local session journals, credentials or historical benchmark outputs.
3. When publishing is separately authorized, create and push the intended `v<version>` tag through the normal maintainer process. The release workflow does neither. The tag must already identify the exact source to release.
4. In GitHub Actions, manually run [Release Concierge](../.github/workflows/release.yml), enter the existing tag and leave `draft` enabled for a reviewable draft. Disable `draft` only when you intend this run to publish the release. The workflow must be present on the default branch for manual dispatch to be available. [GitHub manual-event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)

The release job checks out the specified tag, verifies matching package/plugin versions, requires the tag to resolve to `HEAD` and the source tree to be clean, then tests, validates and builds it. `--artifacts` verifies the resulting ZIP against its checksum. The read-only local equivalents are:

```sh
node scripts/release-check.mjs --tag v0.5.0
node scripts/release-check.mjs --tag v0.5.0 --artifacts
```

Use the actual version when it changes. The checker requires a Git checkout and never writes tags, edits files or contacts a remote.

The final workflow step uses the job's `GITHUB_TOKEN` with `contents: write` to create a GitHub release and attach exactly the ZIP and checksum. It passes `--verify-tag`, so GitHub CLI cannot silently create a missing remote tag. Prerelease versions are marked as prereleases. Release notes come from the checked-out `CHANGELOG.md`; review them along with the assets. [GitHub CLI release behavior](https://cli.github.com/manual/gh_release_create)

Existing releases are not overwritten or automatically repaired. If a run is interrupted near publication, inspect the existing tag/release/assets before deciding the next action. A draft can be reviewed and published through GitHub's existing release UI. GitHub repository policy may restrict release creation; the workflow does not alter repository settings or credentials.

Marketplace listing/discovery and a GitHub release are separate distribution steps. The canonical repository is `goldsziggy/copilot-concierge`; the catalog's `source: "./"` resolves from that repository's root, not from the catalog directory. Follow the plugin's host documentation for installation; no workflow installs it for the user or claims directory discovery is already published.

## Release steps

Each step changes a remote or makes content visible. Obtain authorization for the exact source scope and license before the initial public release.

1. Update the version and `CHANGELOG.md` on a branch, run the checks, push the branch and merge a pull request into `main` (the release workflow must be on the default branch to be dispatched).
2. Tag the merged commit on `main` and push the tag: `git tag -a v<version> -m "Concierge <version>"`, then `git push origin v<version>`.
3. In GitHub Actions, run **Release Concierge** with that tag. Leave `draft` on to review the ZIP, checksum and notes first, or turn it off to publish directly.
4. Users install with `copilot plugin marketplace add goldsziggy/copilot-concierge` and `copilot plugin install copilot-concierge@copilot-concierge`, or pin `goldsziggy/copilot-concierge#v<version>`.
5. Optional and separate: to list Concierge in `awesome-copilot`, submit the external-plugin issue for the reviewed public tag and full commit SHA after any required contribution-policy authorization. A maintainer must approve it, the generated listing PR must merge, and the marketplace must publish. A public issue or open listing PR does not mean Concierge is included in the default catalog.

## Pinned build actions

Exact commits were checked against the official action releases on 2026-10-08. The action runtime is separate from the Node version under test; these action versions run on Node 24 supplied by GitHub's hosted runner.

| Action | Release | Pinned commit |
| --- | --- | --- |
| checkout | [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) | [`3d3c42e5aac5ba805825da76410c181273ba90b1`](https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1) |
| setup-node | [v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0) | [`949feb2413d6458794dcd2491c4babbbce0c15c1`](https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1) |
| upload-artifact | [v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) | [`cf430e030ddbb5b0abf93d22962f4752f3646cd9`](https://github.com/actions/upload-artifact/commit/cf430e030ddbb5b0abf93d22962f4752f3646cd9) |

When updating a pin, verify the release's official commit, review its changes and update both workflows and this table. No floating action tags, npm publishing token or external release action is needed.
