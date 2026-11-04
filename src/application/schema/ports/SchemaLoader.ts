import type { NamespaceSchema } from '../../../domain/schema/model/NamespaceSchema';

export type SchemaLoader = (targetId: string, namespace: string) => Promise<NamespaceSchema>;
