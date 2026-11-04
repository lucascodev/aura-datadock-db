import type { CellValue } from '../../../../../domain/database/model/ParameterizedStatement';
import { l10n } from '../../../../../domain/i18n/translation/l10n';
import type { TableColumnView } from '../../../../contracts/TableEditorMessages';
import { createElement } from '../../../shared/dom/createElement';
import { columnTypeBadge } from './columnTypeBadge';
import { displayValue } from './displayValue';
import { openCellEditor } from './openCellEditor';
import type { DataTabState } from '../state/DataTabState';
import type { RowSelectionGesture } from '../../../../../application/editing/grid/model/RowSelectionGesture';
import type { DisplayRow } from '../../../../../application/editing/grid/model/DisplayRow';
import type { CellPosition } from '../../../../../application/editing/grid/model/CellPosition';
import { NULL_PLACEHOLDER } from '../../../../../application/format/constants/displayText';
import { CHARACTER_WIDTH } from '../../../shared/constants/gridMetrics';

const ROW_NUMBER_WIDTH = 52;
const MIN_COLUMN_WIDTH = 70;
const MAX_INITIAL_COLUMN_WIDTH = 320;
const COLUMN_PADDING = 64;
const WIDTH_SAMPLE_ROWS = 50;
const PAGE_ROWS = 10;

const NAVIGATION_MOVES: ReadonlyMap<string, { readonly columnDelta: number; readonly rowDelta: number }> = new Map([
  ['ArrowUp', { columnDelta: 0, rowDelta: -1 }],
  ['ArrowDown', { columnDelta: 0, rowDelta: 1 }],
  ['ArrowLeft', { columnDelta: -1, rowDelta: 0 }],
  ['ArrowRight', { columnDelta: 1, rowDelta: 0 }],
  ['PageUp', { columnDelta: 0, rowDelta: -PAGE_ROWS }],
  ['PageDown', { columnDelta: 0, rowDelta: PAGE_ROWS }],
]);

interface DataGridCallbacks {
  onActiveCellChange(): void;
  onCommitCell(position: CellPosition, value: CellValue): void;
  onSelectionChange(): void;
  onSort(column: string): void;
  onOpenColumnMenu(column: TableColumnView, anchor: DOMRect): void;
  onDeleteRows(): void;
  onSave(): void;
  onCopy(text: string): void;
}

export class DataGrid {
  readonly element = createElement('div', { className: 'grid-scroller' });

  constructor(
    private readonly state: DataTabState,
    private readonly callbacks: DataGridCallbacks,
  ) {
    this.element.tabIndex = 0;
    this.element.addEventListener('keydown', (event) => this.handleKeyDown(event));
  }

  render(): void {
    const { scrollTop, scrollLeft } = this.element;
    const columns = this.state.displayColumns;
    const rows = this.state.display.displayRows();
    const table = createElement('table', { className: 'grid' }, [this.renderColumnGroup(columns, rows), this.renderHead(columns), createElement('tbody', {}, rows.map((row) => this.renderRow(row, columns)))]);
    table.style.width = `${ROW_NUMBER_WIDTH + columns.reduce((sum, column) => sum + this.widthOf(column, rows), 0)}px`;
    this.element.replaceChildren(table);
    this.element.scrollTop = scrollTop;
    this.element.scrollLeft = scrollLeft;
  }

  focus(): void {
    this.element.focus();
  }

  startEdit(position: CellPosition): void {
    const cell = this.findCell(position);
    if (!cell || !this.state.display.isCellEditable(position)) {
      return;
    }
    openCellEditor(cell, position, this.state.display.cellValue(position), {
      commit: (target, value) => this.callbacks.onCommitCell(target, value),
      findNext: (from) => this.state.selection.nextEditableCell(from),
      moveTo: (next) => this.moveEditorTo(next),
      restoreFocus: () => this.element.focus({ preventScroll: true }),
    });
  }

