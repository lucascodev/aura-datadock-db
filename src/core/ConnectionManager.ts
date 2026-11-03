import { createAdapter } from '../adapters/createAdapter';
import { isReachable, type ConnectionTarget } from '../domain/ConnectionTarget';
import type { DatabaseAdapter } from '../domain/DatabaseAdapter';
import type { ContainerDiscovery } from '../docker/ContainerDiscovery';

export interface PasswordStore {
  get(target: ConnectionTarget): PromiseLike<string | undefined>;
}

export interface ConnectionManagerOptions {
  readonly readOnly: () => boolean;
}

type Listener = () => void;

export class ConnectionManager {
  private targets: ConnectionTarget[] = [];
  private readonly adapters = new Map<string, Promise<DatabaseAdapter>>();
  private activeTargetId?: string;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly discovery: ContainerDiscovery,
    private readonly passwords: PasswordStore,
    private readonly options: ConnectionManagerOptions,
  ) {}

  async refresh(): Promise<ConnectionTarget[]> {
    const discovered = await this.discovery.discover();
    this.targets = await Promise.all(discovered.map((target) => this.withStoredPassword(target)));

    const liveIds = new Set(this.targets.map((target) => target.id));
    for (const id of [...this.adapters.keys()]) {
      if (!liveIds.has(id)) {
        await this.close(id);
      }
    }
    if (this.activeTargetId && !liveIds.has(this.activeTargetId)) {
      this.activeTargetId = undefined;
    }
    if (!this.activeTargetId) {
      this.activeTargetId = this.targets.find((target) => isReachable(target) && target.password !== undefined)?.id;
    }

    this.emit();
    return this.targets;
  }

  getTargets(): readonly ConnectionTarget[] {
    return this.targets;
  }

  getTarget(id: string): ConnectionTarget | undefined {
    return this.targets.find((target) => target.id === id);
  }

  findByName(name: string): ConnectionTarget | undefined {
    return this.targets.find((target) => target.containerName === name || target.id.startsWith(name));
  }

  get activeTarget(): ConnectionTarget | undefined {
    return this.activeTargetId ? this.getTarget(this.activeTargetId) : undefined;
  }

  setActive(id: string): void {
    this.activeTargetId = id;
    this.emit();
  }

  getAdapter(id: string): Promise<DatabaseAdapter> {
    const existing = this.adapters.get(id);
    if (existing) {
      return existing;
    }

    const target = this.getTarget(id);
    if (!target) {
      return Promise.reject(new Error(`Unknown connection ${id}`));
    }
    if (!isReachable(target)) {
      return Promise.reject(new Error(`The database port of ${target.containerName} is not published to the host`));
    }
    if (target.password === undefined) {
      return Promise.reject(new MissingPasswordError(target));
    }

    const pending = this.open(target);
    this.adapters.set(id, pending);
    pending.catch(() => this.adapters.delete(id));
    return pending;
  }

  async close(id: string): Promise<void> {
    const pending = this.adapters.get(id);
    this.adapters.delete(id);
    if (pending) {
      await pending.then((adapter) => adapter.dispose()).catch(() => undefined);
    }
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.adapters.keys()].map((id) => this.close(id)));
  }

  onDidChange(listener: Listener): { dispose(): void } {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }

  private async open(target: ConnectionTarget): Promise<DatabaseAdapter> {
    const adapter = createAdapter(target);
    await adapter.connect();
    if (this.options.readOnly()) {
      await adapter.enforceReadOnly();
    }
    return adapter;
  }

  private async withStoredPassword(target: ConnectionTarget): Promise<ConnectionTarget> {
    const stored = await this.passwords.get(target);
    if (stored === undefined) {
      return target;
    }
    return { ...target, password: stored, credentialSource: 'secret-storage' };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export class MissingPasswordError extends Error {
  constructor(readonly target: ConnectionTarget) {
    super(`No password found for ${target.containerName}. Use "Aura DataDock: Set Password".`);
    this.name = 'MissingPasswordError';
  }
}
