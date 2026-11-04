import { DataGrid } from '../data/grid/DataGrid';
import { openColumnMenu } from '../data/grid/openColumnMenu';
import type { TableScreen } from '../screen/TableScreen';

export function createDataGrid(screen: TableScreen): DataGrid {
  return new DataGrid(screen.state, {
    onActiveCellChange: () => screen.renderDetails(),
    onCommitCell: (position, value) => screen.commitCell(position, value),
    onSelectionChange: () => screen.renderDetails(),
    onSort: (column) => {
      screen.state.view.cycleSort(column);
      screen.loadPage(0);
    },
    onOpenColumnMenu: (column, anchor) => openColumnMenu(screen.state, column, anchor, () => screen.loadPage(0)),
    onDeleteRows: () => {
      screen.state.editing.deleteTargetRows();
      screen.publishChanges();
    },
    onSave: () => screen.save(),
    onCopy: (text) => screen.copy(text),
  });
}
