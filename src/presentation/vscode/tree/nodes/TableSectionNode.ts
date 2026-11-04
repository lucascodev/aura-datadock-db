import * as vscode from 'vscode';
import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import { l10n } from '../../../../domain/i18n/translation/l10n';

type TableSection = 'columns' | 'indexes' | 'foreignKeys';

const SECTION_LABELS: Readonly<Record<TableSection, () => string>> = {
  columns: () => l10n.t('Columns'),
  indexes: () => l10n.t('Indexes'),
  foreignKeys: () => l10n.t('Foreign Keys'),
};

const SECTION_ICONS: Readonly<Record<TableSection, string>> = {
  columns: 'symbol-field',
  indexes: 'list-ordered',
  foreignKeys: 'references',
};

export class TableSectionNode extends vscode.TreeItem {
  constructor(
    readonly targetId: string,
    readonly table: TableDefinition,
    readonly section: TableSection,
    itemCount: number,
  ) {
    super(SECTION_LABELS[section](), section === 'columns' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
    this.id = `section:${targetId}:${table.namespace}.${table.name}:${section}`;
    this.contextValue = 'tableSection';
    this.description = String(itemCount);
    this.iconPath = new vscode.ThemeIcon(SECTION_ICONS[section]);
  }
}
