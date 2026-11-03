import type { QueryResult } from '../../domain/QueryResult';

export interface RenderOptions {
  readonly title: string;
  readonly sql: string;
  readonly nonce: string;
  readonly cspSource: string;
}

export function renderResultsHtml(result: QueryResult, options: RenderOptions): string {
  const summary = buildSummary(result);
  const table = result.columns.length > 0 ? renderTable(result) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${options.cspSource} 'nonce-${options.nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title)}</title>
  <style nonce="${options.nonce}">
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 0 12px 12px; }
    header { position: sticky; top: 0; background: var(--vscode-editor-background); padding: 10px 0; z-index: 2; }
    .summary { color: var(--vscode-descriptionForeground); }
    pre { font-family: var(--vscode-editor-font-family); background: var(--vscode-textCodeBlock-background); padding: 6px 8px; border-radius: 4px; white-space: pre-wrap; max-height: 6em; overflow: auto; }
    .grid { overflow: auto; }
    table { border-collapse: collapse; font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); }
    th, td { border: 1px solid var(--vscode-panel-border); padding: 4px 8px; text-align: left; white-space: nowrap; max-width: 420px; overflow: hidden; text-overflow: ellipsis; }
    th { position: sticky; top: 0; background: var(--vscode-editorGroupHeader-tabsBackground); }
    tr:nth-child(even) td { background: var(--vscode-list-hoverBackground); }
    .null { color: var(--vscode-disabledForeground); font-style: italic; }
  </style>
</head>
<body>
  <header>
    <pre>${escapeHtml(options.sql)}</pre>
    <div class="summary">${escapeHtml(summary)}</div>
  </header>
  <div class="grid">${table}</div>
</body>
</html>`;
}

function buildSummary(result: QueryResult): string {
  const duration = `${result.durationMs} ms`;
  if (result.columns.length === 0) {
    return `${result.affectedRows ?? 0} row(s) affected · ${duration}`;
  }
  const truncated = result.truncated ? ` (showing first ${result.rows.length}, raise auraDataDock.maxRows to see more)` : '';
  return `${result.rows.length} row(s)${truncated} · ${duration}`;
}

function renderTable(result: QueryResult): string {
  const head = result.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const body = result.rows
    .map((row) => `<tr>${result.columns.map((column) => renderCell(row[column])).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '<td class="null">NULL</td>';
  }
  const text = formatValue(value);
  return `<td title="${escapeHtml(text)}">${escapeHtml(text)}</td>`;
}

export function formatValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Buffer.isBuffer(value)) {
    return `<binary ${value.length} bytes>`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
