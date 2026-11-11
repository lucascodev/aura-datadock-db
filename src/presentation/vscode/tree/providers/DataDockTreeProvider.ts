import * as vscode from 'vscode';
import type { ConnectionManager } from '../../../../application/connections/lifecycle/ConnectionManager';
import type { ConnectionSourceKind, ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import { ConnectionGroupNode } from '../nodes/connection/ConnectionGroupNode';
import { ConnectionNode } from '../nodes/connection/ConnectionNode';
import { DatabaseNode } from '../nodes/connection/DatabaseNode';
import { MessageNode } from '../nodes/shared/MessageNode';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import { toErrorNode } from './toErrorNode';

type Node = ConnectionGroupNode | ConnectionNode | DatabaseNode | MessageNode;

export class DataDockTreeProvider implements vscode.TreeDataProvider<Node> {
  private readonly changeEmitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor(
    private readonly connections: ConnectionManager,
    private readonly isDockerHostConfigured: () => boolean,
  ) {}

  refresh(): void {
    this.changeEmitter.fire(undefined);
  }

  getTreeItem(element: Node): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: Node): Promise<Node[]> {
    if (!element) {
      return this.getRootNodes();
    }
    if (element instanceof ConnectionGroupNode) {
      return this.getSourceNodes(element.source);
    }
    if (element instanceof ConnectionNode) {
      return this.getDatabaseNodes(element.target);
    }
    return [];
  }

  private getRootNodes(): Node[] {
    const docker = this.getSourceNodes('docker');
    const saved = this.getSourceNodes('saved');
    if (docker.length > 0 && saved.length > 0) {
      return [new ConnectionGroupNode('saved'), new ConnectionGroupNode('docker')];
    }
    return [...saved, ...docker];
  }

  private getSourceNodes(source: ConnectionSourceKind): Node[] {
    const nodes = this.connections
      .getTargets()
      .filter((target) => target.source === source)
      .map((target) => new ConnectionNode(target, this.isActiveServer(target)));
    if (nodes.length > 0 || source !== 'docker') {
      return nodes;
    }
    return this.getDockerWarning();
  }

  private async getDatabaseNodes(server: ConnectionTarget): Promise<Node[]> {
    try {
      const adapter = await this.connections.getAdapter(server.id);
      const databases = await adapter.listDatabases();
      const activeId = this.connections.activeTarget?.id;
      return databases.flatMap((database) => {
        const target = this.connections.resolveDatabaseTarget(server.id, database);
        return target ? [new DatabaseNode(target, database, target.id === activeId)] : [];
      });
    } catch (error) {
      return [toErrorNode(error)];
    }
  }

  private isActiveServer(target: ConnectionTarget): boolean {
    const active = this.connections.activeTarget;
    return active !== undefined && (active.id === target.id || active.parentId === target.id);
  }

  private getDockerWarning(): Node[] {
    const error = this.connections.getSourceError('docker');
    if (!error || !this.isDockerHostConfigured()) {
      return [];
    }
    return [new MessageNode(l10n.t('Docker is not available: {0}', error), 'warning', { command: 'auraDataDockDb.refresh', title: l10n.t('Retry') })];
  }
}
