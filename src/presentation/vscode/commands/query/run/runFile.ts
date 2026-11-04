import type { DataDockContext } from '../../model/DataDockContext';
import { executeQuery } from './executeQuery';
import { resolveDocumentConnection } from '../../registry/resolveDocumentConnection';
import { requireEditor } from './requireEditor';

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
