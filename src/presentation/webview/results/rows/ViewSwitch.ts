import { l10n } from '../../../../domain/i18n/translation/l10n';
import { createElement } from '../../shared/dom/createElement';
import type { ChartView } from '../chart/ChartView';
import type { ResultGrid } from '../grid/ResultGrid';
import type { ResultView } from '../model/ResultView';
import type { ResultsSession } from '../session/ResultsSession';

const VIEWS: readonly ResultView[] = ['grid', 'chart'];

export class ViewSwitch {
  readonly element: HTMLElement;
  private readonly buttons: readonly HTMLElement[];
  private isChartShown = false;

  constructor(
    private readonly session: ResultsSession,
    private readonly grid: ResultGrid,
    private readonly gridTools: HTMLElement,
    private readonly chart: ChartView,
  ) {
    this.buttons = VIEWS.map((view) =>
      createElement('button', {
        className: 'view-button',
        text: view === 'grid' ? l10n.t('Grid') : l10n.t('Chart'),
        onClick: () => this.show(view),
      }),
    );
    this.element = createElement('span', { className: 'view-switch' }, this.buttons);
    this.element.setAttribute('role', 'group');
    this.element.setAttribute('aria-label', l10n.t('Show the result as'));
  }

  show(view: ResultView): void {
    this.session.selectView(view);
    this.buttons.forEach((button, index) => button.classList.toggle('active', VIEWS[index] === view));
    this.grid.element.hidden = view !== 'grid';
    this.gridTools.hidden = view !== 'grid';
    this.chart.element.hidden = view !== 'chart';
    if (view === 'grid') {
      queueMicrotask(() => this.grid.mount());
    } else if (!this.isChartShown) {
      this.isChartShown = true;
      queueMicrotask(() => this.chart.show());
    }
  }
}
