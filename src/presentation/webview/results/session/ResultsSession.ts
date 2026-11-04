import type { ChartConfig } from '../../../../application/charts/model/config/ChartConfig';
import type { ExportFormatView, ResultSetView, ResultsViewState } from '../../../contracts/ResultsMessages';
import type { ChartView } from '../chart/ChartView';
import type { ResultView } from '../model/ResultView';

interface SavedChart {
  readonly columnsKey: string;
  readonly config: ChartConfig;
}

function defaultResultIndex(results: readonly ResultSetView[]): number {
  const failed = results.findIndex((result) => result.status === 'error');
  return failed !== -1 ? failed : Math.max(0, results.length - 1);
}

export class ResultsSession {
  private currentState?: ResultsViewState;
  private currentResultIndex = 0;
  private currentExportFormatId?: ExportFormatView['id'];
  private currentView: ResultView = 'grid';
  private savedChart?: SavedChart;
  private activeChart?: ChartView;

  get state(): ResultsViewState | undefined {
    return this.currentState;
  }

  get resultIndex(): number {
    return this.currentResultIndex;
  }

  get exportFormatId(): ExportFormatView['id'] | undefined {
    return this.currentExportFormatId;
  }

  get view(): ResultView {
    return this.currentView;
  }

  receive(state: ResultsViewState): void {
    this.currentState = state;
    this.currentResultIndex = state.phase === 'done' ? defaultResultIndex(state.results) : 0;
  }

  selectResult(index: number): void {
    this.currentResultIndex = index;
  }

  selectView(view: ResultView): void {
    this.currentView = view;
  }

  rememberExportFormat(id: ExportFormatView['id']): void {
    this.currentExportFormatId = id;
  }

  savedConfigFor(columnsKey: string): ChartConfig | undefined {
    return this.savedChart?.columnsKey === columnsKey ? this.savedChart.config : undefined;
  }

  saveChart(columnsKey: string, config: ChartConfig): void {
    this.savedChart = { columnsKey, config };
  }

  trackChart(chart: ChartView): void {
    this.activeChart = chart;
  }

  disposeChart(): void {
    this.activeChart?.dispose();
    this.activeChart = undefined;
  }
}
