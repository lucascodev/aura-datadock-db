import { l10n } from '../../../domain/i18n/translation/l10n';

export type FilterOperatorId = 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan' | 'isNull' | 'isNotNull';

interface FilterOperator {
  readonly id: FilterOperatorId;
  readonly label: () => string;
  readonly needsValue: boolean;
}

export const FILTER_OPERATORS: readonly FilterOperator[] = [
  { id: 'equals', label: () => '=', needsValue: true },
  { id: 'notEquals', label: () => '≠', needsValue: true },
  { id: 'contains', label: () => l10n.t('contains'), needsValue: true },
  { id: 'startsWith', label: () => l10n.t('starts with'), needsValue: true },
  { id: 'greaterThan', label: () => '>', needsValue: true },
  { id: 'lessThan', label: () => '<', needsValue: true },
  { id: 'isNull', label: () => l10n.t('is NULL'), needsValue: false },
  { id: 'isNotNull', label: () => l10n.t('is not NULL'), needsValue: false },
];

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
