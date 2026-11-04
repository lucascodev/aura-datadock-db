import type { ResultColumnView } from '../../../contracts/ResultsMessages';
import { createElement } from '../../shared/createElement';
import { filterRows, nextSort, sortRows, type ResultRow, type SortState } from './orderRows';
import { l10n } from '../../../../domain/i18n/l10n';

const ROW_HEIGHT = 24;
const OVERSCAN_ROWS = 20;
const CHARACTER_WIDTH = 7.6;
const MIN_COLUMN_WIDTH = 72;
const MAX_COLUMN_WIDTH = 420;
const WIDTH_SAMPLE_ROWS = 200;
const COLUMN_PADDING = 28;
const ROW_NUMBER_WIDTH = 56;
const NULL_LABEL = 'NULL';

export interface CellSelection {
  readonly rowIndex: number;
  readonly columnIndex: number;
}

export interface ResultGridCallbacks {
  readonly onSelectionChange: (selection: CellSelection | undefined) => void;
  readonly onOpenValue: (text: string) => void;
  readonly onCountChange: (visibleRows: number) => void;
}

export class ResultGrid {
  readonly element: HTMLElement;
  private readonly head = createElement('thead');
  private readonly body = createElement('tbody');
  private readonly columnGroup = createElement('colgroup');
  private visibleRows: ResultRow[];
  private sort?: SortState;
  private filter = '';
  private selection?: CellSelection;

  constructor(
    private readonly columns: readonly ResultColumnView[],
    private readonly rows: readonly ResultRow[],
    private readonly callbacks: ResultGridCallbacks,
  ) {
    this.visibleRows = [...rows];
    const table = createElement('table', { className: 'grid' }, [this.columnGroup, this.head, this.body]);
    this.element = createElement('div', { className: 'grid-scroller' }, [table]);
    this.element.addEventListener('scroll', () => this.renderWindow());
    this.renderColumnWidths(table);
    this.renderHead();
  }

  mount(): void {
    this.renderWindow();
  }

  setFilter(filter: string): void {
    this.filter = filter;
    this.applyView();
  }

  getSelectedRow(): ResultRow | undefined {
    return this.selection ? this.visibleRows[this.selection.rowIndex] : undefined;
  }

  getSelectedCell(): string | null | undefined {
    return this.selection ? this.getSelectedRow()?.[this.selection.columnIndex] : undefined;
  }

  getSelectedColumnValues(): readonly (string | null)[] | undefined {
    const { selection } = this;
    return selection ? this.visibleRows.map((row) => row[selection.columnIndex]) : undefined;
  }

  private applyView(): void {
    const isNumeric = this.sort ? this.columns[this.sort.columnIndex].isNumeric : false;
    this.visibleRows = sortRows(filterRows(this.rows, this.filter), this.sort, isNumeric);
    this.setSelection(undefined);
    this.element.scrollTop = 0;
    this.renderHead();
    this.renderWindow();
    this.callbacks.onCountChange(this.visibleRows.length);
  }

  private renderColumnWidths(table: HTMLTableElement): void {
    const widths = this.columns.map((column, index) => this.measureColumn(column, index));
    const columnElements = [ROW_NUMBER_WIDTH, ...widths].map((width) => {
      const element = createElement('col');
      element.style.width = `${width}px`;
      return element;
    });
    this.columnGroup.append(...columnElements);
    table.style.width = `${ROW_NUMBER_WIDTH + widths.reduce((sum, width) => sum + width, 0)}px`;
  }

  private measureColumn(column: ResultColumnView, index: number): number {
    const sample = this.rows.slice(0, WIDTH_SAMPLE_ROWS);
    const longest = Math.max(column.name.length + 2, ...sample.map((row) => (row[index] ?? NULL_LABEL).length));
    return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longest * CHARACTER_WIDTH + COLUMN_PADDING));
  }

  private renderHead(): void {
    const cells = this.columns.map((column, index) =>
      createElement('th', {
        text: `${column.name}${this.sortIndicator(index)}`,
        title: l10n.t('Sort by {0}', column.name),
        className: column.isNumeric ? 'numeric' : undefined,
        onClick: () => {
          this.sort = nextSort(this.sort, index);
          this.applyView();
        },
      }),
    );
    this.head.replaceChildren(createElement('tr', {}, [createElement('th', { className: 'row-number', text: '#' }), ...cells]));
  }

  private sortIndicator(columnIndex: number): string {
    if (this.sort?.columnIndex !== columnIndex) {
      return '';
    }
    return this.sort.direction === 'ascending' ? ' ▲' : ' ▼';
  }

  private renderWindow(): void {
    const scrollTop = this.element.scrollTop;
    const viewportRows = Math.ceil(this.element.clientHeight / ROW_HEIGHT) || OVERSCAN_ROWS;
    const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
    const last = Math.min(this.visibleRows.length, first + viewportRows + OVERSCAN_ROWS * 2);

    const rows: HTMLElement[] = [this.createSpacer(first)];
    for (let rowIndex = first; rowIndex < last; rowIndex++) {
      rows.push(this.createRow(rowIndex));
    }
    rows.push(this.createSpacer(this.visibleRows.length - last));
    this.body.replaceChildren(...rows);
  }

  private createSpacer(rowCount: number): HTMLElement {
    const cell = createElement('td', { className: 'spacer' });
    cell.colSpan = this.columns.length + 1;
    const row = createElement('tr', {}, [cell]);
    row.style.height = `${rowCount * ROW_HEIGHT}px`;
    return row;
  }

  private createRow(rowIndex: number): HTMLElement {
    const values = this.visibleRows[rowIndex];
    const cells = values.map((value, columnIndex) => this.createCell(value, rowIndex, columnIndex));
    const row = createElement('tr', {}, [createElement('td', { className: 'row-number', text: String(rowIndex + 1) }), ...cells]);
    row.style.height = `${ROW_HEIGHT}px`;
    return row;
  }

  private createCell(value: string | null, rowIndex: number, columnIndex: number): HTMLElement {
    const classes = [
      value === null ? 'null' : '',
      this.columns[columnIndex].isNumeric ? 'numeric' : '',
      this.selection?.rowIndex === rowIndex && this.selection.columnIndex === columnIndex ? 'selected' : '',
    ].filter(Boolean);

    const cell = createElement('td', {
      className: classes.join(' '),
      text: value ?? NULL_LABEL,
      title: value ?? undefined,
      onClick: () => this.setSelection({ rowIndex, columnIndex }),
    });
    cell.addEventListener('dblclick', () => {
      if (value !== null) {
        this.callbacks.onOpenValue(value);
      }
    });
    return cell;
  }

  private setSelection(selection: CellSelection | undefined): void {
    this.selection = selection;
    this.callbacks.onSelectionChange(selection);
    this.renderWindow();
  }
}
