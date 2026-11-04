import { ChartView } from '../chart/ChartView';
import type { ResultsContext } from '../model/ResultsContext';
import type { RowsResult } from '../model/RowsResult';

const COLUMN_KEY_SEPARATOR = '\u0000';

export function createChartView(context: ResultsContext, result: RowsResult): ChartView {
  const columnsKey = result.columns.map((column) => column.name).join(COLUMN_KEY_SEPARATOR);
  return new ChartView(
    { columns: result.columns.map((column) => column.name), rows: result.rows, isTruncated: result.isTruncated },
    context.session.savedConfigFor(columnsKey),
    {
      onConfigChange: (config) => context.session.saveChart(columnsKey, config),
      onSaveImage: (format, content) => context.host.postMessage({ type: 'saveChartImage', format, content }),
    },
  );
}
