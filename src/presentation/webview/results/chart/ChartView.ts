import { buildChartData } from '../../../../application/charts/builders/buildChartData';
import { adaptConfig } from '../../../../application/charts/inference/adaptConfig';
import { describeColumns } from '../../../../application/charts/inference/inferColumnKind';
import { suggestChart } from '../../../../application/charts/inference/suggestChart';
import type { ChartConfig } from '../../../../application/charts/model/config/ChartConfig';
import type { ChartData, DrawableChartData } from '../../../../application/charts/model/data/ChartData';
import type { ChartInput } from '../../../../application/charts/model/config/ChartInput';
import type { ChartKind } from '../../../../application/charts/model/config/ChartKind';
import type { ColumnInfo } from '../../../../application/charts/model/config/ColumnKind';
import { createElement } from '../../shared/createElement';
import type { ChartRenderer } from '../../chart/renderer/ChartRenderer';
import { renderChartControls } from './ChartControls';
import { loadChartModule } from './loadChartModule';
import { l10n } from '../../../../domain/i18n/translation/l10n';

const FALLBACK_KIND: ChartKind = 'bar';

interface ChartViewCallbacks {
  onConfigChange(config: ChartConfig): void;
  onSaveImage(format: 'png' | 'svg', content: string): void;
}

function isDrawable(data: ChartData): data is DrawableChartData {
  return data.form !== 'stat' && data.form !== 'empty';
}

export class ChartView {
  readonly element = createElement('div', { className: 'chart-view' });
  private readonly controls = createElement('div');
  private readonly scope = createElement('div', { className: 'summary' });
  private readonly notices = createElement('div', { className: 'chart-notices' });
  private readonly stage = createElement('div', { className: 'chart-stage' });
  private readonly message = createElement('div', { className: 'chart-message' });
  private readonly columns: readonly ColumnInfo[];
  private readonly resizeObserver: ResizeObserver;
  private readonly themeObserver: MutationObserver;
  private config: ChartConfig;
  private data?: ChartData;
  private renderer?: ChartRenderer;
  private isDisposed = false;

  constructor(
    private readonly input: ChartInput,
    savedConfig: ChartConfig | undefined,
    private readonly callbacks: ChartViewCallbacks,
  ) {
    this.columns = describeColumns(input);
    this.config = savedConfig ?? suggestChart(this.columns, input.rows.length) ?? adaptConfig(FALLBACK_KIND, { kind: FALLBACK_KIND, y: [], showRegression: false }, this.columns);
    this.resizeObserver = new ResizeObserver(() => this.renderer?.resize());
    this.themeObserver = new MutationObserver(() => this.draw());
    this.scope.textContent = l10n.t('Using all {0} row(s) of the result. The grid filter does not apply here.', input.rows.length);
    this.element.append(this.controls, this.scope, this.notices, this.stage, this.message);
  }

  show(): void {
    this.resizeObserver.observe(this.stage);
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    this.refresh();
  }

  dispose(): void {
    this.isDisposed = true;
    this.resizeObserver.disconnect();
    this.themeObserver.disconnect();
    this.renderer?.dispose();
    this.renderer = undefined;
  }

  private setConfig(config: ChartConfig): void {
    this.config = config;
    this.callbacks.onConfigChange(config);
    this.refresh();
  }

  private refresh(): void {
    this.data = buildChartData(this.input, this.config);
    this.controls.replaceChildren(
      renderChartControls(
        {
          config: this.config,
          columns: this.columns,
          canUseStat: this.input.rows.length === 1 && this.input.columns.length === 1,
          canExport: isDrawable(this.data),
        },
        {
          onKindChange: (kind) => this.setConfig(adaptConfig(kind, this.config, this.columns)),
          onConfigChange: (config) => this.setConfig(config),
          onExport: (format) => this.exportImage(format),
        },
      ),
    );
    this.scope.hidden = !isDrawable(this.data);
    this.notices.replaceChildren(...this.data.notices.map((notice) => createElement('div', { className: 'chart-notice', text: notice.message })));
    this.draw();
  }

  private draw(): void {
    const { data } = this;
    if (!data) {
      return;
    }
    if (!isDrawable(data)) {
      this.stage.hidden = true;
      this.message.hidden = false;
      this.message.replaceChildren(...this.renderWithoutChart(data));
      return;
    }
    this.message.hidden = true;
    this.stage.hidden = false;
    void this.drawChart(data);
  }

  private renderWithoutChart(data: Exclude<ChartData, DrawableChartData>): HTMLElement[] {
    if (data.form === 'stat') {
      return [createElement('div', { className: 'stat-label', text: data.label }), createElement('div', { className: 'stat-value', text: data.value })];
    }
    return [createElement('div', { className: 'empty', text: data.reason })];
  }

  private async drawChart(data: DrawableChartData): Promise<void> {
    try {
      const renderer = this.renderer ?? (await this.createRenderer());
      if (renderer && this.data === data) {
        renderer.render(data);
        renderer.resize();
      }
    } catch (error) {
      this.showFailure(error);
    }
  }

  private async createRenderer(): Promise<ChartRenderer | undefined> {
    const chartModule = await loadChartModule();
    if (this.isDisposed) {
      return undefined;
    }
    this.renderer ??= chartModule.createRenderer(this.stage);
    return this.renderer;
  }

  private exportImage(format: 'png' | 'svg'): void {
    const { data, renderer } = this;
    if (!renderer || !data || !isDrawable(data)) {
      return;
    }
    try {
      this.callbacks.onSaveImage(format, format === 'png' ? renderer.exportPng(data) : renderer.exportSvg(data));
    } catch (error) {
      this.showFailure(error);
    }
  }

  private showFailure(error: unknown): void {
    this.stage.hidden = true;
    this.message.hidden = false;
    this.message.replaceChildren(createElement('div', { className: 'error', text: error instanceof Error ? error.message : String(error) }));
  }
}
