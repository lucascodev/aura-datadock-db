import type { DataViewMode } from '../data/model/DataViewMode';
import { DATA_VIEW_MODES } from '../constants/dataViewModes';
import { createElement } from '../../shared/dom/createElement';

export function createModeButtons(onSelect: (mode: DataViewMode) => void): HTMLElement[] {
  return DATA_VIEW_MODES.map((mode) =>
    createElement('button', {
      className: 'mode-button',
      text: mode.label(),
      title: mode.title(),
      onClick: () => onSelect(mode.id),
    }),
  );
}
