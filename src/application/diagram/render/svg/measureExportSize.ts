import type { DiagramModel, DiagramPositions } from '../../model/DiagramModel';
import { measureDiagram } from './measureDiagram';
import { EXPORT_MARGIN } from '../../constants/exportMargin';

export function measureExportSize(model: DiagramModel, positions: DiagramPositions): { width: number; height: number } {
  const bounds = measureDiagram(model, positions);
  return { width: bounds.right - bounds.left + EXPORT_MARGIN * 2, height: bounds.bottom - bounds.top + EXPORT_MARGIN * 2 };
}
