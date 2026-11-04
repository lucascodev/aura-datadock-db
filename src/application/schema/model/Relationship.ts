export type RelationshipCardinality = 'one-to-one' | 'one-to-many';

export interface Relationship {
  readonly name: string;
  readonly childTable: string;
  readonly childColumns: readonly string[];
  readonly parentTable: string;
  readonly parentColumns: readonly string[];
  readonly cardinality: RelationshipCardinality;
  readonly isParentOptional: boolean;
  readonly onDelete?: string;
  readonly onUpdate?: string;
}
