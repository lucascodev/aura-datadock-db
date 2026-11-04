import type { DriverId } from '../../../domain/driver/model/DriverId';
import type { ParameterizedStatement } from '../../../domain/database/model/ParameterizedStatement';
import type { TableDefinition } from '../../../domain/schema/model/TableDefinition';
import { quoteTable } from '../../../drivers/catalog/quoteTable';
import { toStatement } from '../../sql/building/toStatement';
import type { TablePageRequest } from '../model/tableFilters';
import { l10n } from '../../../domain/i18n/translation/l10n';
import { buildWhere } from './buildWhere';
import { buildOrderBy } from './buildOrderBy';

interface TablePageQuery {
  readonly page: ParameterizedStatement;
  readonly count: ParameterizedStatement;
}

export function buildTablePageQuery(table: TableDefinition, kind: DriverId, request: TablePageRequest): TablePageQuery {
  assertRowWindow(request.offset, request.limit);
  const from = quoteTable(kind, table);
  const where = buildWhere(table, kind, request);

  return {
    page: toStatement(kind, [`SELECT * FROM ${from}`, ...where, buildOrderBy(table, kind, request), ` LIMIT ${request.limit} OFFSET ${request.offset}`]),
    count: toStatement(kind, [`SELECT COUNT(*) FROM ${from}`, ...where]),
  };
}

function assertRowWindow(offset: number, limit: number): void {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error(l10n.t('Invalid page of rows.'));
  }
}
