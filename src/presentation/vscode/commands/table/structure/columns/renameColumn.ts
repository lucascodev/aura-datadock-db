import { buildRenameColumn } from '../../../../../../application/editing/structure/buildRenameColumn';
import type { ColumnNode } from '../../../../tree/nodes/schema/ColumnNode';
import type { DataDockContext } from '../../../model/DataDockContext';
import { l10n } from '../../../../../../domain/i18n/translation/l10n';
import { askName } from '../shared/askName';
import { openReview } from '../shared/openReview';

export async function renameColumn(context: DataDockContext, node: ColumnNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  const newName = target ? await askName(l10n.t('Rename {0} to', node.column.name), node.column.name) : undefined;
  if (target && newName) {
    await openReview(context, target, buildRenameColumn(target.kind, node.table, node.column.name, newName));
  }
}
