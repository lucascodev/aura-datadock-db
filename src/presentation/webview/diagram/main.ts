import { buildDiagram } from '../../../application/diagram/building/buildDiagram';
import type { DiagramDetail, DiagramModel, DiagramPoint, DiagramPositions } from '../../../application/diagram/model/DiagramModel';
import { EXPORT_PALETTE } from '../../../application/diagram/constants/exportPalette';
import { layoutDiagram } from '../../../application/diagram/layout/layoutDiagram';
import { measureExportSize, renderDiagramSvg } from '../../../application/diagram/render/renderDiagramSvg';
import type { NamespaceSchema } from '../../../domain/schema/model/NamespaceSchema';
import type { DiagramHostMessage, DiagramWebviewMessage, SchemaExportFormatView } from '../../contracts/DiagramMessages';
import { l10n, useL10nCatalog } from '../../../domain/i18n/translation/l10n';
import { readL10nCatalog } from '../shared/readL10nCatalog';
import { createElement } from '../shared/createElement';
import { connectToHost } from '../shared/vscodeApi';
import { DiagramCanvas } from './canvas/DiagramCanvas';
import { rasterizeSvg } from './export/rasterizeSvg';

useL10nCatalog(readL10nCatalog());

const ZOOM_STEP = 1.25;

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

const host = connectToHost<DiagramWebviewMessage>();
const app = document.getElementById('app') as HTMLElement;

let schema: NamespaceSchema | undefined;
let model: DiagramModel | undefined;
let detail: DiagramDetail = 'full';
let savedPositions: Record<string, DiagramPoint> = {};
let exportFormats: readonly SchemaExportFormatView[] = [];

const canvas = new DiagramCanvas({
  onTableMoved: (tableName, position) => {
    savedPositions = { ...savedPositions, [tableName]: position };
    persistPositions();
  },
  onTableOpened: (table) => {
    if (schema) {
      host.postMessage({ type: 'openTable', namespace: schema.namespace, table });
    }
  },
  onZoomChanged: (scale) => {
    zoomLabel.textContent = `${Math.round(scale * 100)}%`;
  },
});

const namespaceSelect = createElement('select', { title: l10n.t('Schema') });
const statusLabel = createElement('span', { className: 'status' });
const zoomLabel = createElement('span', { className: 'zoom-label', text: '100%' });
const searchInput = createElement('input', { className: 'search' });
const exportSelect = createElement('select', { title: l10n.t('Export the diagram or the schema') });
const detailButtons = getDetailOptions().map((option) =>
  createElement('button', { text: option.label, title: option.title, className: 'segment', onClick: () => setDetail(option.id) }),
);
const messagePane = createElement('div', { className: 'message' });

searchInput.type = 'search';
searchInput.placeholder = l10n.t('Find table');
searchInput.addEventListener('input', () => canvas.search(searchInput.value));
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    canvas.focusFirstMatch();
  }
});
namespaceSelect.addEventListener('change', () => host.postMessage({ type: 'selectNamespace', namespace: namespaceSelect.value }));
exportSelect.addEventListener('change', () => {
  const choice = exportSelect.value;
  exportSelect.value = '';
  void runExport(choice);
});

app.append(
  createElement('div', { className: 'toolbar' }, [
    namespaceSelect,
    createElement('div', { className: 'segments' }, detailButtons),
    searchInput,
    statusLabel,
    createElement('span', { className: 'flex' }),
    createElement('button', { className: 'secondary', text: '−', title: l10n.t('Zoom out'), onClick: () => canvas.zoomBy(1 / ZOOM_STEP) }),
    zoomLabel,
    createElement('button', { className: 'secondary', text: '+', title: l10n.t('Zoom in'), onClick: () => canvas.zoomBy(ZOOM_STEP) }),
    createElement('button', { className: 'secondary', text: l10n.t('Fit'), title: l10n.t('Fit the diagram to the window'), onClick: () => canvas.fit() }),
    createElement('button', { className: 'secondary', text: l10n.t('Auto layout'), title: l10n.t('Discard manual positions'), onClick: resetLayout }),
    createElement('button', { className: 'secondary', text: l10n.t('Refresh'), title: l10n.t('Read the schema again'), onClick: () => host.postMessage({ type: 'refresh' }) }),
    exportSelect,
  ]),
  createElement('div', { className: 'stage' }, [canvas.element, messagePane]),
);

