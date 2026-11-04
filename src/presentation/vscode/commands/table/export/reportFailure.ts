import * as vscode from 'vscode';
import type { ConnectionTarget } from '../../../../../domain/connection/model/ConnectionTarget';
import type { DataDockContext } from '../../model/DataDockContext';
import { l10n } from '../../../../../domain/i18n/translation/l10n';

export function reportFailure(context: DataDockContext, target: ConnectionTarget, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  context.output.error(`[${target.name}] Export failed: ${message}`);
  vscode.window.showErrorMessage(l10n.t('Export failed: {0}', message));
}
