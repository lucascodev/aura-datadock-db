import type { DataDockContext } from '../model/DataDockContext';
import type { SchemaCommandArgument } from '../model/SchemaCommandArgument';
import { resolveLocation } from './resolveLocation';

export async function showDiagram(context: DataDockContext, argument: SchemaCommandArgument): Promise<void> {
  const location = await resolveLocation(context, argument);
  if (location) {
    await context.diagrams.show(location.target, location.namespace);
  }
}
