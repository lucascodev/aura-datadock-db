const BASE_TABLE_TYPE = 'BASE TABLE';

export function isBaseTable(tableType: string): boolean {
  return tableType === BASE_TABLE_TYPE;
}
