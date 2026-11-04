import type { ConnectionManager } from '../../../application/connections/lifecycle/ConnectionManager';
import type { RefreshActions } from '../model/RefreshActions';
import type { Views } from '../model/Views';

export function createRefreshActions(manager: ConnectionManager, views: Views): RefreshActions {
  const refreshTrees = () => {
    views.tree.refresh();
    views.schemaTree.refresh();
  };

  const refresh = async () => {
    await manager.refresh();
    refreshTrees();
  };

  return { refreshTrees, refresh };
}
