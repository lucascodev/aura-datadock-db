import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { DataViewMode } from '../data/model/DataViewMode';

export const DATA_VIEW_MODES: readonly { readonly id: DataViewMode; readonly label: () => string; readonly title: () => string }[] = [
  { id: 'grid', label: () => l10n.t('Grid'), title: () => l10n.t('Rows in a grid') },
  { id: 'text', label: () => l10n.t('Text'), title: () => l10n.t('Rows as aligned text') },
  { id: 'record', label: () => l10n.t('Record'), title: () => l10n.t('One row at a time') },
];
