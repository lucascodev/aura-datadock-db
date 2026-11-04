export type TableKind = 'table' | 'view';

export interface TableRef {
  readonly namespace: string;
  readonly name: string;
  readonly kind: TableKind;
}
