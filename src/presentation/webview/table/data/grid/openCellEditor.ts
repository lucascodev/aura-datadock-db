import type { CellPosition } from '../../../../../application/editing/grid/model/CellPosition';
import type { CellValue } from '../../../../../domain/database/model/ParameterizedStatement';
import { createElement } from '../../../shared/dom/createElement';
import { displayValue } from './displayValue';

interface CellEditorHooks {
  commit(position: CellPosition, value: string): void;
  findNext(position: CellPosition): CellPosition | undefined;
  moveTo(next: CellPosition): void;
  restoreFocus(): void;
}

type FinishEdit = (shouldCommit: boolean, next?: CellPosition) => void;

export function openCellEditor(cell: HTMLElement, position: CellPosition, value: CellValue | undefined, hooks: CellEditorHooks): void {
  const input = createElement('input', { className: 'cell-input' });
  input.value = value ?? '';
  let isFinished = false;

  const finish: FinishEdit = (shouldCommit, next) => {
    if (isFinished) {
      return;
    }
    isFinished = true;
    if (shouldCommit && input.value !== (value ?? '')) {
      hooks.commit(position, input.value);
    } else {
      cell.textContent = displayValue(value);
    }
    if (next) {
      hooks.moveTo(next);
    } else {
      hooks.restoreFocus();
    }
  };

  attachEditorEvents(input, position, hooks, finish);
  cell.replaceChildren(input);
  input.focus();
  input.select();
}

function attachEditorEvents(input: HTMLInputElement, position: CellPosition, hooks: CellEditorHooks, finish: FinishEdit): void {
  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      finish(true);
    } else if (event.key === 'Escape') {
      finish(false);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      finish(true, hooks.findNext(position));
    }
  });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('mousedown', (event) => event.stopPropagation());
  input.addEventListener('dblclick', (event) => event.stopPropagation());
}
