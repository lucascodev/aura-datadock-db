import { l10n } from '../../../domain/i18n/translation/l10n';

export function validateName(name: string, takenNames: readonly string[]): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) {
    return l10n.t('Enter a name for this connection.');
  }
  return takenNames.some((taken) => taken.toLowerCase() === trimmed.toLowerCase()) ? l10n.t('Another connection already uses this name.') : undefined;
}
