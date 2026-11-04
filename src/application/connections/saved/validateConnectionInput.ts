import type { ConnectionInput } from '../model/ConnectionInput';
import { l10n } from '../../../domain/i18n/translation/l10n';
import type { ConnectionFieldErrors, ConnectionValidation } from '../model/ConnectionValidation';
import { toConnection } from '../validation/toConnection';
import { validateHost } from '../validation/validateHost';
import { validateName } from '../validation/validateName';
import { validatePort } from '../validation/validatePort';
import { validateSsh } from '../validation/validateSsh';
import { validateUser } from '../validation/validateUser';

export function validateConnectionInput(input: ConnectionInput, takenNames: readonly string[]): ConnectionValidation {
  const errors: ConnectionFieldErrors = {
    name: validateName(input.name, takenNames),
    host: validateHost(input.host, l10n.t('Enter the host of the database.')),
    port: validatePort(input.port, true),
    user: validateUser(input.user),
    ...(input.usesSsh ? validateSsh(input) : {}),
  };
  const found = Object.fromEntries(Object.entries(errors).filter(([, message]) => message !== undefined));
  if (Object.keys(found).length > 0) {
    return { isValid: false, errors: found };
  }
  return { isValid: true, connection: toConnection(input) };
}
