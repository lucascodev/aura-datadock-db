import type * as vscode from 'vscode';
import type { QueryHistoryEntry } from '../../../../application/query/model/QueryHistoryEntry';
import type { DataDockContext } from '../model/DataDockContext';
import { clearHistory } from '../query/history/clearHistory';
import { openHistoryEntry } from '../query/history/openHistoryEntry';
import { registerCommand } from './registerCommand';

export function registerHistoryCommands(context: DataDockContext): vscode.Disposable[] {
  return [
    registerCommand(context.usage, 'openHistoryEntry', (entry: QueryHistoryEntry) => openHistoryEntry(context, entry)),
    registerCommand(context.usage, 'clearHistory', () => clearHistory(context)),
  ];
}
