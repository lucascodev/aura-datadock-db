import { FilterBar } from '../data/toolbar/FilterBar';
import type { TableScreen } from '../screen/TableScreen';

export function createFilterBar(screen: TableScreen): FilterBar {
  return new FilterBar(screen.state, {
    onApply: () => screen.loadPage(0),
    onToggleSql: () => {
      screen.state.isSqlPanelOpen = !screen.state.isSqlPanelOpen;
      screen.render();
    },
    onToggleValue: () => {
      screen.state.isValuePanelOpen = !screen.state.isValuePanelOpen;
      screen.render();
    },
  });
}
