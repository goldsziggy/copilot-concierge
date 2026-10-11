# Migration from the former Zilot application

Zilot 0.2.0 and later use native Copilot agents and skills. This plugin-only distribution does not include the former React application, server, scheduler, database, dashboard or prototype controller.

Installing this plugin does not migrate or delete data from an earlier Zilot application. Keep existing data and backups separately. Removing the plugin leaves Copilot session history untouched; see [installation and removal](install.md).

The public repository starts with the current native plugin. It does not contain private development history, local sessions or historical benchmark outputs. Recovery of a former application requires its original source and backups; do not reset a working tree containing unrelated work.

Historical application benchmarks do not establish this plugin's capabilities. Native runtime observations and their limits are recorded in [runtime verification](runtime-verification.md).
