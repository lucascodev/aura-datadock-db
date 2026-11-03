import * as vscode from 'vscode';
import { MissingPasswordError, type ConnectionManager } from '../../core/ConnectionManager';
import { ColumnNode } from './ColumnNode';
import { ContainerNode } from './ContainerNode';
import { MessageNode } from './MessageNode';
import { NamespaceNode } from './NamespaceNode';
import { TableNode } from './TableNode';

type Node = ContainerNode | NamespaceNode | TableNode | ColumnNode | MessageNode;

export class DataDockTreeProvider implements vscode.TreeDataProvider<Node> {
  private readonly changeEmitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  private discoveryError?: string;

  constructor(private readonly connections: ConnectionManager) {}

  refresh(discoveryError?: string): void {
    this.discoveryError = discoveryError;
    this.changeEmitter.fire(undefined);
  }

  getTreeItem(element: Node): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: Node): Promise<Node[]> {
    if (!element) {
      return this.getRootNodes();
    }
    try {
      if (element instanceof ContainerNode) {
        const adapter = await this.connections.getAdapter(element.target.id);
        const namespaces = await adapter.listNamespaces();
        return namespaces.map((namespace) => new NamespaceNode(element.target.id, namespace));
      }
      if (element instanceof NamespaceNode) {
        const adapter = await this.connections.getAdapter(element.targetId);
        const tables = await adapter.listTables(element.namespace);
        return tables.length > 0
          ? tables.map((table) => new TableNode(element.targetId, table))
          : [new MessageNode('No tables')];
      }
      if (element instanceof TableNode) {
        const adapter = await this.connections.getAdapter(element.targetId);
        const columns = await adapter.listColumns(element.table);
        return columns.map((column) => new ColumnNode(column));
      }
    } catch (error) {
      return [this.errorNode(error)];
    }
    return [];
  }

  private getRootNodes(): Node[] {
    if (this.discoveryError) {
      return [new MessageNode(this.discoveryError, 'error', { command: 'auraDataDock.refresh', title: 'Retry' })];
    }
    const activeId = this.connections.activeTarget?.id;
    return this.connections.getTargets().map((target) => new ContainerNode(target, target.id === activeId));
  }

  private errorNode(error: unknown): MessageNode {
    if (error instanceof MissingPasswordError) {
      return new MessageNode('Password needed, click to set it', 'key', {
        command: 'auraDataDock.setPassword',
        title: 'Set Password',
        arguments: [error.target.id],
      });
    }
    return new MessageNode(error instanceof Error ? error.message : String(error), 'error');
  }
}
