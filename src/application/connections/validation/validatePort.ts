import { l10n } from '../../../domain/i18n/translation/l10n';

const MAX_PORT = 65535;

export function validatePort(port: string, isRequired: boolean): string | undefined {
  const trimmed = port.trim();
  if (!trimmed) {
    return isRequired ? l10n.t('Enter the port.') : undefined;
  }
  const value = Number(trimmed);
  return Number.isInteger(value) && value >= 1 && value <= MAX_PORT ? undefined : l10n.t('Enter a port from 1 to {0}.', MAX_PORT);
}
