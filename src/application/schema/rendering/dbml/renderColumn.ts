import type { TableColumn } from '../../../../domain/schema/model/TableColumn';
import { dbmlName } from './dbmlName';

const SIMPLE_TYPE = /^[A-Za-z_]\w*(\(\d+(,\s*\d+)?\))?$/;

export function renderColumn(column: TableColumn, isCompositeKey: boolean): string {
  const settings = [
    column.isPrimaryKey && !isCompositeKey ? 'pk' : undefined,
    column.nullable ? undefined : 'not null',
    column.generationClause ? 'increment' : undefined,
    column.defaultValue !== undefined ? `default: ${renderDefault(column.defaultValue)}` : undefined,
  ].filter((setting) => setting !== undefined);
  const suffix = settings.length > 0 ? ` [${settings.join(', ')}]` : '';
  return `${dbmlName(column.name)} ${renderType(column.dataType)}${suffix}`;
}

function renderDefault(value: string): string {
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return value;
  }
  if (/^'.*'(::[\w. ]+)?$/s.test(value)) {
    return `'${value.replace(/^'|'(::[\w. ]+)?$/g, '').replace(/''/g, "\\'")}'`;
  }
  return `\`${value.replace(/`/g, '')}\``;
}

function renderType(dataType: string): string {
  return SIMPLE_TYPE.test(dataType) ? dataType : `"${dataType.replace(/"/g, '\\"')}"`;
}
