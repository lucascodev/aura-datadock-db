export interface IncomingReference {
  readonly name: string;
  readonly table: string;
  readonly columns: readonly string[];
  readonly referencedColumns: readonly string[];
}
