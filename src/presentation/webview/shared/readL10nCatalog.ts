import type { L10nCatalog } from '../../../domain/i18n/l10n';

export function readL10nCatalog(): L10nCatalog {
  const { l10n: serializedMessages } = document.body.dataset;
  return {
    locale: document.documentElement.lang,
    messages: serializedMessages ? (JSON.parse(serializedMessages) as Record<string, string>) : undefined,
  };
}
