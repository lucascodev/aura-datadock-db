import type { DiagramModel, DiagramPositions } from '../model/DiagramModel';
import type { DiagramPalette } from '../model/DiagramPalette';
import { renderDiagramMarkup } from './renderDiagramMarkup';
import { measureExportSize } from './measureExportSize';
import { measureDiagram } from './measureDiagram';
import { EXPORT_MARGIN } from '../constants/exportMargin';

export function renderDiagramSvg(model: DiagramModel, positions: DiagramPositions, palette: DiagramPalette): string {
  const bounds = measureDiagram(model, positions);
  const { width, height } = measureExportSize(model, positions);
  const viewBox = `${bounds.left - EXPORT_MARGIN} ${bounds.top - EXPORT_MARGIN} ${width} ${height}`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">`,
    `<rect x="${bounds.left - EXPORT_MARGIN}" y="${bounds.top - EXPORT_MARGIN}" width="${width}" height="${height}" fill="${palette.background}"/>`,
    renderDiagramMarkup(model, positions, palette),
    '</svg>',
  ].join('');
}
