import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { DiagramDetail } from '../../../../application/diagram/model/DiagramModel';
import type { DiagramHostMessage } from '../../../contracts/DiagramMessages';
import { createElement } from '../../shared/dom/createElement';
import { DiagramCanvas } from '../canvas/DiagramCanvas';
import { ZOOM_STEP } from '../constants/zoomStep';
import { runExport } from '../export/runExport';
import type { DiagramHost } from '../model/DiagramHost';
import { DiagramState } from '../state/DiagramState';
import { DiagramToolbar } from '../toolbar/DiagramToolbar';

export class DiagramController {
  private readonly state = new DiagramState();
  private readonly canvas: DiagramCanvas;
  private readonly toolbar: DiagramToolbar;
  private readonly messagePane = createElement('div', { className: 'message' });

  constructor(
    private readonly host: DiagramHost,
    app: HTMLElement,
  ) {
    this.canvas = new DiagramCanvas({
      onTableMoved: (tableName, position) => {
        this.state.moveTable(tableName, position);
        this.persistPositions();
      },
      onTableOpened: (table) => this.openTable(table),
      onZoomChanged: (scale) => this.toolbar.setZoom(scale),
    });
    this.toolbar = this.createToolbar();
    app.append(this.toolbar.element, createElement('div', { className: 'stage' }, [this.canvas.element, this.messagePane]));
    this.toolbar.renderDetailButtons(this.state.detail);
  }

  handleHostMessage(message: DiagramHostMessage): void {
    switch (message.type) {
      case 'loading':
        this.showMessage(l10n.t('Reading the schema…'));
        return;
      case 'failed':
        this.showMessage(message.message);
        return;
      case 'schema':
        this.receiveSchema(message);
        return;
    }
  }

  private createToolbar(): DiagramToolbar {
    return new DiagramToolbar({
      onNamespaceChange: (namespace) => this.host.postMessage({ type: 'selectNamespace', namespace }),
      onDetailChange: (detail) => this.setDetail(detail),
      onSearch: (text) => this.canvas.search(text),
      onSearchSubmit: () => this.canvas.focusFirstMatch(),
      onZoomOut: () => this.canvas.zoomBy(1 / ZOOM_STEP),
      onZoomIn: () => this.canvas.zoomBy(ZOOM_STEP),
      onFit: () => this.canvas.fit(),
      onAutoLayout: () => this.resetLayout(),
      onRefresh: () => this.host.postMessage({ type: 'refresh' }),
      onExportChoice: (choice) => this.exportChoice(choice),
    });
  }

  private receiveSchema(message: Extract<DiagramHostMessage, { type: 'schema' }>): void {
    const isSameNamespace = this.state.receiveSchema(message);
    this.toolbar.renderNamespaces(message.namespaces, message.schema.namespace);
    this.toolbar.renderExportOptions(this.state.exportFormats);
    this.redraw(!isSameNamespace);
  }

  private setDetail(detail: DiagramDetail): void {
    this.state.selectDetail(detail);
    this.toolbar.renderDetailButtons(detail);
    this.redraw(true);
  }

  private redraw(shouldFit: boolean): void {
    const { schema } = this.state;
    const model = this.state.rebuildModel();
    if (!schema || !model) {
      return;
    }
    if (model.tables.length === 0) {
      this.showMessage(l10n.t('The schema "{0}" has no tables.', schema.namespace));
      this.toolbar.setStatus('');
      return;
    }
    this.hideMessage();
    this.canvas.render(model, this.state.positionsFor(model));
    this.toolbar.setStatus(l10n.t('{0} tables · {1} relationships', model.tables.length, model.edges.length));
    if (shouldFit) {
      this.canvas.fit();
    }
  }

  private resetLayout(): void {
    this.state.clearPositions();
    this.persistPositions();
    this.redraw(true);
  }

  private persistPositions(): void {
    const { schema } = this.state;
    if (schema) {
      this.host.postMessage({ type: 'savePositions', namespace: schema.namespace, positions: this.state.savedPositions });
    }
  }

  private openTable(table: string): void {
    const { schema } = this.state;
    if (schema) {
      this.host.postMessage({ type: 'openTable', namespace: schema.namespace, table });
    }
  }

  private exportChoice(choice: string): void {
    const { schema, model } = this.state;
    if (schema && model) {
      void runExport(this.host, this.canvas, schema, model, choice);
    }
  }

  private showMessage(text: string): void {
    this.messagePane.textContent = text;
    this.messagePane.classList.add('visible');
    this.canvas.element.classList.add('hidden');
  }

  private hideMessage(): void {
    this.messagePane.classList.remove('visible');
    this.canvas.element.classList.remove('hidden');
  }
}
