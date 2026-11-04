import type { NamespaceSchema } from '../../../domain/schema/NamespaceSchema';
import type { SchemaLoader } from '../ports/SchemaLoader';

interface CacheEntry {
  readonly schema: Promise<NamespaceSchema>;
  readonly loadedAt: number;
}

const DEFAULT_TIME_TO_LIVE_MS = 120_000;

export class SchemaCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(
    private readonly load: SchemaLoader,
    private readonly timeToLiveMs = DEFAULT_TIME_TO_LIVE_MS,
    private readonly now: () => number = Date.now,
  ) {}

  get(targetId: string, namespace: string): Promise<NamespaceSchema> {
    const key = cacheKey(targetId, namespace);
    const existing = this.entries.get(key);
    if (existing && this.now() - existing.loadedAt < this.timeToLiveMs) {
      return existing.schema;
    }

    const schema = this.load(targetId, namespace);
    this.entries.set(key, { schema, loadedAt: this.now() });
    schema.catch(() => this.entries.delete(key));
    return schema;
  }

  invalidate(targetId?: string): void {
    if (targetId === undefined) {
      this.entries.clear();
      return;
    }
    const prefix = cacheKey(targetId, '');
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    }
  }
}

function cacheKey(targetId: string, namespace: string): string {
  return `${targetId}\u0000${namespace}`;
}
