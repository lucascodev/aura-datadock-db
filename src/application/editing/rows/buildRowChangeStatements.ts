import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { ParameterizedStatement } from '../../../domain/database/model/ParameterizedStatement';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { buildDelete } from '../changes/buildDelete';
import { buildInsert } from '../changes/buildInsert';
import { buildUpdate } from '../changes/buildUpdate';
import { describeEditability } from './describeEditability';
import type { RowChange } from '../model/RowChange';
import { l10n } from '../../../domain/i18n/translation/l10n';

const CHANGE_ORDER: readonly RowChange['type'][] = ['delete', 'update', 'insert'];

function assertAllowed(isAllowed: boolean, reason: string | undefined): void {
  if (!isAllowed) {
    throw new Error(reason ?? l10n.t('This change is not allowed.'));
  }
}

export function buildRowChangeStatements(table: TableDefinition, kind: DriverId, isReadOnly: boolean, changes: readonly RowChange[]): ParameterizedStatement[] {
  const editability = describeEditability(table, kind, isReadOnly);
  return CHANGE_ORDER.flatMap((type) => changes.filter((change) => change.type === type)).map((change) => {
    switch (change.type) {
      case 'delete':
        assertAllowed(editability.canDelete, editability.notice);
        return buildDelete(table, kind, change.key);
      case 'update':
        assertAllowed(editability.canUpdate, editability.notice);
        return buildUpdate(table, kind, change.key, change.values);
      case 'insert':
        assertAllowed(editability.canInsert, editability.notice);
        return buildInsert(table, kind, change.values);
    }
  });
}
