import type { DataGrid } from '../data/grid/DataGrid';
import { BottomBar } from '../data/toolbar/BottomBar';
import type { TableScreen } from '../screen/TableScreen';

export function createBottomBar(screen: TableScreen, grid: DataGrid): BottomBar {
  return new BottomBar(screen.state, { ...pagingCallbacks(screen), ...rowCallbacks(screen, grid), ...valueCallbacks(screen) });
}

function pagingCallbacks(screen: TableScreen) {
  return {
    onRefresh: () => screen.loadPage(),
    onSave: () => screen.save(),
    onCancelChanges: () => {
      screen.state.editing.discardChanges();
      screen.showStatus('', 'success');
      screen.publishChanges();
    },
    onPreview: () => screen.host.postMessage({ type: 'preview', changes: screen.state.changes }),
    onGoTo: (offset: number) => screen.loadPage(offset),
    onExport: () => screen.host.postMessage({ type: 'exportData', selection: screen.state.view.selection() }),
    onLimitChange: (limit: number) => {
      screen.state.view.setLimit(limit);
      screen.loadPage(0);
    },
  };
}

function rowCallbacks(screen: TableScreen, grid: DataGrid) {
  return {
    onEditCell: () => {
      if (screen.state.activeCell) {
        grid.startEdit(screen.state.activeCell);
      }
    },
    onAddRow: () => {
      screen.state.editing.addRow();
      screen.publishChanges();
      grid.element.scrollTop = 0;
    },
    onDuplicateRow: () => {
      screen.state.editing.duplicateTargetRows();
      screen.publishChanges();
      grid.element.scrollTop = 0;
    },
    onDeleteRow: () => {
      screen.state.editing.deleteTargetRows();
      screen.publishChanges();
    },
  };
}

function valueCallbacks(screen: TableScreen) {
  return {
    onSetNull: () => {
      screen.state.editing.setActiveNull();
      screen.publishChanges();
    },
    onUseDefault: () => {
      screen.state.editing.useDefaultForActive();
      screen.publishChanges();
    },
  };
}
