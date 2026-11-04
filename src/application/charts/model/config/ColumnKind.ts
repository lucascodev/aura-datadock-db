export type ColumnKind = 'number' | 'temporal' | 'category';

export interface ColumnInfo {
  readonly name: string;
  readonly kind: ColumnKind;
}
