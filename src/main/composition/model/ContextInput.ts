import type { AiProvider } from '../../../application/ai/ports/AiProvider';
import type { UsageReporter } from '../../../application/telemetry/ports/UsageReporter';
import type { DatabaseAdapter } from '../../../domain/database/ports/DatabaseAdapter';
import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import type { ConnectionServices } from './ConnectionServices';
import type { HostEnvironment } from './HostEnvironment';
import type { Views } from './Views';
import type { WorkspaceServices } from './WorkspaceServices';

export interface ContextInput {
  readonly host: HostEnvironment;
  readonly connection: ConnectionServices;
  readonly workspace: WorkspaceServices;
  readonly schemaTree: Views['schemaTree'];
  readonly usage: UsageReporter;
  refresh(): Promise<void>;
  openAdapter(target: ConnectionTarget): Promise<DatabaseAdapter>;
  createAiProvider(): Promise<AiProvider>;
}
