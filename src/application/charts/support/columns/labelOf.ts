import type { ChartCell } from '../../model/config/ChartInput';
import { nullLabel } from './nullLabel';

export function labelOf(cell: ChartCell): string {
  return cell ?? nullLabel();
}
