import * as vscode from 'vscode';
import type { ConnectionManager } from '../../../../application/connections/lifecycle/ConnectionManager';
import { chooseDefaultNamespace } from '../../../../application/schema/loading/chooseDefaultNamespace';
import type { SchemaCache } from '../../../../application/schema/loading/SchemaCache';
import type { TableDefinition } from '../../../../domain/schema/model/TableDefinition';
import type { TableRef } from '../../../../domain/schema/model/TableRef';
import { ColumnNode } from '../nodes/schema/ColumnNode';
import { toErrorNode } from './toErrorNode';
import { MessageNode } from '../nodes/shared/MessageNode';
import { NamespaceNode } from '../nodes/schema/NamespaceNode';
import { TableNode } from '../nodes/schema/TableNode';
import { TableSectionNode } from '../nodes/schema/TableSectionNode';
import { l10n } from '../../../../domain/i18n/translation/l10n';

type SchemaNode = NamespaceNode | TableNode | TableSectionNode | ColumnNode | MessageNode;

export class SchemaTreeProvider implements vscode.TreeDataProvider<SchemaNode> {
  private readonly changeEmitter = new vscode.EventEmitter<SchemaNode | undefined>();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  private tableFilter = '';

  constructor(
    private readonly connections: ConnectionManager,
    private readonly schemas: SchemaCache,
  ) {}

  get filter(): string {
    return this.tableFilter;
  }

  setFilter(filter: string): void {
    this.tableFilter = filter.trim();
    this.refresh();
  }

  refresh(): void {
    this.changeEmitter.fire(undefined);
  }

  getTreeItem(element: SchemaNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SchemaNode): Promise<SchemaNode[]> {
    try {
      if (!element) {
        return await this.getNamespaceNodes();
      }
      if (element instanceof NamespaceNode) {
        return await this.getTableNodes(element);
      }
      if (element instanceof TableNode) {
        return await this.getSectionNodes(element);
      }
      if (element instanceof TableSectionNode) {
        return getSectionItems(element);
      }
    } catch (error) {
      return [toErrorNode(error)];
    }
    return [];
  }

  private async getNamespaceNodes(): Promise<SchemaNode[]> {
    const target = this.connections.activeTarget;
    if (!target) {
      return [];
    }
    const adapter = await this.connections.getAdapter(target.id);
    const namespaces = await adapter.listNamespaces();
    const defaultNamespace = chooseDefaultNamespace(target.kind, target.database, namespaces);
    return namespaces.map((namespace) => new NamespaceNode(target.id, namespace, namespace === defaultNamespace));
  }

  private async getTableNodes(node: NamespaceNode): Promise<SchemaNode[]> {
    const adapter = await this.connections.getAdapter(node.targetId);
    const tables = await adapter.listTables(node.namespace);
    const visible = tables.filter((table) => this.matchesFilter(table));
    if (visible.length > 0) {
      return visible.map((table) => new TableNode(node.targetId, table));
    }
    return [new MessageNode(this.tableFilter ? l10n.t('No tables match "{0}"', this.tableFilter) : l10n.t('No tables'))];
  }

  private matchesFilter(table: TableRef): boolean {
    return table.name.toLowerCase().includes(this.tableFilter.toLowerCase());
  }

  private async getSectionNodes(node: TableNode): Promise<SchemaNode[]> {
    const schema = await this.schemas.get(node.targetId, node.table.namespace);
    const table = schema.tables.find((candidate) => candidate.name === node.table.name);
    if (!table) {
      return [new MessageNode(l10n.t('Table not found, refresh the view'))];
    }
    const sections: TableSectionNode[] = [new TableSectionNode(node.targetId, table, 'columns', table.columns.length)];
    if (table.indexes.length > 0) {
      sections.push(new TableSectionNode(node.targetId, table, 'indexes', table.indexes.length));
    }
    if (table.foreignKeys.length > 0) {
      sections.push(new TableSectionNode(node.targetId, table, 'foreignKeys', table.foreignKeys.length));
    }
    return sections;
  }
}

function getSectionItems(node: TableSectionNode): SchemaNode[] {
  const { table, targetId } = node;
  switch (node.section) {
    case 'columns':
      return table.columns.map((column) => new ColumnNode(targetId, table, column, findForeignKey(table, column.name)));
    case 'indexes':
      return table.indexes.map((index) => new MessageNode(index.name, index.isUnique ? 'key' : 'list-ordered', undefined, `${index.isUnique ? `${l10n.t('unique')} · ` : ''}${index.columns.join(', ')}`));
    case 'foreignKeys':
      return table.foreignKeys.map((foreignKey) => new MessageNode(foreignKey.name, 'references', undefined, `${foreignKey.columns.join(', ')} → ${foreignKey.referencedTable}(${foreignKey.referencedColumns.join(', ')})`));
  }
}

function findForeignKey(table: TableDefinition, column: string) {
  return table.foreignKeys.find((foreignKey) => foreignKey.columns.includes(column));
}
