import * as vscode from 'vscode';
import { buildExplain } from '../../../../../application/query/analysis/buildExplain';
import { statementAtOffset } from '../../../../../application/query/analysis/statementAtOffset';
import { scanStatements } from '../../../../../application/query/analysis/scanStatements';
import type { DataDockContext } from '../../model/DataDockContext';
import { executeQuery } from './executeQuery';
import { resolveDocumentConnection } from '../../registry/resolveDocumentConnection';

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
