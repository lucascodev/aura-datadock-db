import { l10n } from '../../../domain/i18n/translation/l10n';
import type { ConnectionInput } from '../model/ConnectionInput';
import type { ConnectionFieldErrors } from '../model/ConnectionValidation';
import { isSafeCommandValue } from '../saved/isSafeCommandValue';
import { validateHost } from './validateHost';
import { validatePort } from './validatePort';

function validateOptionalValue(value: string, message: string): string | undefined {
  const trimmed = value.trim();
  return !trimmed || isSafeCommandValue(trimmed) ? undefined : message;
}

export function validateSsh(input: ConnectionInput): ConnectionFieldErrors {
  return {
    sshHost: validateHost(input.sshHost, l10n.t('Enter the SSH host or an alias from your SSH config.')),
    sshPort: validatePort(input.sshPort, false),
    sshUser: validateOptionalValue(input.sshUser, l10n.t('An SSH user cannot contain spaces or start with a hyphen.')),
    sshJumpHost: validateOptionalValue(input.sshJumpHost, l10n.t('A jump host cannot contain spaces or start with a hyphen.')),
    sshIdentityFile: input.sshIdentityFile.trim().startsWith('-') ? l10n.t('A key path cannot start with a hyphen.') : undefined,
  };
}
