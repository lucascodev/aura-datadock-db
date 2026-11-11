import * as vscode from 'vscode';
import { buildAddColumn } from '../../../../../../application/editing/structure/buildAddColumn';
import type { ConnectionTarget } from '../../../../../../domain/connection/model/ConnectionTarget';
import { getDriver } from '../../../../../../drivers/catalog/getDriver';
import type { TableNode } from '../../../../tree/nodes/schema/TableNode';
import type { DataDockContext } from '../../../model/DataDockContext';
import { l10n } from '../../../../../../domain/i18n/translation/l10n';
import { askName } from '../shared/askName';
import { openReview } from '../shared/openReview';

export async function addColumn(context: DataDockContext, node: TableNode): Promise<void> {
  const target = context.connections.getTarget(node.targetId);
  const name = target ? await askName(l10n.t('New column of {0}', node.table.name)) : undefined;
  if (!target || !name) {
    return;
  }
  const dataType = await askDataType(target);
  const allowNullLabel = l10n.t('Allow NULL');
  const nullability = dataType ? await vscode.window.showQuickPick([allowNullLabel, 'NOT NULL'], { placeHolder: l10n.t('Can {0} be NULL?', name) }) : undefined;
  if (dataType && nullability) {
    await openReview(context, target, buildAddColumn(target.kind, node.table, { name, dataType, isNullable: nullability === allowNullLabel }));
  }
}

async function askDataType(target: ConnectionTarget): Promise<string | undefined> {
  const otherTypeLabel = l10n.t('Other…');
  const picked = await vscode.window.showQuickPick([...getDriver(target.kind).dialect.commonTypes, otherTypeLabel], { placeHolder: l10n.t('Column type') });
  if (picked !== otherTypeLabel) {
    return picked;
  }
  return vscode.window.showInputBox({ prompt: l10n.t('Column type'), validateInput: (text) => (text.trim() ? undefined : l10n.t('Enter a type.')) });
}
