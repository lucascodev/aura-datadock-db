import type { ChartKind } from './ChartKind';
import { l10n } from '../../../domain/i18n/translation/l10n';
import type { ChartKindDefinition } from './ChartKindDefinition';

export const CHART_KINDS: readonly ChartKindDefinition[] = [
  { id: 'line', label: () => l10n.t('Line'), x: 'any', y: 'many', group: 'optional', groupLabel: () => l10n.t('Series') },
  { id: 'area', label: () => l10n.t('Area'), x: 'any', y: 'many', group: 'optional', groupLabel: () => l10n.t('Series') },
  { id: 'bar', label: () => l10n.t('Bar'), x: 'any', y: 'many', group: 'optional', groupLabel: () => l10n.t('Series') },
  { id: 'pie', label: () => l10n.t('Pie'), x: 'any', y: 'one', group: 'none', groupLabel: () => '' },
  { id: 'scatter', label: () => l10n.t('Scatter'), x: 'number', y: 'one', group: 'optional', groupLabel: () => l10n.t('Series') },
  { id: 'histogram', label: () => l10n.t('Histogram'), x: 'none', y: 'one', group: 'none', groupLabel: () => '' },
  { id: 'boxplot', label: () => l10n.t('Box plot'), x: 'none', y: 'one', group: 'optional', groupLabel: () => l10n.t('Group by') },
  { id: 'heatmap', label: () => l10n.t('Heatmap'), x: 'any', y: 'one', group: 'required', groupLabel: () => l10n.t('Y axis') },
  { id: 'stat', label: () => l10n.t('Number'), x: 'none', y: 'none', group: 'none', groupLabel: () => '' },
];

export function getChartKind(id: ChartKind): ChartKindDefinition {
  return CHART_KINDS.find((kind) => kind.id === id) as ChartKindDefinition;
}
