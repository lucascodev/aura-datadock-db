import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { NamespaceSchema } from '../../../domain/schema/model/NamespaceSchema';

export interface CompletionRequest {
  readonly sql: string;
  readonly offset: number;
  readonly kind: DriverId;
  readonly schemas: readonly NamespaceSchema[];
  readonly defaultNamespace?: string;
}
