import * as vscode from 'vscode';
import { statementAtOffset } from '../../../../../application/query/analysis/statements/statementAtOffset';
import { scanStatements } from '../../../../../application/query/analysis/statements/scanStatements';
import type { DataDockContext } from '../../model/DataDockContext';
import { executeQuery } from './executeQuery';
import { resolveDocumentConnection } from '../../registry/resolveDocumentConnection';

export async function runFromEditor(context: DataDockContext, editor: vscode.TextEditor, transform: (statement: string) => string): Promise<void> {
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
