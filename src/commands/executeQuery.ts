import * as vscode from 'vscode';
import { classifyQuery } from '../core/classifyQuery';
import type { ConnectionTarget } from '../domain/ConnectionTarget';
import { ResultsPanel } from '../ui/results/ResultsPanel';
import type { DataDockContext } from './DataDockContext';

export async function executeQuery(context: DataDockContext, target: ConnectionTarget, sql: string): Promise<void> {
  const config = context.config();
  const classification = classifyQuery(sql);

  if (classification.risk !== 'read' && config.get<boolean>('readOnly', false)) {
    vscode.window.showErrorMessage('Blocked: Aura DataDock is in read-only mode (auraDataDock.readOnly).');
    return;
  }

  if (classification.risk === 'destructive' && config.get<boolean>('confirmDestructiveQueries', true)) {
    const answer = await vscode.window.showWarningMessage(
      `Run this on ${target.containerName}?`,
      { modal: true, detail: classification.reasons.join('\n') },
      'Run anyway',
    );
    if (answer !== 'Run anyway') {
      return;
    }
  }

  const maxRows = config.get<number>('maxRows', 500);
  try {
    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: `Running query on ${target.containerName}` },
      async () => {
        const adapter = await context.connections.getAdapter(target.id);
        return adapter.runQuery(sql, maxRows);
      },
    );
    context.output.info(`[${target.containerName}] ${result.rows.length} row(s) in ${result.durationMs} ms`);
    ResultsPanel.show(`Results · ${target.containerName}`, sql, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.output.error(`[${target.containerName}] ${message}`);
    vscode.window.showErrorMessage(`Query failed: ${message}`);
  }
}
