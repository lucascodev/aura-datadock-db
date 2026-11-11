import * as vscode from 'vscode';
import type { ConnectionTarget } from '../../../../../domain/connection/model/ConnectionTarget';
import { getDriver } from '../../../../../drivers/catalog/getDriver';

export function chooseConnectionCollapsibleState(target: ConnectionTarget, ready: boolean): vscode.TreeItemCollapsibleState {
  const listsDatabases = ready && getDriver(target.kind).isConnectionScopedToDatabase === true;
  return listsDatabases ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
}
