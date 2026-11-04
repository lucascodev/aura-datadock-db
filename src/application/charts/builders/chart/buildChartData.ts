import type { ChartConfig } from '../../model/config/ChartConfig';
import type { ChartData } from '../../model/data/ChartData';
import type { ChartInput } from '../../model/config/ChartInput';
import type { ChartNotice } from '../../model/data/ChartNotice';
import { buildDataByKind } from './buildDataByKind';
import { missingColumnReason } from './missingColumnReason';
import { l10n } from '../../../../domain/i18n/translation/l10n';

function truncatedNotice(): ChartNotice {
  return {
    kind: 'truncated',
    message: l10n.t('This chart shows only part of the result, because the query returned more rows than auraDataDockDb.maxRows. Aggregate with GROUP BY, or raise the setting.'),
  };
}

export function buildChartData(input: ChartInput, config: ChartConfig): ChartData {
  if (input.rows.length === 0) {
    return { form: 'empty', reason: l10n.t('The query returned no rows.'), notices: [] };
  }
  const reason = missingColumnReason(input, config);
  const data: ChartData = reason ? { form: 'empty', reason, notices: [] } : buildDataByKind(input, config);
  return input.isTruncated ? { ...data, notices: [truncatedNotice(), ...data.notices] } : data;
}