window.addEventListener('message', (event: MessageEvent<DiagramHostMessage>) => handleHostMessage(event.data));
host.postMessage({ type: 'ready' });
renderDetailButtons();

function handleHostMessage(message: DiagramHostMessage): void {
  switch (message.type) {
    case 'loading':
      showMessage(l10n.t('Reading the schema…'));
      return;
    case 'failed':
      showMessage(message.message);
      return;
    case 'schema':
      receiveSchema(message);
      return;
  }
}

function receiveSchema(message: Extract<DiagramHostMessage, { type: 'schema' }>): void {
  const isSameNamespace = schema?.namespace === message.schema.namespace;
  schema = message.schema;
  savedPositions = { ...message.positions };
  exportFormats = message.exportFormats;
  renderNamespaces(message.namespaces, message.schema.namespace);
  renderExportOptions();
  redraw(!isSameNamespace);
}

function renderNamespaces(namespaces: readonly string[], selected: string): void {
  namespaceSelect.replaceChildren(...namespaces.map((namespace) => {
    const option = createElement('option', { text: namespace });
    option.value = namespace;
    return option;
  }));
  namespaceSelect.value = selected;
}

function renderExportOptions(): void {
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
  exportSelect.replaceChildren(placeholder, ...options);
}

function setDetail(next: DiagramDetail): void {
  detail = next;
  renderDetailButtons();
  redraw(true);
}

function renderDetailButtons(): void {
  getDetailOptions().forEach((option, index) => detailButtons[index].classList.toggle('active', option.id === detail));
}

function redraw(shouldFit: boolean): void {
  if (!schema) {
    return;
  }
  model = buildDiagram(schema, detail);
  if (model.tables.length === 0) {
    showMessage(l10n.t('The schema "{0}" has no tables.', schema.namespace));
    statusLabel.textContent = '';
    return;
  }
  hideMessage();
  canvas.render(model, currentPositions(model));
  statusLabel.textContent = l10n.t('{0} tables · {1} relationships', model.tables.length, model.edges.length);
  if (shouldFit) {
    canvas.fit();
  }
}

function currentPositions(current: DiagramModel): DiagramPositions {
  const names = new Set(current.tables.map((table) => table.name));
  const overrides = Object.entries(savedPositions).filter(([name]) => names.has(name));
  return { ...layoutDiagram(current), ...Object.fromEntries(overrides) };
}

function resetLayout(): void {
  savedPositions = {};
  persistPositions();
  redraw(true);
}

function persistPositions(): void {
  if (schema) {
    host.postMessage({ type: 'savePositions', namespace: schema.namespace, positions: savedPositions });
  }
}

async function runExport(choice: string): Promise<void> {
  if (!schema || !model) {
    return;
  }
  const { namespace } = schema;
  if (choice.startsWith('schema:')) {
    host.postMessage({ type: 'exportSchema', namespace, format: choice.slice('schema:'.length) as SchemaExportFormatView['id'] });
    return;
  }

  const positions = canvas.getPositions();
  const svg = renderDiagramSvg(model, positions, EXPORT_PALETTE);
  if (choice === 'image:svg') {
    host.postMessage({ type: 'saveImage', namespace, format: 'svg', content: svg });
    return;
  }
  if (choice === 'image:png') {
    const { width, height } = measureExportSize(model, positions);
    host.postMessage({ type: 'saveImage', namespace, format: 'png', content: await rasterizeSvg(svg, width, height) });
  }
}

function showMessage(text: string): void {
  messagePane.textContent = text;
  messagePane.classList.add('visible');
  canvas.element.classList.add('hidden');
}

function hideMessage(): void {
  messagePane.classList.remove('visible');
  canvas.element.classList.remove('hidden');
}
