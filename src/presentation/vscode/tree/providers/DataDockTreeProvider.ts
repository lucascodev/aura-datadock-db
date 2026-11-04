import * as vscode from 'vscode';
import type { ConnectionManager } from '../../../../application/connections/lifecycle/ConnectionManager';
import type { ConnectionSourceKind } from '../../../../domain/connection/ConnectionTarget';
import { ConnectionGroupNode } from '../nodes/ConnectionGroupNode';
import { ConnectionNode } from '../nodes/ConnectionNode';
import { MessageNode } from '../nodes/MessageNode';
import { l10n } from '../../../../domain/i18n/l10n';

type Node = ConnectionGroupNode | ConnectionNode | MessageNode;

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

  getChildren(element?: Node): Node[] {
    if (!element) {
      return this.getRootNodes();
    }
    return element instanceof ConnectionGroupNode ? this.getSourceNodes(element.source) : [];
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
    const activeId = this.connections.activeTarget?.id;
    const nodes = this.connections
      .getTargets()
      .filter((target) => target.source === source)
      .map((target) => new ConnectionNode(target, target.id === activeId));
    if (nodes.length > 0 || source !== 'docker') {
      return nodes;
    }
    return this.getDockerWarning();
  }

  private getDockerWarning(): Node[] {
    const error = this.connections.getSourceError('docker');
    if (!error || !this.isDockerHostConfigured()) {
      return [];
    }
    return [new MessageNode(l10n.t('Docker is not available: {0}', error), 'warning', { command: 'auraDataDockDb.refresh', title: l10n.t('Retry') })];
  }
}
