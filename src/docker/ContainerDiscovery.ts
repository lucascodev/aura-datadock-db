import type { ConnectionTarget } from '../domain/ConnectionTarget';
import type { DatabaseKind } from '../domain/DatabaseKind';
import type { DockerContainerSummary } from './DockerContainer';
import { DEFAULT_PORTS, detectDatabaseKind } from './detectDatabaseKind';
import type { DockerClient } from './DockerClient';
import { parseEnv, resolveCredentials } from './resolveCredentials';
import { resolvePublishedPort } from './resolvePublishedPort';

interface DatabaseContainer {
  readonly container: DockerContainerSummary;
  readonly kind: DatabaseKind;
}

export class ContainerDiscovery {
  constructor(private readonly docker: DockerClient) {}

  async discover(): Promise<ConnectionTarget[]> {
    const containers = await this.docker.listRunningContainers();
    const databaseContainers = containers.flatMap(toDatabaseContainer);
    const targets = await Promise.all(databaseContainers.map((entry) => this.toConnectionTarget(entry)));
    return targets.sort((a, b) => a.containerName.localeCompare(b.containerName));
  }

  private async toConnectionTarget({ container, kind }: DatabaseContainer): Promise<ConnectionTarget> {
    const details = await this.docker.inspectContainer(container.Id);
    const credentials = resolveCredentials(kind, parseEnv(details.Config.Env));
    const address = resolvePublishedPort(container.Ports, DEFAULT_PORTS[kind]);

    return {
      id: container.Id,
      containerName: containerDisplayName(container),
      image: container.Image,
      kind,
      host: address?.host,
      port: address?.port,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
      credentialSource: credentials.password === undefined ? 'missing' : 'container-env',
    };
  }
}

function toDatabaseContainer(container: DockerContainerSummary): DatabaseContainer[] {
  const kind = detectDatabaseKind(container.Image);
  return kind ? [{ container, kind }] : [];
}

function containerDisplayName(container: DockerContainerSummary): string {
  const SHORT_ID_LENGTH = 12;
  return container.Names[0]?.replace(/^\//, '') ?? container.Id.slice(0, SHORT_ID_LENGTH);
}
