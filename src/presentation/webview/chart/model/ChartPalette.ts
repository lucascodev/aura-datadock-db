export interface ChartPalette {
  readonly categorical: readonly string[];
  readonly sequential: readonly string[];
  readonly surface: string;
  readonly text: string;
  readonly mutedText: string;
  readonly grid: string;
  readonly baseline: string;
  readonly fontFamily: string;
}
