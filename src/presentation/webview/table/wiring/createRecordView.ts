import { RecordView } from '../data/panels/RecordView';
import type { TableScreen } from '../screen/TableScreen';

export function createRecordView(screen: TableScreen): RecordView {
  return new RecordView(screen.state, {
    onCommit: (position, value) => screen.commitCell(position, value),
    onMove: (delta) => {
      screen.state.selection.moveRecord(delta);
      screen.render();
    },
    onSelectField: (position) => {
      screen.state.selection.selectCell(position);
      screen.renderDetails();
    },
  });
}
