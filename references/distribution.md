# Distributing Concierge

Concierge is a native Copilot Agent Plugins 1.0 package, distributed through a Git-hosted marketplace and a versioned ZIP. It is not a VSIX or a server-side GitHub App. The canonical maintained repository is `goldsziggy/copilot-concierge`; repository, package, plugin and marketplace IDs are `copilot-concierge` from 0.4.0 onward.

## Native marketplace

The repository contains `.github/plugin/marketplace.json`, with `source: "./"` resolving from its root. Users register the repository and install `copilot-concierge@copilot-concierge`; see [installation](install.md). Pin a published release with `goldsziggy/copilot-concierge#v0.6.1`.

This route requires public repository access for unauthenticated consumers, not a Visual Studio Marketplace publisher account. No signing certificate is required by the documented native marketplace procedure. [Creating a marketplace](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace).

The detailed CLI reference lists `awesome-copilot` as built in; other defaults differ across clients and versions. Concierge's explicit marketplace-add command does not rely on a default listing. CLI 1.0.95 warned that direct path/repository plugin installs are deprecated, so use the marketplace form. [CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference).

## Release ZIP

`npm run package` creates `dist/copilot-concierge-<version>.zip` and its `.sha256` file. A release workflow attaches those assets to the approved tag. Users extract the `copilot-concierge` folder and register it as a local marketplace. The ZIP includes the Concierge logo and editable orchestration SVG used in the README. It does not contain private Git history, local configuration, raw sessions or legacy benchmark outputs.

The portable plugin manifest has no `icon` field. The logo is a documentation asset; no native picker-icon display is promised. [Agent Plugins manifest](https://agent-plugins.org/plugin-authors/manifest).

## Optional public directory listing

`github/awesome-copilot` accepts external plugins through an issue intake with a public GitHub repository, version, immutable source locator, author, license and discovery metadata. Automated lint and install checks precede a maintainer decision and listing PR. The catalog is published after that PR merges. The app’s **Customize → Plugins** view can then discover it through Awesome Copilot when that marketplace is configured. This listing is optional; users can add Concierge’s own marketplace immediately. An issue or open listing PR is not approval or default-catalog availability. [Official contribution guide](https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md#adding-external-plugins).

The plugin, documentation and included logo are licensed under [Apache-2.0](../LICENSE), with attribution in [NOTICE](../NOTICE). This public distribution contains only the current plugin snapshot; the former private repository's history is not included.

The historical v0.3.1 tag and release retain the Zilot name, IDs and uploaded ZIP. They are not repackaged as Concierge; users moving from Zilot must follow [migration](migration.md). The former private development repository remains separate and unchanged.

## Catalog maintenance

```sh
node distribution/catalog.mjs --write
node distribution/catalog.mjs --check
node distribution/check-native-catalog.mjs
```

The first command synchronizes the canonical and packaged catalogs. The optional last command only registers and browses the catalog in temporary offline Copilot state; it makes no model calls and changes no persistent installation. Release procedure: [releasing](releasing.md).
