import { extraDirectoryArguments } from './config.mjs';

// Native arguments for an interactive session on a configured plugin copy.
// Full autonomy also removes the question tool at the host. Permission flags
// are never added.
export function nativeArguments(configured) {
  const args = [
    '--no-auto-update', '--plugin-dir', configured.pluginDirectory,
    ...extraDirectoryArguments(configured.value.extraDirectories),
    '--agent', 'copilot-concierge:concierge', '--model', configured.value.models.concierge,
  ];
  if (configured.value.autonomy === 'full') args.push('--no-ask-user');
  return args;
}
