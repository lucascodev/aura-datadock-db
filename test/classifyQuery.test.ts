import { describe, expect, it } from 'vitest';
import { classifyQuery } from '../src/core/classifyQuery';

describe('classifyQuery', () => {
  it.each([
    'SELECT * FROM orders',
    'with paid as (select * from orders) select count(*) from paid',
    'SHOW TABLES',
    'EXPLAIN SELECT 1',
    'SELECT "update", `delete` FROM audit',
    "SELECT 'drop table users' AS text",
    'SELECT 1 -- delete everything',
    'SELECT $body$ insert into x $body$',
  ])('treats %s as read', (sql) => {
    expect(classifyQuery(sql).risk).toBe('read');
  });

  it.each([
    "INSERT INTO customers (name) VALUES ('Ana')",
    'UPDATE orders SET status = $1 WHERE id = 1',
    'DELETE FROM orders WHERE id = 1',
    'WITH removed AS (DELETE FROM orders WHERE id = 1 RETURNING *) SELECT * FROM removed',
    'SELECT * INTO backup FROM orders',
    'CREATE INDEX idx_orders_status ON orders (status)',
    'SET search_path TO app',
  ])('treats %s as write', (sql) => {
    expect(classifyQuery(sql).risk).toBe('write');
  });

  it.each(['DROP TABLE orders', 'TRUNCATE orders', 'ALTER TABLE orders ADD COLUMN note text', 'DELETE FROM orders', 'UPDATE orders SET total = 0'])(
    'treats %s as destructive',
    (sql) => {
      expect(classifyQuery(sql).risk).toBe('destructive');
    },
  );

  it('uses the highest risk across statements', () => {
    const result = classifyQuery('SELECT 1; DROP TABLE orders;');
    expect(result.risk).toBe('destructive');
    expect(result.statementCount).toBe(2);
    expect(result.reasons).toHaveLength(1);
  });

  it('ignores semicolons inside strings and comments', () => {
    expect(classifyQuery("SELECT ';' /* ; */ FROM orders").statementCount).toBe(1);
  });
});
