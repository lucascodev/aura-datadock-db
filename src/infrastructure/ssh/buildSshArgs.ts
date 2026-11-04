import { isSafeCommandValue } from '../../application/connections/saved/validateConnectionInput';
import type { SshSettings } from '../../domain/connection/model/SshSettings';
import { l10n } from '../../domain/i18n/translation/l10n';
import type { TunnelEndpoint } from './TunnelEndpoint';

export const LOOPBACK_ADDRESS = '127.0.0.1';

const BASE_OPTIONS = ['-o', 'ExitOnForwardFailure=yes', '-o', 'BatchMode=yes', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3'];

export function buildSshArgs(settings: SshSettings, destination: TunnelEndpoint, localPort: number, extraArgs: readonly string[] = []): string[] {
  assertSafe(settings.host, 'SSH host');
  assertSafe(destination.host, 'database host');
  if (settings.user !== undefined) {
    assertSafe(settings.user, 'SSH user');
  }
  if (settings.jumpHost !== undefined) {
    assertSafe(settings.jumpHost, 'SSH jump host');
  }
  if (settings.identityFile?.startsWith('-')) {
    throw new Error(l10n.t('Invalid SSH key path'));
  }

  return [
    '-N',
    '-L',
    `${LOOPBACK_ADDRESS}:${localPort}:${formatHost(destination.host)}:${destination.port}`,
    ...BASE_OPTIONS,
    ...extraArgs,
    ...(settings.port !== undefined ? ['-p', String(settings.port)] : []),
    ...(settings.user !== undefined ? ['-l', settings.user] : []),
    ...(settings.identityFile !== undefined ? ['-i', settings.identityFile] : []),
    ...(settings.jumpHost !== undefined ? ['-J', settings.jumpHost] : []),
    '--',
    settings.host,
  ];
}

function assertSafe(value: string, label: string): void {
  if (!isSafeCommandValue(value)) {
    throw new Error(l10n.t('Invalid {0}: it cannot be empty, contain spaces or start with a hyphen', label));
  }
}

function formatHost(host: string): string {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}
