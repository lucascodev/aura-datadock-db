import type { DataDockContext } from '../../model/DataDockContext';
import { requireEditor } from './requireEditor';
import { runFromEditor } from './runFromEditor';

export async function runQuery(context: DataDockContext): Promise<void> {
  const editor = requireEditor();
  if (editor) {
    await runFromEditor(context, editor, (sql) => sql);
  }
}
