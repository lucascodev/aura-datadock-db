export interface ForeignKey {
  readonly name: string;
  readonly columns: readonly string[];
  readonly referencedNamespace: string;
  readonly referencedTable: string;
  readonly referencedColumns: readonly string[];
  readonly onDelete?: string;
  readonly onUpdate?: string;
}
