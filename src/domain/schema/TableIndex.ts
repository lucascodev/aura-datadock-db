export interface TableIndex {
  readonly name: string;
  readonly columns: readonly string[];
  readonly isUnique: boolean;
  readonly isPrimary: boolean;
  readonly definition?: string;
}
