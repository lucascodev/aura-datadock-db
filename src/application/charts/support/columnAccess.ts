import type { ChartCell, ChartInput } from '../model/ChartInput';
import { l10n } from '../../../domain/i18n/translation/l10n';

export function nullLabel(): string {
  return l10n.t('(null)');
}

export function columnIndex(input: ChartInput, name: string | undefined): number {
  return name === undefined ? -1 : input.columns.indexOf(name);
}

export function labelOf(cell: ChartCell): string {
  return cell ?? nullLabel();
}
