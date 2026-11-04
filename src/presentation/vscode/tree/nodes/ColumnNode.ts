import * as vscode from 'vscode';
import type { ForeignKey } from '../../../../domain/schema/model/ForeignKey';
import type { TableColumn } from '../../../../domain/schema/model/TableColumn';
import type { TableRef } from '../../../../domain/schema/model/TableRef';
import { l10n } from '../../../../domain/i18n/translation/l10n';

export class ColumnNode extends vscode.TreeItem {
  constructor(
    readonly targetId: string,
    readonly table: TableRef,
    readonly column: TableColumn,
    foreignKey?: ForeignKey,
  ) {
    super(column.name, vscode.TreeItemCollapsibleState.None);
    this.id = `column:${targetId}:${table.namespace}.${table.name}.${column.name}`;
    this.contextValue = table.kind === 'view' ? 'view-column' : 'column';
    this.description = column.nullable ? column.dataType : l10n.t('{0} not null', column.dataType);
    this.iconPath = new vscode.ThemeIcon(chooseIcon(column, foreignKey));
    this.tooltip = buildTooltip(column, foreignKey);
  }
}

function chooseIcon(column: TableColumn, foreignKey?: ForeignKey): string {
  if (column.isPrimaryKey) {
    return 'key';
  }
  return foreignKey ? 'references' : 'symbol-field';
}

function buildTooltip(column: TableColumn, foreignKey?: ForeignKey): string | undefined {
  const lines = [
    foreignKey ? l10n.t('References {0}.{1}({2})', foreignKey.referencedNamespace, foreignKey.referencedTable, foreignKey.referencedColumns.join(', ')) : undefined,
    column.defaultValue ? l10n.t('Default: {0}', column.defaultValue) : undefined,
  ].filter((line) => line !== undefined);
  return lines.length > 0 ? lines.join('\n') : undefined;
}
