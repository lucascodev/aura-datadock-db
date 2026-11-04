import type { DiagramEdge, DiagramModel, DiagramPoint, DiagramPositions, DiagramTable } from '../../../../application/diagram/model/DiagramModel';
import { measureDiagram } from '../../../../application/diagram/render/measureDiagram';
import { renderDiagramMarkup } from '../../../../application/diagram/render/renderDiagramMarkup';
import { routeEdge } from '../../../../application/diagram/layout/routeEdge';
import { LIVE_PALETTE } from '../constants/livePalette';
import { relatedEdges, relatedTableNames } from './relatedTables';
import { centerOn, fitToView, zoomAt } from './Viewport';
import type { ViewportTransform } from '../model/ViewportTransform';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const CLICK_MOVE_TOLERANCE = 4;
const SEARCH_FOCUS_SCALE = 1;

interface DiagramCanvasCallbacks {
  readonly onTableMoved: (tableName: string, position: DiagramPoint) => void;
  readonly onTableOpened: (tableName: string) => void;
  readonly onZoomChanged: (scale: number) => void;
}

type PointerGesture =
  | { readonly kind: 'pan'; readonly startX: number; readonly startY: number; readonly origin: ViewportTransform; hasMoved: boolean }
  | { readonly kind: 'drag'; readonly tableName: string; readonly startX: number; readonly startY: number; readonly origin: DiagramPoint; hasMoved: boolean };

export class DiagramCanvas {
  readonly element: SVGSVGElement;
  private readonly content: SVGGElement;
  private model?: DiagramModel;
  private positions: Record<string, DiagramPoint> = {};
  private transform: ViewportTransform = { x: 0, y: 0, scale: 1 };
  private tableElements = new Map<string, SVGGElement>();
  private edgeElements = new Map<string, SVGPathElement>();
  private tableByName = new Map<string, DiagramTable>();
  private gesture?: PointerGesture;
  private selectedTable?: string;
  private searchTerm = '';

  constructor(private readonly callbacks: DiagramCanvasCallbacks) {
    this.element = document.createElementNS(SVG_NAMESPACE, 'svg');
    this.element.setAttribute('class', 'canvas');
    this.content = document.createElementNS(SVG_NAMESPACE, 'g');
    this.element.append(this.content);
    this.registerEvents();
  }

  render(model: DiagramModel, positions: DiagramPositions): void {
    this.model = model;
    this.positions = { ...positions };
    this.tableByName = new Map(model.tables.map((table) => [table.name, table]));
    this.content.innerHTML = renderDiagramMarkup(model, this.positions, LIVE_PALETTE);
    this.tableElements = indexElements<SVGGElement>(this.content, 'data-table');
    this.edgeElements = indexElements<SVGPathElement>(this.content, 'data-edge');
    if (this.selectedTable && !this.tableByName.has(this.selectedTable)) {
      this.selectedTable = undefined;
    }
    this.applyHighlight();
  }

  fit(): void {
    if (!this.model) {
      return;
    }
    const { width, height } = this.element.getBoundingClientRect();
    this.setTransform(fitToView(measureDiagram(this.model, this.positions), width, height));
  }

  zoomBy(factor: number): void {
    const { width, height } = this.element.getBoundingClientRect();
    this.setTransform(zoomAt(this.transform, factor, width / 2, height / 2));
  }

  search(term: string): void {
    this.searchTerm = term.trim().toLowerCase();
    this.applyHighlight();
  }

  focusFirstMatch(): void {
    const match = this.model?.tables.find((table) => this.matchesSearch(table.name));
    const position = match && this.positions[match.name];
    if (!match || !position) {
      return;
    }
    const { width, height } = this.element.getBoundingClientRect();
    this.setTransform(centerOn(position.x + match.width / 2, position.y + match.height / 2, SEARCH_FOCUS_SCALE, width, height));
  }

  getPositions(): DiagramPositions {
    return this.positions;
  }

