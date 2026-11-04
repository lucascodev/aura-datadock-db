import type { RowEncoder } from '../../model/RowEncoder';
import { toExportText } from '../values/toExportText';
import { NULL_TEXT } from '../../../format/constants/displayText';


export function createMarkdownEncoder(): RowEncoder {
  return {
    begin: (columns) => `${renderLine(columns.map(escapeCell))}\n${renderLine(columns.map(() => '---'))}\n`,
    encode: (row) => `${renderLine(row.map(renderCell))}\n`,
    end: () => '',
  };
}

function renderLine(cells: readonly string[]): string {
  return `| ${cells.join(' | ')} |`;
}

function renderCell(value: unknown): string {
  return value === null || value === undefined ? NULL_TEXT : escapeCell(toExportText(value));
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}
