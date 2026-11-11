import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import { toDatabaseTarget } from './toDatabaseTarget';

export class DatabaseTargetRegistry {
  private targets = new Map<string, ConnectionTarget>();

  register(server: ConnectionTarget, database: string): ConnectionTarget {
    const target = toDatabaseTarget(server, database);
    if (target !== server) {
      this.targets.set(target.id, target);
    }
    return target;
  }

  get(id: string): ConnectionTarget | undefined {
    return this.targets.get(id);
  }

  findByKey(key: string): ConnectionTarget | undefined {
    return [...this.targets.values()].find((target) => target.key === key);
  }

  idsOf(serverId: string): string[] {
    return [...this.targets.values()].filter((target) => target.parentId === serverId).map((target) => target.id);
  }

  ids(): string[] {
    return [...this.targets.keys()];
  }

  /** Rebuilds every database target from its current server, so password and address changes reach it. */
  rebase(servers: readonly ConnectionTarget[]): void {
    const serversById = new Map(servers.map((server) => [server.id, server]));
    this.targets = new Map(
      [...this.targets.values()].flatMap((target) => {
        const server = target.parentId ? serversById.get(target.parentId) : undefined;
        if (!server || target.database === undefined) {
          return [];
        }
        const rebuilt = toDatabaseTarget(server, target.database);
        return rebuilt === server ? [] : [[rebuilt.id, rebuilt] as const];
      }),
    );
  }
}
