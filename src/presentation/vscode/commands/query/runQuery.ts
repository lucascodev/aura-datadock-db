import * as vscode from 'vscode';
import { buildExplain } from '../../../../application/query/analysis/buildExplain';
import { statementAtOffset } from '../../../../application/query/analysis/statementAtOffset';
import { scanStatements } from '../../../../application/query/analysis/splitStatements';
import type { DataDockContext } from '../model/DataDockContext';
import { executeQuery } from './executeQuery';
import { resolveDocumentConnection } from '../registry/pickConnection';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export async function runQuery(context: DataDockContext): Promise<void> {
  const editor = requireEditor();
  if (editor) {
    await runFromEditor(context, editor, (sql) => sql);
  }
}

export async function explainQuery(context: DataDockContext): Promise<void> {
  const editor = requireEditor();
  if (editor) {
    await runFromEditor(context, editor, buildExplain);
  }
}

export async function runFile(context: DataDockContext): Promise<void> {
  const editor = requireEditor();
  if (!editor) {
    return;
  }
  const sql = editor.document.getText().trim();
  const target = sql ? await resolveDocumentConnection(context, editor.document) : undefined;
  if (target) {
    await executeQuery(context, target, sql);
  }
}

export async function runStatementAt(context: DataDockContext, uri: vscode.Uri, offset: number, shouldExplain = false): Promise<void> {
  const document = await vscode.workspace.openTextDocument(uri);
  const target = await resolveDocumentConnection(context, document);
  if (!target) {
    return;
  }
  const statement = statementAtOffset(scanStatements(document.getText(), target.kind), offset);
  if (statement) {
    await executeQuery(context, target, shouldExplain ? buildExplain(statement.text) : statement.text);
  }
}

function requireEditor(): vscode.TextEditor | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(l10n.t('Open a SQL editor to run a query.'));
  }
  return editor;
}

async function runFromEditor(context: DataDockContext, editor: vscode.TextEditor, transform: (statement: string) => string): Promise<void> {
  const target = await resolveDocumentConnection(context, editor.document);
  if (!target) {
    return;
  }
  const sql = editor.selection.isEmpty ? statementUnderCursor(editor, target.kind) : editor.document.getText(editor.selection).trim();
  if (sql) {
    await executeQuery(context, target, transform(sql));
  }
}

function statementUnderCursor(editor: vscode.TextEditor, kind: Parameters<typeof scanStatements>[1]): string | undefined {
  const offset = editor.document.offsetAt(editor.selection.active);
  return statementAtOffset(scanStatements(editor.document.getText(), kind), offset)?.text;
}
