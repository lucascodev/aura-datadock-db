import { l10n } from '../../../domain/i18n/translation/l10n';

export function validateUser(user: string): string | undefined {
  const trimmed = user.trim();
  if (!trimmed) {
    return l10n.t('Enter the user.');
  }
  return trimmed.startsWith('-') ? l10n.t('A user cannot start with a hyphen.') : undefined;
}
