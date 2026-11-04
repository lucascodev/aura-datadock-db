import { ValuePanel } from '../data/panels/ValuePanel';
import type { TableScreen } from '../screen/TableScreen';

export function createValuePanel(screen: TableScreen): ValuePanel {
  return new ValuePanel(screen.state, {
    onCommit: (position, value) => screen.commitCell(position, value),
    onSetNull: () => {
      screen.state.editing.setActiveNull();
      screen.publishChanges();
    },
  });
}
