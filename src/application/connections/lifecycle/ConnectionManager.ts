import { type ConnectionSourceKind, type ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import { isReachable } from '../../../domain/connection/rules/isReachable';
import type { ConnectionSource } from '../../../domain/connection/ports/ConnectionSource';
import type { DatabaseAdapter } from '../../../domain/database/ports/DatabaseAdapter';
import { explainConnectionFailure } from '../guidance/explainConnectionFailure';
import { l10n } from '../../../domain/i18n/translation/l10n';
import type { PasswordStore } from '../ports/PasswordStore';
import type { ConnectionManagerOptions } from './ConnectionManagerOptions';
import { MissingPasswordError } from '../errors/MissingPasswordError';

type Listener = () => void;

export class ConnectionManager {
  private targets: ConnectionTarget[] = [];
  private readonly adapters = new Map<string, Promise<DatabaseAdapter>>();
  private readonly sourceErrors = new Map<ConnectionSourceKind, string>();
  private activeTargetId?: string;
  private lastSignature?: string;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly sources: readonly ConnectionSource[],
    private readonly passwords: PasswordStore,
    private readonly options: ConnectionManagerOptions,
  ) {}

  async refresh(): Promise<ConnectionTarget[]> {
    const discovered = await this.discoverAll();
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
    this.activeTargetId ??= this.targets.find(canBecomeActiveAutomatically)?.id;

    if (this.computeSignature() !== this.lastSignature) {
      this.emit();
    }
    return this.targets;
  }

  getTargets(): readonly ConnectionTarget[] {
    return this.targets;
  }

  getTarget(id: string): ConnectionTarget | undefined {
    return this.targets.find((target) => target.id === id);
  }

  findByKey(key: string): ConnectionTarget | undefined {
    return this.targets.find((target) => target.key === key);
  }

  findByName(name: string): ConnectionTarget | undefined {
    return this.targets.find((target) => target.name === name || target.id.startsWith(name));
  }

  getSourceError(kind: ConnectionSourceKind): string | undefined {
    return this.sourceErrors.get(kind);
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
      return Promise.reject(new Error(l10n.t('Unknown connection {0}', id)));
    }
    if (!isReachable(target)) {
      return Promise.reject(new Error(l10n.t('The database port of {0} is not published to the host', target.name)));
    }
    if (target.password === undefined) {
      return Promise.reject(new MissingPasswordError(target));
    }

    const pending: Promise<DatabaseAdapter> = this.open(target, () => {
      if (this.adapters.get(id) === pending) {
        this.adapters.delete(id);
      }
    });
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

  private async discoverAll(): Promise<ConnectionTarget[]> {
    const outcomes = await Promise.allSettled(this.sources.map((source) => source.discover()));
    this.sourceErrors.clear();

    return outcomes.flatMap((outcome, index) => {
      if (outcome.status === 'fulfilled') {
        return outcome.value;
      }
      const reason: unknown = outcome.reason;
      this.sourceErrors.set(this.sources[index].kind, reason instanceof Error ? reason.message : String(reason));
      return [];
    });
  }

  private async open(target: ConnectionTarget, onDisconnect: () => void): Promise<DatabaseAdapter> {
    const adapter = await this.options.openAdapter(target);
    adapter.onDisconnect(onDisconnect);
    try {
      await adapter.connect();
    } catch (error) {
      await adapter.dispose().catch(() => undefined);
      throw new Error(explainConnectionFailure(error instanceof Error ? error.message : String(error)));
    }
    if (this.options.readOnly(target)) {
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

  private computeSignature(): string {
    return JSON.stringify({
      active: this.activeTargetId,
      errors: [...this.sourceErrors],
      targets: this.targets.map((target) => ({ ...target, password: target.password !== undefined })),
    });
  }

  private emit(): void {
    this.lastSignature = this.computeSignature();
    this.listeners.forEach((listener) => listener());
  }
}

function canBecomeActiveAutomatically(target: ConnectionTarget): boolean {
  return target.source === 'docker' && isReachable(target) && target.password !== undefined;
}
