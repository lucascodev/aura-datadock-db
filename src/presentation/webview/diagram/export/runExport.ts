import { EXPORT_PALETTE } from '../../../../application/diagram/constants/exportPalette';
import type { DiagramModel } from '../../../../application/diagram/model/DiagramModel';
import { measureExportSize } from '../../../../application/diagram/render/svg/measureExportSize';
import { renderDiagramSvg } from '../../../../application/diagram/render/svg/renderDiagramSvg';
import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import type { SchemaExportFormatView } from '../../../contracts/DiagramMessages';
import type { DiagramCanvas } from '../canvas/DiagramCanvas';
import type { DiagramHost } from '../model/DiagramHost';
import { rasterizeSvg } from './rasterizeSvg';

const SCHEMA_CHOICE_PREFIX = 'schema:';

export async function runExport(host: DiagramHost, canvas: DiagramCanvas, schema: NamespaceSchema, model: DiagramModel, choice: string): Promise<void> {
  const { namespace } = schema;
  if (choice.startsWith(SCHEMA_CHOICE_PREFIX)) {
    host.postMessage({ type: 'exportSchema', namespace, format: choice.slice(SCHEMA_CHOICE_PREFIX.length) as SchemaExportFormatView['id'] });
    return;
  }

  const positions = canvas.getPositions();
  const svg = renderDiagramSvg(model, positions, EXPORT_PALETTE);
  if (choice === 'image:svg') {
    host.postMessage({ type: 'saveImage', namespace, format: 'svg', content: svg });
    return;
  }
  if (choice === 'image:png') {
    const { width, height } = measureExportSize(model, positions);
    host.postMessage({ type: 'saveImage', namespace, format: 'png', content: await rasterizeSvg(svg, width, height) });
  }
}
