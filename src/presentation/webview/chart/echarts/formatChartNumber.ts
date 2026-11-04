import { l10n } from '../../../../domain/i18n/translation/l10n';

const COMPACT_THRESHOLD = 10_000;
const MAX_FRACTION_DIGITS = 4;

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
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

const compactFormat = () => getFormatter({ notation: 'compact', maximumFractionDigits: 1 });
const fullFormat = () => getFormatter({ maximumFractionDigits: MAX_FRACTION_DIGITS });

export function createAxisFormatter(values: readonly number[]): (value: number) => string {
  const largest = values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const format = largest >= COMPACT_THRESHOLD ? compactFormat() : fullFormat();
  return (value) => format.format(value);
}

export function formatAxisNumber(value: number): string {
  return createAxisFormatter([value])(value);
}

export function formatBinEdge(value: number, binWidth: number): string {
  const fractionDigits = binWidth >= 1 || binWidth === 0 ? 0 : Math.min(MAX_FRACTION_DIGITS, Math.ceil(-Math.log10(binWidth)));
  return getFormatter({ maximumFractionDigits: fractionDigits }).format(value);
}

export function formatFullNumber(value: number): string {
  return fullFormat().format(value);
}
