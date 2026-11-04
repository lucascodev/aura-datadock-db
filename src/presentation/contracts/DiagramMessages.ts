import type { DiagramPositions } from '../../application/diagram/model/DiagramModel';
import type { SchemaExportFormatId } from '../../application/schema/rendering/SchemaExportFormat';
import type { NamespaceSchema } from '../../domain/schema/model/NamespaceSchema';

export interface SchemaExportFormatView {
  readonly id: SchemaExportFormatId;
  readonly label: string;
}

export type DiagramHostMessage =
  | { readonly type: 'loading'; readonly namespace?: string }
  | { readonly type: 'failed'; readonly message: string }
  | {
      readonly type: 'schema';
      readonly connectionName: string;
      readonly schema: NamespaceSchema;
      readonly namespaces: readonly string[];
      readonly positions: DiagramPositions;
      readonly exportFormats: readonly SchemaExportFormatView[];
    };

export type DiagramImageFormat = 'svg' | 'png';

export type DiagramWebviewMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'selectNamespace'; readonly namespace: string }
  | { readonly type: 'refresh' }
  | { readonly type: 'savePositions'; readonly namespace: string; readonly positions: DiagramPositions }
  | { readonly type: 'openTable'; readonly namespace: string; readonly table: string }
  | { readonly type: 'exportSchema'; readonly namespace: string; readonly format: SchemaExportFormatId }
  | { readonly type: 'saveImage'; readonly namespace: string; readonly format: DiagramImageFormat; readonly content: string };
