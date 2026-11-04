import { buildTableSelect } from '../../../../../application/editing/tableQuery/buildTableSelect';
import type { TableNode } from '../../../tree/nodes/TableNode';
import type { DataDockContext } from '../../model/DataDockContext';
import { l10n } from '../../../../../domain/i18n/translation/l10n';
import { exportRows } from './exportRows';
import { reportFailure } from './reportFailure';

export async function exportTable(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  if (!target) {
    return;
  }
  try {
    const schema = await context.schemas.get(target.id, node.table.namespace);
    const table = schema.tables.find((candidate) => candidate.name === node.table.name);
    if (!table) {
      throw new Error(l10n.t('The table {0} was not found. Refresh the view.', node.table.name));
    }
    await exportRows(context, target, node.table, buildTableSelect(table, target.kind, { filters: [] }));
  } catch (error) {
    reportFailure(context, target, error);
  }
}
