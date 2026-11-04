import { getFormatter } from './getFormatter';
import { MAX_FRACTION_DIGITS } from '../constants/maxFractionDigits';

export function fullFormat(): Intl.NumberFormat {
  return getFormatter({ maximumFractionDigits: MAX_FRACTION_DIGITS });
}
