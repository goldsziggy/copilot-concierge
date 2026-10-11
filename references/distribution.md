# Distributing Zilot — Concierge Copilot

Zilot is a native Copilot Agent Plugins 1.0 package, distributed through a Git-hosted marketplace and a versioned ZIP. It is not a VSIX or a server-side GitHub App. The plugin-only distribution repository is `goldsziggy/zilot-plugin`; the package and marketplace names remain `zilot`.

## Native marketplace

The repository contains `.github/plugin/marketplace.json`, with `source: "./"` resolving from its root. Users register the repository and install `zilot@zilot`; see [installation](install.md). Pin a published release with `goldsziggy/zilot-plugin#v0.3.1`.

This route requires public repository access for unauthenticated consumers, not a Visual Studio Marketplace publisher account. No signing certificate is required by the documented native marketplace procedure. [Creating a marketplace](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace).

The detailed CLI reference lists `awesome-copilot` as built in; other defaults differ across clients and versions. Zilot's explicit marketplace-add command does not rely on a default listing. CLI 1.0.95 warned that direct path/repository plugin installs are deprecated, so use the marketplace form. [CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference).

## Release ZIP

`npm run package` creates `dist/zilot-<version>.zip` and its `.sha256` file. A release workflow attaches those assets to the approved tag. Users extract the `zilot` folder and register it as a local marketplace. The ZIP includes the Concierge Copilot logo used in the README. It does not contain private Git history, local configuration, raw sessions or legacy benchmark outputs.

The portable plugin manifest has no `icon` field. The logo is a documentation asset; no native picker-icon display is promised. [Agent Plugins manifest](https://agent-plugins.org/plugin-authors/manifest).

## Optional public directory listing

`github/awesome-copilot` accepts external plugins through an issue intake with a public GitHub repository, version, immutable source locator, author, license and discovery metadata. Automated lint and install checks precede a maintainer decision. This listing is optional; public users can install directly from Zilot's own marketplace once it is available. [Official contribution guide](https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md#adding-external-plugins).

The plugin, documentation and included logo are licensed under [Apache-2.0](../LICENSE), with attribution in [NOTICE](../NOTICE). This public distribution contains only the current plugin snapshot; the former private repository's history is not included.

## Catalog maintenance

```sh
node distribution/catalog.mjs --write
node distribution/catalog.mjs --check
node distribution/check-native-catalog.mjs
```

The first command synchronizes the canonical and packaged catalogs. The optional last command only registers and browses the catalog in temporary offline Copilot state; it makes no model calls and changes no persistent installation. Release procedure: [releasing](releasing.md).
