import type * as vscode from 'vscode';
import type { DataDockContext } from '../model/DataDockContext';
import { registerAiCommands } from '../registration/registerAiCommands';
import { registerBrowseCommands } from '../registration/registerBrowseCommands';
import { registerConnectionCommands } from '../registration/registerConnectionCommands';
import { registerHistoryCommands } from '../registration/registerHistoryCommands';
import { registerOutputCommands } from '../registration/registerOutputCommands';
import { registerQueryCommands } from '../registration/registerQueryCommands';
import { registerStructureCommands } from '../registration/registerStructureCommands';

export function registerCommands(context: DataDockContext): vscode.Disposable[] {
  return [
    ...registerConnectionCommands(context),
    ...registerQueryCommands(context),
    ...registerBrowseCommands(context),
    ...registerStructureCommands(context),
    ...registerOutputCommands(context),
    ...registerHistoryCommands(context),
    ...registerAiCommands(context),
  ];
}
