import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { l10n } from '../../../domain/i18n/translation/l10n';
import type { CellValues } from '../model/RowChange';
import { isColumnEditable } from '../rows/isColumnEditable';

export function editableValues(table: TableDefinition, kind: DriverId, values: CellValues): CellValues {
  for (const name of Object.keys(values)) {
    const column = table.columns.find((candidate) => candidate.name === name);
    if (!column) {
      throw new Error(l10n.t('The column {0} does not exist in {1}.', name, table.name));
    }
    if (!isColumnEditable(column, kind)) {
      throw new Error(l10n.t('The column {0} cannot be changed.', name));
    }
  }
  return values;
}
