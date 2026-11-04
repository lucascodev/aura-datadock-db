import * as vscode from 'vscode';
import { open, rm } from 'node:fs/promises';
import { writeRowBatches } from '../../../../../application/export/encoders/writing/writeRowBatches';
import type { WriteRowBatchesResult } from '../../../../../application/export/model/WriteRowBatchesResult';
import type { RowExportFormat } from '../../../../../application/export/model/RowExportFormat';
import { ROW_EXPORT_FORMATS } from '../../../../../application/export/constants/rowExportFormats';
import type { ConnectionTarget } from '../../../../../domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../../../../domain/database/ports/DatabaseAdapter';
import type { ParameterizedStatement } from '../../../../../domain/database/model/ParameterizedStatement';
import type { TableRef } from '../../../../../domain/schema/model/TableRef';
import type { DataDockContext } from '../../model/DataDockContext';
import { l10n } from '../../../../../domain/i18n/translation/l10n';
import { reportFailure } from './reportFailure';

const BATCH_SIZE = 1000;

type TableLocation = Pick<TableRef, 'namespace' | 'name'>;

interface ExportJob {
  readonly target: ConnectionTarget;
  readonly table: TableLocation;
  readonly statement: ParameterizedStatement;
  readonly format: RowExportFormat;
  readonly uri: vscode.Uri;
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
      return writeToFile(adapter, { target, table, statement, format, uri }, controller.signal, (rowCount) =>
        progress.report({ message: l10n.t('{0} rows', rowCount) }),
      );
    },
  );
}

async function writeToFile(
  adapter: DatabaseAdapter,
  job: ExportJob,
  signal: AbortSignal,
  onProgress: (rowCount: number) => void,
): Promise<WriteRowBatchesResult> {
  const file = await open(job.uri.fsPath, 'w');
  let result: WriteRowBatchesResult = { rowCount: 0, isComplete: false };
  try {
    result = await writeRowBatches(
      adapter.streamRows(job.statement, BATCH_SIZE),
      job.format.createEncoder({ kind: job.target.kind, table: job.table }),
      async (chunk) => void (await file.write(chunk)),
      { signal, onProgress },
    );
    return result;
  } finally {
    await file.close();
    if (!result.isComplete) {
      await rm(job.uri.fsPath, { force: true });
    }
  }
}
