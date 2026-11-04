import { buildExplain } from '../../../../../application/query/analysis/buildExplain';
import type { DataDockContext } from '../../model/DataDockContext';
import { requireEditor } from './requireEditor';
import { runFromEditor } from './runFromEditor';

export async function explainQuery(context: DataDockContext): Promise<void> {
  const editor = requireEditor();
  if (editor) {
    await runFromEditor(context, editor, buildExplain);
  }
}
