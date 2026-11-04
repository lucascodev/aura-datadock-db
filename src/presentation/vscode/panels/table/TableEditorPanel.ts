import * as vscode from 'vscode';
import { classifyQuery } from '../../../../application/query/analysis/classifyQuery';
import { selectTableNeighborhood } from '../../../../application/diagram/building/selectTableNeighborhood';
import { buildRowChangeStatements } from '../../../../application/editing/rows/buildRowChangeStatements';
import { buildTablePageQuery } from '../../../../application/editing/tableQuery/buildTablePageQuery';
import { buildTableSelect } from '../../../../application/editing/tableQuery/buildTableSelect';
import { describeEditability } from '../../../../application/editing/rows/describeEditability';
import { isColumnEditable } from '../../../../application/editing/rows/isColumnEditable';
import type { RowChange } from '../../../../application/editing/model/RowChange';
import type { TablePageRequest, TableRowSelection } from '../../../../application/editing/model/tableFilters';
import { formatValue } from '../../../../application/format/text/formatValue';
import { decideQueryGuard } from '../../../../application/query/execution/decideQueryGuard';
import { findIncomingReferences } from '../../../../application/schema/relationships/findIncomingReferences';
import { renderDdl } from '../../../../application/schema/rendering/renderDdl';
import { scanStatements } from '../../../../application/query/analysis/scanStatements';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../../../domain/database/ports/DatabaseAdapter';
import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import type { CellValue, ParameterizedStatement } from '../../../../domain/database/model/ParameterizedStatement';
import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import { renderWebviewHtml } from '../shared/renderWebviewHtml';
import { webviewResourceRoots } from '../shared/webviewResourceRoots';
import type { TableColumnView, TableEditorHostMessage, TableEditorWebviewMessage, TablePropertiesView } from '../../../contracts/TableEditorMessages';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { TableEditorDependencies, TableEditorOptions } from '../model/TableEditorDependencies';
import { findTable } from './findTable';

const VIEW_TYPE = 'auraDataDockDb.tableEditor';
const PENDING_TITLE_PREFIX = '● ';

export class TableEditorPanel {
  private readonly panel: vscode.WebviewPanel;
  private table: TableDefinition;
  private pending: readonly RowChange[];
  private shouldAddRow: boolean;
  private lastPageRequestId = 0;

