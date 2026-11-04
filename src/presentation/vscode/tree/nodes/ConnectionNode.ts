import * as vscode from 'vscode';
import { isReachable, type ConnectionTarget } from '../../../../domain/connection/ConnectionTarget';
import { getDriver } from '../../../../drivers/catalog/driverCatalog';
import { l10n } from '../../../../domain/i18n/l10n';

export class ConnectionNode extends vscode.TreeItem {
  constructor(
    readonly target: ConnectionTarget,
    isActive: boolean,
  ) {
    const ready = isReachable(target) && target.password !== undefined;
    super(target.name, vscode.TreeItemCollapsibleState.None);

    this.id = `connection:${target.id}`;
    this.contextValue = `connection-${target.source}-${describeState(target, ready)}`;
    this.description = describe(target, isActive);
    this.iconPath = new vscode.ThemeIcon(chooseIcon(target, ready), isActive ? new vscode.ThemeColor('charts.green') : undefined);
    this.tooltip = buildTooltip(target);
    if (ready) {
      this.command = { command: 'auraDataDockDb.activateConnection', title: l10n.t('Select Connection'), arguments: [target.id] };
    } else if (isReachable(target)) {
      this.command = { command: 'auraDataDockDb.setPassword', title: l10n.t('Set Password'), arguments: [target.id] };
    }
  }
}

function describeState(target: ConnectionTarget, ready: boolean): string {
  if (ready) {
    return 'ready';
  }
  return isReachable(target) ? 'missing-password' : 'unreachable';
}

function chooseIcon(target: ConnectionTarget, ready: boolean): string {
  if (!ready) {
    return isReachable(target) ? 'key' : 'warning';
  }
  if (target.ssh) {
    return 'remote';
  }
  return target.isRemote ? 'cloud' : 'database';
}

function describe(target: ConnectionTarget, isActive: boolean): string {
  const engine = getDriver(target.kind).label;
  const address = isReachable(target) ? describeAddress(target) : l10n.t('port not published');
  const marks = [
    target.ssh ? 'SSH' : undefined,
    target.isRemote && !target.ssh ? l10n.t('remote') : undefined,
    target.isReadOnly ? l10n.t('read-only') : undefined,
    target.password === undefined && isReachable(target) ? l10n.t('password needed') : undefined,
  ].filter((mark) => mark !== undefined);
  return [`${isActive ? '● ' : ''}${engine}`, ...marks, address].join(' · ');
}

function describeAddress(target: ConnectionTarget): string {
  return target.source === 'docker' ? `:${target.port}` : `${target.host}:${target.port}`;
}

function buildTooltip(target: ConnectionTarget): vscode.MarkdownString {
  const lines = [
    `**${target.name}**`,
    '',
    target.source === 'docker' ? l10n.t('Image: `{0}`', target.detail) : undefined,
    l10n.t('User: `{0}`', target.user),
    l10n.t('Database: `{0}`', target.database ?? l10n.t('(default)')),
    isReachable(target) ? l10n.t('Address: `{0}`', `${target.host}:${target.port}`) : l10n.t('Publish the database port (for example `-p 5432:5432`) to connect.'),
    target.ssh ? `SSH: \`${target.ssh.host}\`` : undefined,
    target.source === 'saved' ? `TLS: \`${target.tls.mode}\`` : undefined,
    target.isReadOnly ? l10n.t('Read-only: writes are blocked.') : undefined,
  ].filter((line) => line !== undefined);
  const tooltip = new vscode.MarkdownString();
  tooltip.appendText('');
  lines.forEach((line, index) => tooltip.appendMarkdown(index === 0 ? line : `\n\n${line}`));
  return tooltip;
}
