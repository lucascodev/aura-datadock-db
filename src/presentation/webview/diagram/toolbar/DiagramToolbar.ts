import type { DiagramDetail } from '../../../../application/diagram/model/DiagramModel';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { SchemaExportFormatView } from '../../../contracts/DiagramMessages';
import { createElement } from '../../shared/dom/createElement';
import type { ToolbarActions } from '../model/ToolbarActions';

function getImageExports() {
  return [
    { id: 'image:svg', label: l10n.t('SVG image') },
    { id: 'image:png', label: l10n.t('PNG image') },
  ] as const;
}

function getDetailOptions(): readonly { readonly id: DiagramDetail; readonly label: string; readonly title: string }[] {
  return [
    { id: 'full', label: l10n.t('All columns'), title: l10n.t('Full database diagram') },
    { id: 'keys', label: l10n.t('Keys only'), title: l10n.t('Only primary and foreign keys') },
    { id: 'entities', label: l10n.t('Entities'), title: l10n.t('Conceptual entity-relationship model') },
  ];
}

export class DiagramToolbar {
  readonly element: HTMLElement;
  private readonly namespaceSelect = createElement('select', { title: l10n.t('Schema') });
  private readonly statusLabel = createElement('span', { className: 'status' });
  private readonly zoomLabel = createElement('span', { className: 'zoom-label', text: '100%' });
  private readonly searchInput = createElement('input', { className: 'search' });
  private readonly exportSelect = createElement('select', { title: l10n.t('Export the diagram or the schema') });
  private readonly detailButtons: readonly HTMLElement[];

  constructor(private readonly actions: ToolbarActions) {
    this.detailButtons = getDetailOptions().map((option) =>
      createElement('button', { text: option.label, title: option.title, className: 'segment', onClick: () => actions.onDetailChange(option.id) }),
    );
    this.bindInputs();
    this.element = this.createLayout();
  }

  renderNamespaces(namespaces: readonly string[], selected: string): void {
    this.namespaceSelect.replaceChildren(...namespaces.map((namespace) => {
      const option = createElement('option', { text: namespace });
      option.value = namespace;
      return option;
    }));
    this.namespaceSelect.value = selected;
  }

  renderExportOptions(exportFormats: readonly SchemaExportFormatView[]): void {
    const placeholder = createElement('option', { text: l10n.t('Export…') });
    placeholder.value = '';
    const options = [
      ...getImageExports(),
      ...exportFormats.map((format) => ({ id: `schema:${format.id}`, label: format.label })),
    ].map((entry) => {
      const option = createElement('option', { text: entry.label });
      option.value = entry.id;
      return option;
    });
    this.exportSelect.replaceChildren(placeholder, ...options);
  }

  renderDetailButtons(detail: DiagramDetail): void {
    getDetailOptions().forEach((option, index) => this.detailButtons[index].classList.toggle('active', option.id === detail));
  }

  setStatus(text: string): void {
    this.statusLabel.textContent = text;
  }

  setZoom(scale: number): void {
    this.zoomLabel.textContent = `${Math.round(scale * 100)}%`;
  }

  private bindInputs(): void {
    const { actions, searchInput, namespaceSelect, exportSelect } = this;
    searchInput.type = 'search';
    searchInput.placeholder = l10n.t('Find table');
    searchInput.addEventListener('input', () => actions.onSearch(searchInput.value));
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        actions.onSearchSubmit();
      }
    });
    namespaceSelect.addEventListener('change', () => actions.onNamespaceChange(namespaceSelect.value));
    exportSelect.addEventListener('change', () => {
      const choice = exportSelect.value;
      exportSelect.value = '';
      actions.onExportChoice(choice);
    });
  }

  private createLayout(): HTMLElement {
    const { actions } = this;
    return createElement('div', { className: 'toolbar' }, [
      this.namespaceSelect,
      createElement('div', { className: 'segments' }, this.detailButtons),
      this.searchInput,
      this.statusLabel,
      createElement('span', { className: 'flex' }),
      createElement('button', { className: 'secondary', text: '−', title: l10n.t('Zoom out'), onClick: () => actions.onZoomOut() }),
      this.zoomLabel,
      createElement('button', { className: 'secondary', text: '+', title: l10n.t('Zoom in'), onClick: () => actions.onZoomIn() }),
      createElement('button', { className: 'secondary', text: l10n.t('Fit'), title: l10n.t('Fit the diagram to the window'), onClick: () => actions.onFit() }),
      createElement('button', { className: 'secondary', text: l10n.t('Auto layout'), title: l10n.t('Discard manual positions'), onClick: () => actions.onAutoLayout() }),
      createElement('button', { className: 'secondary', text: l10n.t('Refresh'), title: l10n.t('Read the schema again'), onClick: () => actions.onRefresh() }),
      this.exportSelect,
    ]);
  }
}
