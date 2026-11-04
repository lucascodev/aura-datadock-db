import { l10n } from '../../../domain/i18n/translation/l10n';
import { isSafeCommandValue } from '../saved/isSafeCommandValue';

export function validateHost(host: string, requiredMessage: string): string | undefined {
  const trimmed = host.trim();
  if (!trimmed) {
    return requiredMessage;
  }
  return isSafeCommandValue(trimmed) ? undefined : l10n.t('A host cannot contain spaces or start with a hyphen.');
}
