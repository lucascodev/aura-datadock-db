import { l10n } from '../../../domain/i18n/translation/l10n';

export function describeRowCount(fetched: number, isTruncated: boolean, durationMs: number, fetchedAt: Date | undefined): string {
  const seconds = (durationMs / 1000).toLocaleString(l10n.locale(), { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false });
  if (!fetchedAt) {
    return isTruncated
      ? l10n.t('{0} row(s) fetched, more available - {1}s', fetched, seconds)
      : l10n.t('{0} row(s) fetched - {1}s', fetched, seconds);
  }
  const moment = formatFetchedAt(fetchedAt);
  return isTruncated
    ? l10n.t('{0} row(s) fetched, more available - {1}s, on {2}', fetched, seconds, moment)
    : l10n.t('{0} row(s) fetched - {1}s, on {2}', fetched, seconds, moment);
}

function formatFetchedAt(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return l10n.t('{0} at {1}', day, `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`);
}
