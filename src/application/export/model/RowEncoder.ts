export interface RowEncoder {
  begin(columns: readonly string[]): string;
  encode(row: readonly unknown[]): string;
  end(): string;
}
