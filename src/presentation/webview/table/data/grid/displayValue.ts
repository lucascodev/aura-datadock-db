import { NULL_PLACEHOLDER } from '../../../../../application/format/constants/displayText';
import type { CellValue } from '../../../../../domain/database/model/ParameterizedStatement';
import { l10n } from '../../../../../domain/i18n/translation/l10n';

export function displayValue(value: CellValue | undefined): string {
  if (value === undefined) {
    return l10n.t('default');
  }
  return value ?? NULL_PLACEHOLDER;
}