  private registerEvents(): void {
    this.element.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
    this.element.addEventListener('pointermove', (event) => this.handlePointerMove(event));
    this.element.addEventListener('pointerup', (event) => this.handlePointerUp(event));
    this.element.addEventListener('pointercancel', () => {
      this.gesture = undefined;
    });
    this.element.addEventListener('dblclick', (event) => {
      const tableName = tableNameAt(event);
      if (tableName) {
        this.callbacks.onTableOpened(tableName);
      }
    });
    this.element.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const { left, top } = this.element.getBoundingClientRect();
        this.setTransform(zoomAt(this.transform, Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY), event.clientX - left, event.clientY - top));
      },
      { passive: false },
    );
  }

  private handlePointerDown(event: PointerEvent): void {
    this.element.setPointerCapture(event.pointerId);
    const tableName = tableNameAt(event);
    const position = tableName ? this.positions[tableName] : undefined;
    this.gesture =
      tableName && position
        ? { kind: 'drag', tableName, startX: event.clientX, startY: event.clientY, origin: position, hasMoved: false }
        : { kind: 'pan', startX: event.clientX, startY: event.clientY, origin: this.transform, hasMoved: false };
  }

  private handlePointerMove(event: PointerEvent): void {
    const { gesture } = this;
    if (!gesture) {
      return;
    }
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    gesture.hasMoved ||= Math.hypot(deltaX, deltaY) > CLICK_MOVE_TOLERANCE;
    if (!gesture.hasMoved) {
      return;
    }
    if (gesture.kind === 'pan') {
      this.setTransform({ ...gesture.origin, x: gesture.origin.x + deltaX, y: gesture.origin.y + deltaY });
      return;
    }
    this.moveTable(gesture.tableName, {
      x: Math.round(gesture.origin.x + deltaX / this.transform.scale),
      y: Math.round(gesture.origin.y + deltaY / this.transform.scale),
    });
  }

  private handlePointerUp(event: PointerEvent): void {
    const { gesture } = this;
    this.gesture = undefined;
    if (!gesture) {
      return;
    }
    if (gesture.hasMoved && gesture.kind === 'drag') {
      this.callbacks.onTableMoved(gesture.tableName, this.positions[gesture.tableName]);
    }
    if (!gesture.hasMoved) {
      this.selectTable(gesture.kind === 'drag' ? gesture.tableName : tableNameAt(event));
    }
  }

  private moveTable(tableName: string, position: DiagramPoint): void {
    this.positions[tableName] = position;
    this.tableElements.get(tableName)?.setAttribute('transform', `translate(${position.x} ${position.y})`);
    relatedEdges(this.model?.edges ?? [], tableName).forEach((edge) => this.updateEdge(edge));
  }

  private updateEdge(edge: DiagramEdge): void {
    const path = routeEdge(edge, this.tableByName, this.positions);
    if (path) {
      this.edgeElements.get(edge.id)?.setAttribute('d', path);
    }
  }

  highlightTable(tableName: string): void {
    this.selectedTable = tableName;
    this.applyHighlight();
  }

  private selectTable(tableName: string | undefined): void {
    this.selectedTable = tableName === this.selectedTable ? undefined : tableName;
    this.applyHighlight();
  }

  private applyHighlight(): void {
    const edges = this.model?.edges ?? [];
    const selected = this.selectedTable;
    const related = selected ? relatedTableNames(edges, selected) : undefined;

    for (const [name, element] of this.tableElements) {
      const isDimmed = (related !== undefined && !related.has(name)) || (this.searchTerm !== '' && !this.matchesSearch(name));
      element.classList.toggle('dimmed', isDimmed);
      element.classList.toggle('selected', name === selected);
    }
    for (const edge of edges) {
      const element = this.edgeElements.get(edge.id);
      const isRelated = selected !== undefined && (edge.childTable === selected || edge.parentTable === selected);
      element?.classList.toggle('highlighted', isRelated);
      element?.classList.toggle('dimmed', (selected !== undefined && !isRelated) || this.searchTerm !== '');
    }
  }

  private matchesSearch(tableName: string): boolean {
    return this.searchTerm === '' || tableName.toLowerCase().includes(this.searchTerm);
  }

  private setTransform(transform: ViewportTransform): void {
    this.transform = transform;
    this.content.setAttribute('transform', `translate(${transform.x} ${transform.y}) scale(${transform.scale})`);
    this.callbacks.onZoomChanged(transform.scale);
  }
}

function indexElements<Element extends SVGElement>(root: SVGElement, attribute: string): Map<string, Element> {
  const elements = root.querySelectorAll<Element>(`[${attribute}]`);
  return new Map([...elements].map((element) => [element.getAttribute(attribute) ?? '', element]));
}

function tableNameAt(event: MouseEvent): string | undefined {
  const target = event.target instanceof Element ? event.target : undefined;
  return target?.closest('[data-table]')?.getAttribute('data-table') ?? undefined;
}
