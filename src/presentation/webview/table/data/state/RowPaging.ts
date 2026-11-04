import { canGoNext } from '../../../../../application/editing/paging/canGoNext';
import { canGoPrevious } from '../../../../../application/editing/paging/canGoPrevious';
import { lastOffset } from '../../../../../application/editing/paging/lastOffset';
import type { DataTabState } from './DataTabState';

export class RowPaging {
  constructor(private readonly state: DataTabState) {}

  canGoNext(): boolean {
    const { isCustomResult, isBusy, total, offset, rows, limit } = this.state;
    return canGoNext(isCustomResult, isBusy, total, offset, rows.length, limit);
  }

  canGoPrevious(): boolean {
    return canGoPrevious(this.state.isCustomResult, this.state.isBusy, this.state.offset);
  }

  canGoLast(): boolean {
    return this.state.total !== undefined && this.canGoNext();
  }

  lastOffset(): number {
    return lastOffset(this.state.total, this.state.limit);
  }
}
