import * as vscode from 'vscode';
import { ConnectionManager } from '../../../application/connections/lifecycle/ConnectionManager';
import { SavedConnections } from '../../../application/connections/saved/SavedConnections';
import { resolveProtectionSetting } from '../../../application/settings/resolveProtectionSetting';
import type { ConnectionSource } from '../../../domain/connection/ports/ConnectionSource';
import { DockerClient } from '../../../infrastructure/docker/client/DockerClient';
import { resolveDockerEndpoint } from '../../../infrastructure/docker/client/resolveDockerEndpoint';
import { ContainerDiscovery } from '../../../infrastructure/docker/discovery/ContainerDiscovery';
import { openAdapter } from '../../../infrastructure/ssh/tunnel/openAdapter';
import { passwordSecretName } from '../../../presentation/vscode/commands/registry/passwordSecretName';
import type { ConnectionServices } from '../model/ConnectionServices';
import type { HostEnvironment } from '../model/HostEnvironment';

const CONNECTIONS_SETTING = 'connections';

export function createConnectionServices(host: HostEnvironment): ConnectionServices {
  const { extension, config } = host;
  const dockerSource: ConnectionSource = {
    kind: 'docker',
    discover: () => new ContainerDiscovery(new DockerClient(resolveDockerEndpoint(config().get<string>('dockerHost')))).discover(),
  };
  const savedConnections = new SavedConnections({
    read: () => config().get<unknown[]>(CONNECTIONS_SETTING, []),
    write: (list) => config().update(CONNECTIONS_SETTING, list, vscode.ConfigurationTarget.Global),
  });
  const manager = new ConnectionManager(
    [savedConnections, dockerSource],
    { get: (target) => extension.secrets.get(passwordSecretName(target)) },
    { readOnly: (target) => resolveProtectionSetting(config().inspect<boolean>('readOnly'), false) || target.isReadOnly, openAdapter },
  );
  return { savedConnections, manager };
}