  constructor(
    private readonly target: ConnectionTarget,
    private schema: NamespaceSchema,
    tableName: string,
    private readonly dependencies: TableEditorDependencies,
    options: TableEditorOptions,
  ) {
    this.table = findTable(schema, tableName);
    this.pending = options.restoredChanges ?? [];
    this.shouldAddRow = options.shouldAddRow ?? false;
    this.panel = vscode.window.createWebviewPanel(VIEW_TYPE, this.baseTitle(), vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: webviewResourceRoots(dependencies.extensionUri),
    });
    this.panel.webview.html = renderWebviewHtml(this.panel.webview, dependencies.extensionUri, {
      title: this.baseTitle(),
      scriptPath: ['dist', 'webview', 'table.js'],
      stylePath: ['media', 'webview', 'table.css'],
    });
    this.panel.webview.onDidReceiveMessage((message: TableEditorWebviewMessage) => this.handleMessage(message));
    this.updateTitle();
  }

  get pendingChanges(): readonly RowChange[] {
    return this.pending;
  }

  onDidDispose(listener: () => void): void {
    this.panel.onDidDispose(listener);
  }

  reveal(shouldAddRow: boolean): void {
    this.shouldAddRow = shouldAddRow;
    this.panel.reveal();
    if (shouldAddRow) {
      this.postInit();
    }
  }

  private baseTitle(): string {
    return `${this.table.name} · ${this.target.name}`;
  }

  private updateTitle(): void {
    this.panel.title = `${this.pending.length > 0 ? PENDING_TITLE_PREFIX : ''}${this.baseTitle()}`;
  }

  private post(message: TableEditorHostMessage): void {
    void this.panel.webview.postMessage(message);
  }

  private postInit(): void {
    const { table, target } = this;
    this.post({
      type: 'init',
      title: `${table.namespace}.${table.name}`,
      tableName: table.name,
      columns: table.columns.map((column) => this.toColumnView(column)),
      primaryKey: table.primaryKey,
      editability: describeEditability(table, target.kind, this.dependencies.isReadOnly(target)),
      pageSize: this.dependencies.pageSize(),
      changes: this.pending,
      shouldAddRow: this.shouldAddRow,
      properties: this.buildProperties(),
    });
    this.shouldAddRow = false;
  }

  private buildProperties(): TablePropertiesView {
    return {
      table: this.table,
      incomingReferences: findIncomingReferences(this.schema, this.table.name),
      ddl: renderDdl(this.schema, { tableNames: [this.table.name] }),
      diagramSchema: selectTableNeighborhood(this.schema, this.table.name),
    };
  }

  private toColumnView(column: TableDefinition['columns'][number]): TableColumnView {
    return {
      name: column.name,
      dataType: column.dataType,
      isNullable: column.nullable,
      isPrimaryKey: column.isPrimaryKey,
      isForeignKey: this.table.foreignKeys.some((foreignKey) => foreignKey.columns.includes(column.name)),
      hasDefault: column.defaultValue !== undefined || column.generationClause !== undefined || column.isComputed === true,
      isEditable: isColumnEditable(column, this.target.kind),
    };
  }

  private async handleMessage(message: TableEditorWebviewMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        this.postInit();
        return;
      case 'loadPage':
        await this.loadPage(message.request);
        return;
      case 'pendingChanged':
        this.pending = message.changes;
        this.updateTitle();
        return;
      case 'save':
        await this.save(message.changes);
        return;
      case 'preview':
        await this.preview(message.changes);
        return;
      case 'runSql':
        await this.runSql(message.sql, message.limit);
        return;
      case 'openSql':
        await this.dependencies.openSql(this.target, `${message.sql}\n`);
        return;
      case 'copyText':
        await this.dependencies.copyText(message.text);
        return;
      case 'exportData':
        await this.exportData(message.selection);
        return;
      case 'openTable':
        await this.dependencies.openTable(this.target, { namespace: this.table.namespace, name: message.table });
        return;
    }
  }

  private async loadPage(request: TablePageRequest): Promise<void> {
    const requestId = ++this.lastPageRequestId;
    try {
      await this.refreshDefinition();
      const adapter = await this.dependencies.getAdapter(this.target.id);
      const { page, count } = buildTablePageQuery(this.table, this.target.kind, request);
      const result = await adapter.queryPage(page);
      if (requestId !== this.lastPageRequestId) {
        return;
      }
      this.post({ type: 'page', request, sql: page.preview, rows: toCellRows(result.rows), durationMs: result.durationMs });
      void this.loadCount(adapter, count, requestId);
    } catch (error) {
      this.post({ type: 'failed', message: toMessage(error) });
    }
  }

  private async refreshDefinition(): Promise<void> {
    const schema = await this.dependencies.loadSchema(this.target, this.table.namespace);
    const latest = findTable(schema, this.table.name);
    this.schema = schema;
    if (JSON.stringify(latest.columns) !== JSON.stringify(this.table.columns)) {
      this.table = latest;
      this.postInit();
    }
  }

  private async loadCount(adapter: DatabaseAdapter, count: ParameterizedStatement, requestId: number): Promise<void> {
    try {
      const result = await adapter.queryPage(count);
      if (requestId === this.lastPageRequestId) {
        this.post({ type: 'count', total: Number(result.rows[0]?.[0] ?? 0) });
      }
    } catch (error) {
      this.dependencies.log(`[${this.target.name}] Could not count the rows of ${this.table.name}: ${toMessage(error)}`);
    }
  }

  private async runSql(sql: string, limit: number): Promise<void> {
    try {
      const classification = classifyQuery(sql, this.target.kind);
      if (classification.statementCount !== 1 || classification.risk !== 'read') {
        const hasRun = await this.dependencies.runScript(this.target, sql);
        this.post(hasRun ? { type: 'scriptFinished' } : { type: 'failed', message: '' });
        return;
      }
      const [statement] = scanStatements(sql, this.target.kind);
      const adapter = await this.dependencies.getAdapter(this.target.id);
      const result = await adapter.runQuery(statement.text, limit);
      this.post({
        type: 'customResult',
        result: { sql: statement.text, columns: result.columns, rows: toCellRows(result.rows), isTruncated: result.truncated, durationMs: result.durationMs },
      });
    } catch (error) {
      this.post({ type: 'failed', message: toMessage(error) });
    }
  }

  private async exportData(selection: TableRowSelection): Promise<void> {
    try {
      await this.dependencies.exportRows(this.target, this.table, buildTableSelect(this.table, this.target.kind, selection));
    } catch (error) {
      this.post({ type: 'failed', message: toMessage(error) });
    }
  }

  private buildStatements(changes: readonly RowChange[]): ParameterizedStatement[] {
    return buildRowChangeStatements(this.table, this.target.kind, this.dependencies.isReadOnly(this.target), changes);
  }

  private async save(changes: readonly RowChange[]): Promise<void> {
    const startedAt = Date.now();
    try {
      const statements = this.buildStatements(changes);
      if (statements.length === 0 || !(await this.isConfirmed(changes))) {
        this.post({ type: 'failed', message: '' });
        return;
      }
      const adapter = await this.dependencies.getAdapter(this.target.id);
      const affectedRows = await adapter.applyStatements(statements);
      this.pending = [];
      this.updateTitle();
      this.post({ type: 'saved', affectedRows });
      await this.dependencies.recordHistory({
        sql: joinPreviews(statements),
        connectionKey: this.target.key,
        connectionName: this.target.name,
        executedAt: startedAt,
        durationMs: Date.now() - startedAt,
        rowCount: affectedRows,
      });
    } catch (error) {
      this.post({ type: 'failed', message: toMessage(error) });
    }
  }

  private async isConfirmed(changes: readonly RowChange[]): Promise<boolean> {
    const hasDeletion = changes.some((change) => change.type === 'delete');
    const decision = decideQueryGuard(hasDeletion ? 'destructive' : 'write', {
      isReadOnly: this.dependencies.isReadOnly(this.target),
      isRemote: this.target.isRemote,
      confirmsDestructive: this.dependencies.confirmsDestructive(),
    });
    if (decision === 'block') {
      throw new Error(l10n.t('This connection is read-only, so the data cannot be changed.'));
    }
    if (decision === 'allow') {
      return true;
    }
    const confirmLabel = l10n.t('Save Changes');
    const answer = await vscode.window.showWarningMessage(
      l10n.t('Save changes to {0} on {1}?', this.table.name, this.target.name),
      { modal: true, detail: describeChanges(changes, this.target) },
      confirmLabel,
    );
    return answer === confirmLabel;
  }

  private async preview(changes: readonly RowChange[]): Promise<void> {
    try {
      await this.dependencies.openSql(this.target, `-- ${l10n.t('Preview of the pending changes. Save Changes runs them in a transaction.')}\n${joinPreviews(this.buildStatements(changes))}\n`);
    } catch (error) {
      this.post({ type: 'failed', message: toMessage(error) });
    }
  }
}

function toCellRows(rows: readonly (readonly unknown[])[]): CellValue[][] {
  return rows.map((row) => row.map((value) => (value === null || value === undefined ? null : formatValue(value))));
}

function joinPreviews(statements: readonly ParameterizedStatement[]): string {
  return statements.map((statement) => `${statement.preview};`).join('\n');
}

function describeChanges(changes: readonly RowChange[], target: ConnectionTarget): string {
  const count = (type: RowChange['type']) => changes.filter((change) => change.type === type).length;
  const summary = l10n.t('{0} to add, {1} to change, {2} to delete.', count('insert'), count('update'), count('delete'));
  return target.isRemote ? `${l10n.t('{0} is a remote database.', target.name)}\n${summary}` : summary;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
