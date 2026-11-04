import { buildDiagram } from '../../../../application/diagram/model/buildDiagram';
import { layoutDiagram } from '../../../../application/diagram/layout/layoutDiagram';
import type { TablePropertiesView } from '../../../contracts/TableEditorMessages';
import { l10n } from '../../../../domain/i18n/l10n';
import { DiagramCanvas } from '../../diagram/canvas/DiagramCanvas';
import { createElement } from '../../shared/createElement';

const ZOOM_STEP = 1.25;

export class DiagramTab {
  readonly element: HTMLElement;
  private readonly canvas: DiagramCanvas;
  private readonly zoomLabel = createElement('span', { className: 'muted', text: '100%' });
  private needsFit = true;

  constructor(onOpenTable: (table: string) => void) {
    this.canvas = new DiagramCanvas({
      onTableMoved: () => undefined,
      onTableOpened: onOpenTable,
      onZoomChanged: (scale) => {
        this.zoomLabel.textContent = `${Math.round(scale * 100)}%`;
      },
    });
    this.element = createElement('div', { className: 'diagram-tab' }, [
      createElement('div', { className: 'toolbar-row' }, [
        createElement('button', { className: 'secondary', text: '−', title: l10n.t('Zoom out'), onClick: () => this.canvas.zoomBy(1 / ZOOM_STEP) }),
        this.zoomLabel,
        createElement('button', { className: 'secondary', text: '+', title: l10n.t('Zoom in'), onClick: () => this.canvas.zoomBy(ZOOM_STEP) }),
        createElement('button', { className: 'secondary', text: l10n.t('Fit'), title: l10n.t('Fit the diagram to the window'), onClick: () => this.canvas.fit() }),
        createElement('span', { className: 'muted', text: l10n.t('This table and its direct relationships. Double-click a table to open it.') }),
      ]),
      createElement('div', { className: 'diagram-stage' }, [this.canvas.element]),
    ]);
  }

  render(properties: TablePropertiesView): void {
    const model = buildDiagram(properties.diagramSchema, 'keys');
    this.canvas.render(model, layoutDiagram(model));
    this.canvas.highlightTable(properties.table.name);
    this.needsFit = true;
  }

  handleShown(): void {
    if (this.needsFit) {
      this.needsFit = false;
      this.canvas.fit();
    }
  }
}
