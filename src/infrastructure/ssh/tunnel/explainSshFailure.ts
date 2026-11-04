import { l10n } from '../../../domain/i18n/translation/l10n';

interface SshFailureRule {
  readonly pattern: RegExp;
  readonly explanation: () => string;
}

const RULES: readonly SshFailureRule[] = [
  {
    pattern: /host key verification failed|remote host identification has changed/i,
    explanation: () => l10n.t('The SSH host key could not be verified. Connect once in a terminal with "ssh" to review and accept it, then try again.'),
  },
  {
    pattern: /permission denied/i,
    explanation: () => l10n.t('The SSH server refused the key. Check the user and the key file, or add a key protected by a passphrase to ssh-agent. Password login is not supported.'),
  },
  {
    pattern: /unprotected private key|bad permissions/i,
    explanation: () => l10n.t('SSH refused to use the key because its file permissions are too open.'),
  },
  {
    pattern: /could not resolve hostname|name or service not known|no such host/i,
    explanation: () => l10n.t('The SSH host name could not be resolved.'),
  },
  {
    pattern: /connection timed out|operation timed out|connection refused|no route to host|network is unreachable/i,
    explanation: () => l10n.t('The SSH server could not be reached.'),
  },
  {
    pattern: /address already in use|cannot listen to port/i,
    explanation: () => l10n.t('The local port for the tunnel is already in use. Try again.'),
  },
  {
    pattern: /administratively prohibited|forwarding disabled/i,
    explanation: () => l10n.t('The SSH server does not allow port forwarding for this user.'),
  },
];

export function explainSshFailure(stderr: string, errorCode?: string): string {
  if (errorCode === 'ENOENT') {
    return l10n.t('The "ssh" command was not found. Install an OpenSSH client and make sure it is on your PATH.');
  }
  const details = stderr.trim();
  const explanation = RULES.find((rule) => rule.pattern.test(details))?.explanation() ?? l10n.t('The SSH tunnel could not be opened.');
  return details ? l10n.t('{0} ({1})', explanation, details) : explanation;
}
