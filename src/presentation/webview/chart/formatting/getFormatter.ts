import { l10n } from '../../../../domain/i18n/translation/l10n';

const formatterCache = new Map<string, Intl.NumberFormat>();

export function getFormatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = l10n.locale();
  const key = `${locale}|${JSON.stringify(options)}`;
  const cached = formatterCache.get(key);
  if (cached) {
    return cached;
  }
  const created = new Intl.NumberFormat(locale, options);
  formatterCache.set(key, created);
  return created;
}
