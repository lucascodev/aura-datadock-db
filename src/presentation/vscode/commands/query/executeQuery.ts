import * as vscode from 'vscode';
import { resolveProtectionSetting } from '../../../../application/settings/resolveProtectionSetting';
import { classifyQuery } from '../../../../application/query/analysis/classifyQuery';
import type { QueryClassification } from '../../../../application/query/model/QueryClassification';
import { decideQueryGuard } from '../../../../application/query/execution/decideQueryGuard';
import { runStatements } from '../../../../application/query/execution/runStatements';
import type { StatementOutcome } from '../../../../application/query/model/StatementOutcome';
import { summarizeOutcomes } from '../../../../application/query/execution/summarizeOutcomes';
import { scanStatements } from '../../../../application/query/analysis/scanStatements';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { DataDockContext } from '../model/DataDockContext';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export async function executeQuery(context: DataDockContext, target: ConnectionTarget, sql: string): Promise<boolean> {
  const classification = classifyQuery(sql, target.kind);
  if (!(await isAllowedToRun(context, target, classification))) {
    return false;
  }

  const controller = context.runs.begin();
  if (!controller) {
    vscode.window.showWarningMessage(l10n.t('Another query is still running. Cancel it first.'));
    return false;
  }

  const executedAt = Date.now();
  context.results.showRunning(target.name, sql);
  try {
    const outcomes = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: l10n.t('Running query on {0}', target.name) },
      () => runOnConnection(context, target, sql, controller),
    );
    context.results.showOutcomes(target.name, target.kind, outcomes);
    logOutcomes(context, target, outcomes);
    await context.history.add(summarizeOutcomes(sql, target, executedAt, outcomes));
    if (classification.risk !== 'read') {
      context.schemas.invalidate(target.id);
      await context.refresh();
    }
    return true;
  } finally {
    context.runs.finish();
  }
}

async function isAllowedToRun(context: DataDockContext, target: ConnectionTarget, classification: QueryClassification): Promise<boolean> {
  const config = context.config();
  const isGloballyReadOnly = resolveProtectionSetting(config.inspect<boolean>('readOnly'), false);
  const decision = decideQueryGuard(classification.risk, {
    isReadOnly: isGloballyReadOnly || target.isReadOnly,
    isRemote: target.isRemote,
    confirmsDestructive: resolveProtectionSetting(config.inspect<boolean>('confirmDestructiveQueries'), true),
  });

  if (decision === 'block') {
    vscode.window.showErrorMessage(
      isGloballyReadOnly
        ? l10n.t('Blocked: Aura DataDock DB is in read-only mode (auraDataDockDb.readOnly).')
        : l10n.t('Blocked: the connection {0} is read-only.', target.name),
    );
    return false;
  }
  if (decision === 'allow') {
    return true;
  }

  const details = target.isRemote ? [l10n.t('{0} is a remote database.', target.name), ...classification.reasons] : classification.reasons;
  const runAnywayLabel = l10n.t('Run anyway');
  const answer = await vscode.window.showWarningMessage(l10n.t('Run this on {0}?', target.name), { modal: true, detail: details.join('\n') }, runAnywayLabel);
  return answer === runAnywayLabel;
}

async function runOnConnection(
  context: DataDockContext,
  target: ConnectionTarget,
  sql: string,
  controller: AbortController,
): Promise<StatementOutcome[]> {
  try {
    const adapter = await context.connections.getAdapter(target.id);
    controller.signal.addEventListener('abort', () => {
      adapter.cancelRunningQuery().catch((error: unknown) => {
        context.output.warn(`[${target.name}] Could not cancel the query: ${toMessage(error)}`);
      });
    });
    const statements = scanStatements(sql, target.kind).map((statement) => statement.text);
    return await runStatements(adapter, statements, { maxRows: context.config().get<number>('maxRows', 500), signal: controller.signal });
  } catch (error) {
    return [{ status: 'failure', sql, message: toMessage(error) }];
  }
}

function logOutcomes(context: DataDockContext, target: ConnectionTarget, outcomes: readonly StatementOutcome[]): void {
  for (const outcome of outcomes) {
    if (outcome.status === 'failure') {
      context.output.error(`[${target.name}] ${outcome.message}`);
    } else {
      context.output.info(`[${target.name}] ${outcome.result.rows.length} row(s) in ${outcome.result.durationMs} ms`);
    }
  }
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
