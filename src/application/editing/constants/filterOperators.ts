import { l10n } from '../../../domain/i18n/translation/l10n';
import type { FilterOperatorId } from '../model/tableFilters';

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
