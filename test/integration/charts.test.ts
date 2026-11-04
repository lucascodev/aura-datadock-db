import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildChartData } from '../../src/application/charts/builders/buildChartData';
import { describeColumns } from '../../src/application/charts/inference/inferColumnKind';
import { suggestChart } from '../../src/application/charts/inference/suggestChart';
import type { ChartInput } from '../../src/application/charts/model/ChartInput';
import { toConnectionTarget } from '../../src/application/connections/saved/toConnectionTarget';
import type { DatabaseAdapter } from '../../src/domain/database/ports/DatabaseAdapter';
import type { DriverId } from '../../src/domain/driver/model/DriverId';
import { createAdapter } from '../../src/infrastructure/database/factory/createAdapter';
import { toResultSetView } from '../../src/presentation/vscode/panels/results/toResultSetView';

interface Engine {
  readonly kind: DriverId;
  readonly port?: string;
  readonly user: string;
  readonly sql: string;
}

const POSTGRES_SQL = `
  SELECT DATE '2026-11-03' AS day, TIMESTAMP '2026-11-03 10:30:00' AS at_local, TIMESTAMPTZ '2026-11-03 10:30:00+00' AS at_zone,
         12.50::numeric(10,2) AS amount, 9007199254740993::bigint AS big, 7::integer AS small, 'paid' AS status
  UNION ALL
  SELECT DATE '2026-11-04', TIMESTAMP '2026-11-04 10:30:00', TIMESTAMPTZ '2026-11-04 10:30:00+00', 8.25, 5, 8, NULL`;

const MYSQL_SQL = `
  SELECT DATE '2026-11-03' AS day, TIMESTAMP '2026-11-03 10:30:00' AS at_local, TIMESTAMP '2026-11-03 10:30:00' AS at_zone,
         CAST(12.50 AS DECIMAL(10,2)) AS amount, CAST(9007199254740993 AS SIGNED) AS big, 7 AS small, 'paid' AS status
  UNION ALL
  SELECT DATE '2026-11-04', TIMESTAMP '2026-11-04 10:30:00', TIMESTAMP '2026-11-04 10:30:00', 8.25, 5, 8, NULL`;

const engines: readonly Engine[] = [
  { kind: 'postgres', port: process.env.DATADOCK_TEST_POSTGRES_PORT, user: 'datadock', sql: POSTGRES_SQL },
  { kind: 'mysql', port: process.env.DATADOCK_TEST_MYSQL_PORT, user: 'root', sql: MYSQL_SQL },
  { kind: 'mariadb', port: process.env.DATADOCK_TEST_MARIADB_PORT, user: 'root', sql: MYSQL_SQL },
];

describe.each(engines)('charts over real results of $kind', (engine) => {
  describe.skipIf(!engine.port)('against a real database', () => {
    let adapter: DatabaseAdapter;
    let input: ChartInput;

    beforeAll(async () => {
      adapter = createAdapter({
        ...toConnectionTarget({ id: 'charts', name: 'charts', kind: engine.kind, host: '127.0.0.1', port: Number(engine.port), user: engine.user, database: 'shop', tlsMode: 'off', isReadOnly: false }),
        password: 'datadock',
      });
      await adapter.connect();
      const result = await adapter.runQuery(engine.sql, 100);
      const view = toResultSetView({ status: 'success', sql: engine.sql, result });
      if (view.status !== 'rows') {
        throw new Error('The query should return rows');
      }
      input = { columns: view.columns.map((column) => column.name), rows: view.rows, isTruncated: view.isTruncated };
    });

    afterAll(async () => {
      await adapter.dispose();
    });

    it('recognizes dates, numbers and text as each driver returns them', () => {
      expect(Object.fromEntries(describeColumns(input).map((column) => [column.name, column.kind]))).toEqual({
        day: 'temporal',
        at_local: 'temporal',
        at_zone: 'temporal',
        amount: 'number',
        big: 'number',
        small: 'number',
        status: 'category',
      });
    });

    it('suggests a line over time', () => {
      expect(suggestChart(describeColumns(input), input.rows.length)).toMatchObject({ kind: 'line', x: 'day', group: 'status' });
    });

    it('places dates on a time axis and reads decimals as numbers', () => {
      const data = buildChartData(input, { kind: 'line', x: 'at_local', y: ['amount'], showRegression: false });
      expect(data).toMatchObject({ form: 'cartesian', axisType: 'time', series: [{ values: [12.5, 8.25] }] });
      expect(data.form === 'cartesian' ? data.positions : []).toEqual([Date.UTC(2026, 10, 3, 10, 30), Date.UTC(2026, 10, 4, 10, 30)]);
    });

    it('warns about an integer too large to draw exactly', () => {
      const data = buildChartData(input, { kind: 'bar', x: 'status', y: ['big'], showRegression: false });
      expect(data.notices.map((notice) => notice.kind)).toContain('approximate');
    });
  });
});
