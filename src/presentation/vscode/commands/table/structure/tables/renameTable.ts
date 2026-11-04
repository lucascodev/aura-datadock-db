import { buildRenameTable } from '../../../../../../application/editing/structure/buildRenameTable';
import type { TableNode } from '../../../../tree/nodes/TableNode';
import type { DataDockContext } from '../../../model/DataDockContext';
import { l10n } from '../../../../../../domain/i18n/translation/l10n';
import { askName } from '../shared/askName';
import { openReview } from '../shared/openReview';

export async function renameTable(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  const newName = target ? await askName(l10n.t('Rename {0} to', node.table.name), node.table.name) : undefined;
  if (target && newName) {
    await openReview(context, target, buildRenameTable(target.kind, node.table, newName));
  }
}