  private widthOf(column: TableColumnView, rows: readonly DisplayRow[]): number {
    const stored = this.state.view.getWidth(column.name);
    if (stored !== undefined) {
      return stored;
    }
    const index = this.state.displayColumns.indexOf(column);
    const longest = Math.max(column.name.length, column.dataType.length, ...rows.slice(0, WIDTH_SAMPLE_ROWS).map((row) => (row.values[index] ?? NULL_PLACEHOLDER).length));
    return Math.min(MAX_INITIAL_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longest * CHARACTER_WIDTH + COLUMN_PADDING));
  }

  private renderColumnGroup(columns: readonly TableColumnView[], rows: readonly DisplayRow[]): HTMLElement {
    const widths = [ROW_NUMBER_WIDTH, ...columns.map((column) => this.widthOf(column, rows))];
    return createElement('colgroup', {}, widths.map((width) => {
      const element = createElement('col');
      element.style.width = `${width}px`;
      return element;
    }));
  }

  private renderHead(columns: readonly TableColumnView[]): HTMLElement {
    const headers = columns.map((column, index) => this.renderHeader(column, index));
    return createElement('thead', {}, [createElement('tr', {}, [createElement('th', { className: 'row-number' }), ...headers])]);
  }

  private renderHeader(column: TableColumnView, index: number): HTMLElement {
    const isRequired = !column.isNullable && !column.hasDefault && !this.state.isCustomResult;
    const key = column.isPrimaryKey ? 'PK' : column.isForeignKey ? 'FK' : '';
    const label = createElement('span', { className: 'column-label', title: `${column.name}${column.dataType ? ` · ${column.dataType}` : ''}${isRequired ? ` · ${l10n.t('required')}` : ''}` }, [
      ...(column.dataType ? [createElement('span', { className: 'type-badge', text: columnTypeBadge(column.dataType) })] : []),
      ...(key ? [createElement('span', { className: `key-badge ${key.toLowerCase()}`, text: key })] : []),
      createElement('span', { className: 'column-name', text: `${column.name}${isRequired ? ' *' : ''}${this.sortIndicator(column.name)}` }),
    ]);

    const menuButton = createElement('button', { className: 'column-menu-button', text: '▾', title: l10n.t('Options of {0}', column.name) });
    menuButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.callbacks.onOpenColumnMenu(column, menuButton.getBoundingClientRect());
    });
    menuButton.hidden = this.state.isCustomResult;

    const resizer = createElement('span', { className: 'column-resizer', title: l10n.t('Drag to resize') });
    resizer.addEventListener('click', (event) => event.stopPropagation());
    resizer.addEventListener('pointerdown', (event) => this.startResize(event, column, index, resizer));

    const header = createElement('th', {}, [createElement('div', { className: 'header-content' }, [label, menuButton]), resizer]);
    if (!this.state.isCustomResult) {
      header.addEventListener('click', () => this.callbacks.onSort(column.name));
    }
    return header;
  }

  private sortIndicator(column: string): string {
    if (this.state.sort?.column !== column || this.state.isCustomResult) {
      return '';
    }
    return this.state.sort.isDescending ? ' ▼' : ' ▲';
  }

  private startResize(event: PointerEvent, column: TableColumnView, index: number, resizer: HTMLElement): void {
    event.preventDefault();
    event.stopPropagation();
    const table = this.element.querySelector('table');
    const element = this.element.querySelectorAll('col')[index + 1] as HTMLElement | undefined;
    if (!table || !element) {
      return;
    }
    resizer.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = element.getBoundingClientRect().width;
    const startTableWidth = table.getBoundingClientRect().width;

    const handleMove = (moveEvent: PointerEvent) => {
      const width = Math.max(MIN_COLUMN_WIDTH, startWidth + moveEvent.clientX - startX);
      element.style.width = `${width}px`;
      table.style.width = `${startTableWidth + width - startWidth}px`;
      this.state.view.setWidth(column.name, width);
    };
    const handleUp = () => {
      resizer.removeEventListener('pointermove', handleMove);
      resizer.removeEventListener('pointerup', handleUp);
    };
    resizer.addEventListener('pointermove', handleMove);
    resizer.addEventListener('pointerup', handleUp);
  }

  private renderRow(row: DisplayRow, columns: readonly TableColumnView[]): HTMLElement {
    const number = createElement('td', { className: 'row-number', text: row.label });
    number.addEventListener('mousedown', (event) => {
      event.preventDefault();
      this.state.selection.selectRow(row.rowId, { isToggle: event.ctrlKey || event.metaKey, isRange: event.shiftKey } satisfies RowSelectionGesture);
      this.element.focus();
      this.applySelectionClasses();
      this.callbacks.onSelectionChange();
    });

    const classes = [row.isNew ? 'row-new' : '', row.isDeleted ? 'row-deleted' : '', this.state.selectedRowIds.has(row.rowId) ? 'row-selected' : ''].filter(Boolean);
    const tr = createElement('tr', { className: classes.join(' ') }, [number, ...columns.map((column, index) => this.renderCell(row, column, row.values[index]))]);
    tr.dataset.rowId = row.rowId;
    return tr;
  }

  private renderCell(row: DisplayRow, column: TableColumnView, value: CellValue | undefined): HTMLElement {
    const position: CellPosition = { rowId: row.rowId, column: column.name };
    const isActive = this.state.activeCell?.rowId === row.rowId && this.state.activeCell.column === column.name;
    const classes = [
      value === null ? 'null' : '',
      value === undefined ? 'default' : '',
      row.changedColumns.has(column.name) ? 'changed' : '',
      isActive ? 'active' : '',
      column.isEditable && !this.state.isCustomResult ? '' : 'readonly',
    ].filter(Boolean);

    const cell = createElement('td', { className: classes.join(' '), text: displayValue(value), title: value ?? undefined });
    cell.dataset.column = column.name;
    cell.addEventListener('mousedown', () => this.selectCell(position, cell));
    cell.addEventListener('dblclick', () => this.startEdit(position));
    return cell;
  }

  private selectCell(position: CellPosition, cell: HTMLElement): void {
    this.element.querySelector('td.active')?.classList.remove('active');
    cell.classList.add('active');
    this.state.selection.selectCell(position);
    this.element.focus({ preventScroll: true });
    this.callbacks.onActiveCellChange();
  }

  private applySelectionClasses(): void {
    this.element.querySelectorAll<HTMLElement>('tbody tr').forEach((row) => {
      row.classList.toggle('row-selected', this.state.selectedRowIds.has(row.dataset.rowId ?? ''));
    });
  }

  private findCell(position: CellPosition): HTMLElement | undefined {
    const rows = this.element.querySelectorAll<HTMLElement>('tbody tr');
    const row = [...rows].find((candidate) => candidate.dataset.rowId === position.rowId);
    return row ? [...row.querySelectorAll<HTMLElement>('td')].find((cell) => cell.dataset.column === position.column) : undefined;
  }

  private moveAndReveal(columnDelta: number, rowDelta: number): void {
    this.state.selection.moveActive(columnDelta, rowDelta);
    this.element.querySelector('td.active')?.classList.remove('active');
    const cell = this.state.activeCell ? this.findCell(this.state.activeCell) : undefined;
    cell?.classList.add('active');
    cell?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.callbacks.onActiveCellChange();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const isCommand = event.ctrlKey || event.metaKey;
    if (isCommand && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.callbacks.onSave();
    } else if (isCommand && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      if (this.state.activeCell) {
        this.callbacks.onCopy(this.state.display.cellValue(this.state.activeCell) ?? '');
      }
    } else if (this.handleNavigationKey(event.key)) {
      event.preventDefault();
    }
  }

  private handleNavigationKey(key: string): boolean {
    const move = NAVIGATION_MOVES.get(key);
    if (move) {
      this.moveAndReveal(move.columnDelta, move.rowDelta);
      return true;
    }
    switch (key) {
      case 'Enter':
      case 'F2':
        if (this.state.activeCell) {
          this.startEdit(this.state.activeCell);
        }
        return true;
      case 'Delete':
        this.callbacks.onDeleteRows();
        return true;
      default:
        return false;
    }
  }

  private moveEditorTo(next: CellPosition): void {
    this.state.selection.selectCell(next);
    this.callbacks.onActiveCellChange();
    this.element.querySelector('td.active')?.classList.remove('active');
    this.findCell(next)?.classList.add('active');
    this.startEdit(next);
  }
}
