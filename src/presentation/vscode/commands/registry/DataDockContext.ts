import type * as vscode from 'vscode';
import type { AiProvider } from '../../../../application/ai/AiProvider';
import type { SavedConnections } from '../../../../application/connections/saved/SavedConnections';
import type { ConnectionManager } from '../../../../application/connections/lifecycle/ConnectionManager';
import type { QueryDocumentBindings } from '../../../../application/query/documents/QueryDocumentBindings';
import type { QueryHistory } from '../../../../application/query/history/QueryHistory';
import type { QueryRunTracker } from '../../../../application/query/execution/QueryRunTracker';
import type { SchemaCache } from '../../../../application/schema/loading/SchemaCache';
import type { ConnectionFormPanel } from '../../panels/connection/ConnectionFormPanel';
import type { DiagramPanels } from '../../panels/diagram/DiagramPanels';
import type { ResultsPanel } from '../../panels/results/ResultsPanel';
import type { TableEditors } from '../../panels/table/TableEditors';
import type { SchemaTreeProvider } from '../../tree/providers/SchemaTreeProvider';

export interface DataDockContext {
  readonly connections: ConnectionManager;
  readonly savedConnections: SavedConnections;
  readonly connectionForm: ConnectionFormPanel;
  readonly secrets: vscode.SecretStorage;
  readonly output: vscode.LogOutputChannel;
  readonly schemas: SchemaCache;
  readonly bindings: QueryDocumentBindings;
  readonly history: QueryHistory;
  readonly runs: QueryRunTracker;
  readonly results: ResultsPanel;
  readonly diagrams: DiagramPanels;
  readonly tableEditors: TableEditors;
  readonly schemaTree: SchemaTreeProvider;
  refresh(): Promise<void>;
  config(): vscode.WorkspaceConfiguration;
  createAiProvider(): Promise<AiProvider>;
}
