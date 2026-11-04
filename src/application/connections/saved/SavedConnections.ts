import type { ConnectionSource } from '../../../domain/connection/ports/ConnectionSource';
import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import type { SavedConnection } from '../../../domain/connection/model/SavedConnection';
import { findDriver } from '../../../drivers/catalog/driverCatalog';
import { toConnectionTarget } from './toConnectionTarget';
import { isSafeCommandValue } from './validateConnectionInput';
import type { SavedConnectionStore } from '../ports/SavedConnectionStore';

const TLS_MODES = new Set(['off', 'required', 'verified']);

export class SavedConnections implements ConnectionSource {
  readonly kind = 'saved';

  constructor(private readonly store: SavedConnectionStore) {}

  list(): SavedConnection[] {
    return this.store.read().filter(isSavedConnection);
  }

  find(id: string): SavedConnection | undefined {
    return this.list().find((connection) => connection.id === id);
  }

  async discover(): Promise<ConnectionTarget[]> {
    return this.list()
      .map(toConnectionTarget)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async save(connection: SavedConnection): Promise<void> {
    const others = this.list().filter((candidate) => candidate.id !== connection.id);
    await this.store.write([...others, connection]);
  }

  async remove(id: string): Promise<void> {
    await this.store.write(this.list().filter((candidate) => candidate.id !== id));
  }
}

function isSavedConnection(value: unknown): value is SavedConnection {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<SavedConnection>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.host === 'string' &&
    isSafeCommandValue(candidate.host) &&
    typeof candidate.port === 'number' &&
    typeof candidate.user === 'string' &&
    findDriver(candidate.kind ?? '') !== undefined &&
    TLS_MODES.has(candidate.tlsMode ?? '') &&
    typeof candidate.isReadOnly === 'boolean'
  );
}
