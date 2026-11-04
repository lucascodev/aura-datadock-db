import * as vscode from 'vscode';
import { l10n } from '../../../domain/i18n/translation/l10n';
import type { DataDockContext } from '../../../presentation/vscode/commands/model/DataDockContext';
import { findDocumentConnection } from '../../../presentation/vscode/commands/registry/findDocumentConnection';
import { SQL_LANGUAGE_ID } from '../../../presentation/vscode/constants/sqlLanguageId';

const REMOTE_STATUS_BACKGROUND = new vscode.ThemeColor('statusBarItem.warningBackground');

export function updateStatusBar(statusBar: vscode.StatusBarItem, context: DataDockContext): void {
  const document = vscode.window.activeTextEditor?.document;
  const active = document?.languageId === SQL_LANGUAGE_ID ? findDocumentConnection(context, document) : context.connections.activeTarget;
  statusBar.text = `$(${active?.isRemote ? 'remote' : 'database'}) ${active?.name ?? l10n.t('No database')}`;
  statusBar.tooltip = active ? l10n.t('Aura DataDock DB: {0} on {1}:{2}', active.kind, active.host ?? '', active.port ?? '') : l10n.t('Aura DataDock DB: select a connection');
  statusBar.backgroundColor = active?.isRemote ? REMOTE_STATUS_BACKGROUND : undefined;
  statusBar.show();
}
