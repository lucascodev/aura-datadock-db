import { open, rm } from 'node:fs/promises';
import * as vscode from 'vscode';
import { writeRowBatches } from '../../../../application/export/encoders/encodeRows';
import type { WriteRowBatchesResult } from '../../../../application/export/model/WriteRowBatchesResult';
import type { RowExportFormat } from '../../../../application/export/model/RowExportFormat';
import { ROW_EXPORT_FORMATS } from '../../../../application/export/constants/rowExportFormats';
import { buildTableSelect } from '../../../../application/editing/browsing/buildTablePageQuery';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { ParameterizedStatement } from '../../../../domain/database/model/ParameterizedStatement';
import type { TableRef } from '../../../../domain/schema/model/TableRef';
import type { TableNode } from '../../tree/nodes/TableNode';
import type { DataDockContext } from '../registry/DataDockContext';
import { l10n } from '../../../../domain/i18n/translation/l10n';

const BATCH_SIZE = 1000;

type TableLocation = Pick<TableRef, 'namespace' | 'name'>;

export async function exportTable(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (!target) {
    return;
  }
  try {
    const schema = await context.schemas.get(target.id, node.table.namespace);
    const table = schema.tables.find((candidate) => candidate.name === node.table.name);
    if (!table) {
      throw new Error(l10n.t('The table {0} was not found. Refresh the view.', node.table.name));
    }
    await exportRows(context, target, node.table, buildTableSelect(table, target.kind, { filters: [] }));
  } catch (error) {
    reportFailure(context, target, error);
  }
}

export async function exportRows(context: DataDockContext, target: ConnectionTarget, table: TableLocation, statement: ParameterizedStatement): Promise<void> {
  const picked = await vscode.window.showQuickPick(
    ROW_EXPORT_FORMATS.map((format) => ({ label: format.label(), description: `.${format.extension}`, format })),
    { placeHolder: l10n.t('Export the rows of {0} as', table.name) },
  );
  if (!picked) {
    return;
  }
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`${table.name}.${picked.format.extension}`),
    filters: { [picked.format.label()]: [picked.format.extension] },
  });
  if (!uri) {
    return;
  }

  try {
    const result = await streamToFile(context, target, table, statement, picked.format, uri);
    if (result.isComplete) {
      vscode.window.setStatusBarMessage(l10n.t('Exported {0} row(s) to {1}', result.rowCount, uri.fsPath), 5000);
    }
  } catch (error) {
    reportFailure(context, target, error);
  }
}

function reportFailure(context: DataDockContext, target: ConnectionTarget, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  context.output.error(`[${target.name}] Export failed: ${message}`);
  vscode.window.showErrorMessage(l10n.t('Export failed: {0}', message));
}

function streamToFile(
  context: DataDockContext,
  target: ConnectionTarget,
  table: TableLocation,
  statement: ParameterizedStatement,
  format: RowExportFormat,
  uri: vscode.Uri,
): Thenable<WriteRowBatchesResult> {
  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: l10n.t('Exporting {0}', table.name), cancellable: true },
    async (progress, token) => {
      const controller = new AbortController();
      token.onCancellationRequested(() => controller.abort());

      const adapter = await context.connections.getAdapter(target.id);
      const file = await open(uri.fsPath, 'w');
      let result: WriteRowBatchesResult = { rowCount: 0, isComplete: false };
      try {
        result = await writeRowBatches(
          adapter.streamRows(statement, BATCH_SIZE),
          format.createEncoder({ kind: target.kind, table }),
          async (chunk) => void (await file.write(chunk)),
          { signal: controller.signal, onProgress: (rowCount) => progress.report({ message: l10n.t('{0} rows', rowCount) }) },
        );
        return result;
      } finally {
        await file.close();
        if (!result.isComplete) {
          await rm(uri.fsPath, { force: true });
        }
      }
    },
  );
}
