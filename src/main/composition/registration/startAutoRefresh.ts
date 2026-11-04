import type * as vscode from 'vscode';
import type { ConnectionManager } from '../../../application/connections/lifecycle/ConnectionManager';

const AUTO_REFRESH_MS = 15_000;

export function startAutoRefresh(manager: ConnectionManager): vscode.Disposable {
  const timer = setInterval(() => void manager.refresh(), AUTO_REFRESH_MS);
  return { dispose: () => clearInterval(timer) };
}
