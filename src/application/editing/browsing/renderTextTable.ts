import type { CellValue } from '../../../domain/database/ParameterizedStatement';

const NULL_TEXT = '[NULL]';
const MAX_CELL_CHARACTERS = 80;
const ELLIPSIS = '…';

export function renderTextTable(columns: readonly string[], rows: readonly (readonly CellValue[])[]): string {
  const cells = rows.map((row) => row.map(toCellText));
  const widths = columns.map((column, index) => Math.max(column.length, ...cells.map((row) => row[index]?.length ?? 0)));
  const renderLine = (values: readonly string[]) => values.map((value, index) => value.padEnd(widths[index])).join(' | ').trimEnd();

  return [renderLine(columns), widths.map((width) => '-'.repeat(width)).join('-+-'), ...cells.map(renderLine)].join('\n');
}

function toCellText(value: CellValue): string {
  if (value === null) {
    return NULL_TEXT;
  }
  const singleLine = value.replace(/\s*\r?\n\s*/g, ' ');
  return singleLine.length > MAX_CELL_CHARACTERS ? `${singleLine.slice(0, MAX_CELL_CHARACTERS - 1)}${ELLIPSIS}` : singleLine;
}
