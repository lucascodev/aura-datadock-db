import type { ChartNotice } from '../model/data/ChartNotice';
import { otherLabel } from './foldByWeight';
import { l10n } from '../../../domain/i18n/translation/l10n';
import type { RowTally } from '../model/data/RowTally';

export function createTally(): RowTally {
  return { unusable: 0, merged: 0, folded: 0, isApproximate: false };
}

export function tallyNotices(tally: RowTally): ChartNotice[] {
  const notices: ChartNotice[] = [];
  if (tally.unusable > 0) {
    notices.push({ kind: 'unusable', message: l10n.t('{0} row(s) have NULL or unusable values, so they are left out or leave gaps.', tally.unusable) });
  }
  if (tally.merged > 0) {
    notices.push({ kind: 'merged', message: l10n.t('{0} row(s) repeat a position already drawn, so their values were added together.', tally.merged) });
  }
  if (tally.folded > 0) {
    notices.push({ kind: 'folded', message: l10n.t('{0} group(s) are combined into {1}.', tally.folded, otherLabel()) });
  }
  if (tally.isApproximate) {
    notices.push({ kind: 'approximate', message: l10n.t('Some integers are too large to draw exactly, so they are approximated here. The grid shows the exact values.') });
  }
  return notices;
}
