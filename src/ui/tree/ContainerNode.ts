import * as vscode from 'vscode';
import { isReachable, type ConnectionTarget } from '../../domain/ConnectionTarget';

export class ContainerNode extends vscode.TreeItem {
  constructor(
    readonly target: ConnectionTarget,
    isActive: boolean,
  ) {
    const ready = isReachable(target) && target.password !== undefined;
    super(target.containerName, ready ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);

    this.id = `container:${target.id}`;
    this.contextValue = ready ? 'container' : isReachable(target) ? 'container-missing-password' : 'container-unreachable';
    this.description = describe(target, isActive);
    this.iconPath = new vscode.ThemeIcon(
      ready ? 'database' : 'warning',
      isActive ? new vscode.ThemeColor('charts.green') : undefined,
    );
    this.tooltip = buildTooltip(target);
  }
}

function describe(target: ConnectionTarget, isActive: boolean): string {
  const engine = target.kind === 'postgres' ? 'Postgres' : 'MySQL';
  const address = isReachable(target) ? `:${target.port}` : 'port not published';
  const status = target.password === undefined && isReachable(target) ? ' · password needed' : '';
  return `${isActive ? '● ' : ''}${engine} ${address}${status}`;
}

function buildTooltip(target: ConnectionTarget): vscode.MarkdownString {
  const lines = [
    `**${target.containerName}**`,
    '',
    `Image: \`${target.image}\``,
    `User: \`${target.user}\``,
    `Database: \`${target.database ?? '(default)'}\``,
    isReachable(target) ? `Address: \`${target.host}:${target.port}\`` : 'Publish the database port (for example `-p 5432:5432`) to connect.',
  ];
  return new vscode.MarkdownString(lines.join('\n\n'));
}
