import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { BOTTOM_PADDING, HEADER_HEIGHT, ROW_HEIGHT } from '../constants/diagramMetrics';
import type { DiagramColumn, DiagramDetail, DiagramTable } from '../model/DiagramModel';
import { computeTableWidth } from './computeTableWidth';

export function toDiagramTable(
  table: TableDefinition,
  detail: DiagramDetail,
  referencedColumns: ReadonlyMap<string, ReadonlySet<string>>,
): DiagramTable {
  const allColumns = toDiagramColumns(table);
  const referenced = referencedColumns.get(table.name);
  const columns = allColumns.filter((column) => isColumnVisible(column, detail, referenced));

  return {
    name: table.name,
    kind: table.kind,
    columns,
    width: computeTableWidth(table.name, columns),
    height: HEADER_HEIGHT + columns.length * ROW_HEIGHT + (columns.length > 0 ? BOTTOM_PADDING : 0),
  };
}

function toDiagramColumns(table: TableDefinition): DiagramColumn[] {
  return table.columns.map((column) => {
    const foreignKey = table.foreignKeys.find((candidate) => candidate.columns.includes(column.name));
    return {
      name: column.name,
      dataType: column.dataType,
      isPrimaryKey: column.isPrimaryKey,
      isForeignKey: foreignKey !== undefined,
      isNullable: column.nullable,
      foreignTarget: foreignKey ? `${foreignKey.referencedNamespace}.${foreignKey.referencedTable}` : undefined,
    };
  });
}

function isColumnVisible(column: DiagramColumn, detail: DiagramDetail, referenced?: ReadonlySet<string>): boolean {
  if (detail === 'entities') {
    return false;
  }
  return detail === 'full' || column.isPrimaryKey || column.isForeignKey || (referenced?.has(column.name) ?? false);
}
