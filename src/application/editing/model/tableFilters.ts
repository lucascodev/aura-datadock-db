
export type FilterOperatorId = 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan' | 'isNull' | 'isNotNull';

export interface TableFilter {
  readonly column: string;
  readonly operator: FilterOperatorId;
  readonly value: string;
}

export interface TableSort {
  readonly column: string;
  readonly isDescending: boolean;
}

export interface TableRowSelection {
  readonly sort?: TableSort;
  readonly filters: readonly TableFilter[];
  readonly whereExpression?: string;
}

export interface TablePageRequest extends TableRowSelection {
  readonly offset: number;
  readonly limit: number;
}
