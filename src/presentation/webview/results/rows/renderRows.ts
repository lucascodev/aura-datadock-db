import type { ExportFormatView } from '../../../contracts/ResultsMessages';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import { createElement } from '../../shared/dom/createElement';
import { ResultGrid } from '../grid/ResultGrid';
import type { ResultsContext } from '../model/ResultsContext';
import type { RowsResult } from '../model/RowsResult';
import { createChartView } from './createChartView';
import { describeRowCount } from './describeRowCount';
import { renderExportControls } from './renderExportControls';
import { renderSelectionActions } from './renderSelectionActions';
import { ViewSwitch } from './ViewSwitch';

function createGrid(context: ResultsContext, result: RowsResult, summary: HTMLElement, selectionActions: HTMLElement): ResultGrid {
  const grid: ResultGrid = new ResultGrid(result.columns, result.rows, {
    onCountChange: (visibleRows) => {
      summary.textContent = describeRowCount(visibleRows, result);
    },
    onOpenValue: (text) => context.host.postMessage({ type: 'openValue', text }),
    onSelectionChange: (selection) => {
      selectionActions.replaceChildren(...(selection ? renderSelectionActions(context, grid) : []));
    },
  });
  return grid;
}

function createFilter(grid: ResultGrid): HTMLInputElement {
  const filter = createElement('input', { className: 'filter' });
  filter.type = 'search';
  filter.placeholder = l10n.t('Filter rows');
  filter.addEventListener('input', () => grid.setFilter(filter.value));
  return filter;
}

export function renderRows(context: ResultsContext, result: RowsResult, exportFormats: readonly ExportFormatView[]): HTMLElement[] {
  const summary = createElement('span', { className: 'summary' });
  const selectionActions = createElement('span', { className: 'selection-actions' });
  summary.textContent = describeRowCount(result.rows.length, result);

  const grid = createGrid(context, result, summary, selectionActions);
  const gridTools = createElement('span', { className: 'grid-tools' }, [createFilter(grid), summary, selectionActions]);
  const chart = createChartView(context, result);
  context.session.trackChart(chart);

  const viewSwitch = new ViewSwitch(context.session, grid, gridTools, chart);
  viewSwitch.show(context.session.view);

  const toolbar = createElement('div', { className: 'toolbar' }, [
    viewSwitch.element,
    gridTools,
    createElement('span', { className: 'spacer-flex' }),
    ...renderExportControls(context, exportFormats),
  ]);
  return [toolbar, grid.element, chart.element];
}
