import { isLocalHost } from '../../../application/connections/guidance/isLocalHost';
import type { ConnectionSource } from '../../../domain/connection/ports/ConnectionSource';
import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import { TLS_OFF } from '../../../domain/connection/constants/tlsOff';
import type { DriverId } from '../../../domain/driver/model/DriverId';
import { getDriver } from '../../../drivers/catalog/driverCatalog';
import type { DockerContainerSummary } from '../model/DockerContainer';
import { detectDatabaseKind } from './detectDatabaseKind';
import type { DockerClient } from '../client/DockerClient';
import { parseEnv, resolveCredentials } from './resolveCredentials';
import { resolvePublishedPort } from './resolvePublishedPort';

interface DatabaseContainer {
  readonly container: DockerContainerSummary;
  readonly kind: DriverId;
}

export class ContainerDiscovery implements ConnectionSource {
  readonly kind = 'docker';

  constructor(private readonly docker: DockerClient) {}

  async discover(): Promise<ConnectionTarget[]> {
    const containers = await this.docker.listRunningContainers();
    const databaseContainers = containers.flatMap(toDatabaseContainer);
    const targets = await Promise.all(databaseContainers.map((entry) => this.toConnectionTarget(entry)));
    return targets.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async toConnectionTarget({ container, kind }: DatabaseContainer): Promise<ConnectionTarget> {
    const details = await this.docker.inspectContainer(container.Id);
    const credentials = resolveCredentials(kind, parseEnv(details.Config.Env));
    const address = resolvePublishedPort(container.Ports, getDriver(kind).defaultPort);
    const name = containerDisplayName(container);

    return {
      id: container.Id,
      key: `docker:${name}`,
      name,
      detail: container.Image,
      source: 'docker',
      kind,
      host: address?.host,
      port: address?.port,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
      credentialSource: credentials.password === undefined ? 'missing' : 'container-env',
      credentialScope: this.docker.endpointLabel,
      isRemote: address !== undefined && !isLocalHost(address.host),
      isReadOnly: false,
      tls: TLS_OFF,
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
