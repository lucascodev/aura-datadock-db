import { SqlPanel } from '../data/panels/SqlPanel';
import type { TableScreen } from '../screen/TableScreen';

export function createSqlPanel(screen: TableScreen): SqlPanel {
  return new SqlPanel(screen.state, {
    onRun: (sql) => {
      screen.setBusy();
      screen.host.postMessage({ type: 'runSql', sql, limit: screen.state.limit });
    },
    onChart: (sql) => {
      screen.setBusy();
      screen.host.postMessage({ type: 'chartSql', sql });
    },
    onOpenInEditor: (sql) => screen.openSql(sql),
    onCopy: (text) => screen.copy(text),
    onBackToTable: () => screen.loadPage(),
  });
}
