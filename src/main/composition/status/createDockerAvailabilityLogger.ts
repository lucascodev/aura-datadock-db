import type * as vscode from 'vscode';
import type { ConnectionManager } from '../../../application/connections/lifecycle/ConnectionManager';

export function createDockerAvailabilityLogger(manager: ConnectionManager, output: vscode.LogOutputChannel): () => void {
  let lastDockerError: string | undefined;
  return () => {
    const dockerError = manager.getSourceError('docker');
    if (dockerError !== lastDockerError) {
      lastDockerError = dockerError;
      output.info(dockerError ? `Docker is not available: ${dockerError}` : 'Docker is available');
    }
  };
}
