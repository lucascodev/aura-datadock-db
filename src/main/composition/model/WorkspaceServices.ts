import type { QueryDocumentBindings } from '../../../application/query/documents/QueryDocumentBindings';
import type { QueryHistory } from '../../../application/query/history/QueryHistory';
import type { QueryRunTracker } from '../../../application/query/execution/QueryRunTracker';
import type { SchemaCache } from '../../../application/schema/loading/SchemaCache';
import type { ResultsPanel } from '../../../presentation/vscode/panels/results/ResultsPanel';

export interface WorkspaceServices {
  readonly schemas: SchemaCache;
  readonly bindings: QueryDocumentBindings;
  readonly history: QueryHistory;
  readonly runs: QueryRunTracker;
  readonly results: ResultsPanel;
  listNamespaces(targetId: string): Promise<string[]>;
}
