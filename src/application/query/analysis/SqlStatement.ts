export interface SqlStatement {
  readonly text: string;
  readonly sanitized: string;
  readonly start: number;
  readonly end: number;
  readonly terminatorEnd: number;
}
