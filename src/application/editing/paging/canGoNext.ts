export function canGoNext(isCustomResult: boolean, isBusy: boolean, total: number | undefined, offset: number, rowCount: number, limit: number): boolean {
  if (isCustomResult || isBusy) {
    return false;
  }
  return total === undefined ? rowCount === limit : offset + rowCount < total;
}
