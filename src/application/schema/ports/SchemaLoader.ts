import type { NamespaceSchema } from '../../../domain/schema/NamespaceSchema';

export type SchemaLoader = (targetId: string, namespace: string) => Promise<NamespaceSchema>;
