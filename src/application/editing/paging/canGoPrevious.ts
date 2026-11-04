export function canGoPrevious(isCustomResult: boolean, isBusy: boolean, offset: number): boolean {
  return !isCustomResult && !isBusy && offset > 0;
}
