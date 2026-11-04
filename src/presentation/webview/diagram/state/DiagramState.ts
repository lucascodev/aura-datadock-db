import { buildDiagram } from '../../../../application/diagram/building/buildDiagram';
import { layoutDiagram } from '../../../../application/diagram/layout/placement/layoutDiagram';
import type { DiagramDetail, DiagramModel, DiagramPoint, DiagramPositions } from '../../../../application/diagram/model/DiagramModel';
import type { NamespaceSchema } from '../../../../domain/schema/model/NamespaceSchema';
import type { DiagramHostMessage, SchemaExportFormatView } from '../../../contracts/DiagramMessages';

export class DiagramState {
  private currentSchema?: NamespaceSchema;
  private currentModel?: DiagramModel;
  private currentDetail: DiagramDetail = 'full';
  private positions: Record<string, DiagramPoint> = {};
  private currentExportFormats: readonly SchemaExportFormatView[] = [];

  get schema(): NamespaceSchema | undefined {
    return this.currentSchema;
  }

  get model(): DiagramModel | undefined {
    return this.currentModel;
  }

  get detail(): DiagramDetail {
    return this.currentDetail;
  }

  get savedPositions(): Record<string, DiagramPoint> {
    return this.positions;
  }

  get exportFormats(): readonly SchemaExportFormatView[] {
    return this.currentExportFormats;
  }

  receiveSchema(message: Extract<DiagramHostMessage, { type: 'schema' }>): boolean {
    const isSameNamespace = this.currentSchema?.namespace === message.schema.namespace;
    this.currentSchema = message.schema;
    this.positions = { ...message.positions };
    this.currentExportFormats = message.exportFormats;
    return isSameNamespace;
  }

  selectDetail(detail: DiagramDetail): void {
    this.currentDetail = detail;
  }

  moveTable(tableName: string, position: DiagramPoint): void {
    this.positions = { ...this.positions, [tableName]: position };
  }

  clearPositions(): void {
    this.positions = {};
  }

  rebuildModel(): DiagramModel | undefined {
    if (!this.currentSchema) {
      return undefined;
    }
    this.currentModel = buildDiagram(this.currentSchema, this.currentDetail);
    return this.currentModel;
  }

  positionsFor(model: DiagramModel): DiagramPositions {
    const names = new Set(model.tables.map((table) => table.name));
    const overrides = Object.entries(this.positions).filter(([name]) => names.has(name));
    return { ...layoutDiagram(model), ...Object.fromEntries(overrides) };
  }
}
