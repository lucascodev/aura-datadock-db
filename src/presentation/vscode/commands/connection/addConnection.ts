import type { DataDockContext } from '../model/DataDockContext';

export function addConnection(context: DataDockContext): void {
  context.connectionForm.open();
}
