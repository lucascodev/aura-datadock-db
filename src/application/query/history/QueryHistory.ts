import type { QueryHistoryEntry } from './QueryHistoryEntry';
import type { KeyValueStore } from '../ports/KeyValueStore';

const STORAGE_KEY = 'auraDataDockDb.queryHistory';

type HistoryListener = () => void;

export class QueryHistory {
  private readonly listeners = new Set<HistoryListener>();

  constructor(
    private readonly store: KeyValueStore,
    private readonly maxEntries: () => number,
  ) {}

  list(): readonly QueryHistoryEntry[] {
    return this.store.get<QueryHistoryEntry[]>(STORAGE_KEY) ?? [];
  }

  async add(entry: QueryHistoryEntry): Promise<void> {
    const limit = this.maxEntries();
    if (limit <= 0) {
      return;
    }
    await this.store.update(STORAGE_KEY, [entry, ...this.list()].slice(0, limit));
    this.emit();
  }

  async clear(): Promise<void> {
    await this.store.update(STORAGE_KEY, []);
    this.emit();
  }

  onDidChange(listener: HistoryListener): { dispose(): void } {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}
