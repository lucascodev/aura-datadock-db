import type { QueryHistoryEntry } from '../../../../../application/query/model/QueryHistoryEntry';
import type { DataDockContext } from '../../model/DataDockContext';
import { openBoundDocument } from '../editor/openBoundDocument';

export async function openHistoryEntry(context: DataDockContext, entry: QueryHistoryEntry): Promise<void> {
  await openBoundDocument(context, entry.connectionKey, `${entry.sql}\n`);
}
