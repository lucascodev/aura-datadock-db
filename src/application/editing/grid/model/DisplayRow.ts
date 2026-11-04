import type { CellValue } from '../../../../domain/database/model/ParameterizedStatement';

export interface DisplayRow {
  readonly rowId: string;
  readonly label: string;
  readonly isNew: boolean;
  readonly isDeleted: boolean;
  readonly isIdentified: boolean;
  readonly values: readonly (CellValue | undefined)[];
  readonly changedColumns: ReadonlySet<string>;
}
