import { describe, expect, it } from 'vitest';
import { classifyQuery } from '../../../../src/application/query/analysis/classification/classifyQuery';
import { scanStatements } from '../../../../src/application/query/analysis/statements/scanStatements';

describe('conditional comments', () => {
  it.each(['mysql', 'mariadb'] as const)('reads their content as SQL on %s', (kind) => {
    expect(classifyQuery('/*!50000 DROP TABLE */ orders', kind).risk).toBe('destructive');
    expect(classifyQuery('/*!50000 DROP TABLE orders */', kind)).toMatchObject({ risk: 'destructive', statementCount: 1 });
    expect(classifyQuery("SELECT 1 /*! INTO OUTFILE '/tmp/x' */ FROM dual", kind).risk).toBe('write');
    expect(classifyQuery('/*M!100100 DELETE FROM orders */', kind).risk).toBe('destructive');
  });

  it('keeps the comment in the statement that is sent', () => {
    const [statement] = scanStatements('/*!50000 DROP TABLE orders */;', 'mysql');
    expect(statement.text).toBe('/*!50000 DROP TABLE orders */');
  });

  it('splits statements inside the comment', () => {
    expect(classifyQuery('SELECT 1 /*!; DROP TABLE orders */', 'mysql')).toMatchObject({ risk: 'destructive', statementCount: 2 });
  });

  it('is only a comment on Postgres', () => {
    expect(classifyQuery('SELECT 1 /*! DROP TABLE orders */', 'postgres')).toMatchObject({ risk: 'read', statementCount: 1 });
  });

  it('keeps ordinary comments ignored on MySQL', () => {
    expect(classifyQuery('SELECT 1 /* DROP TABLE orders */', 'mysql').risk).toBe('read');
  });

  it('assumes the worst when the database is unknown', () => {
    expect(classifyQuery('/*! DROP TABLE orders */').risk).toBe('destructive');
  });
});

describe('functions that act on the server', () => {
  it.each([
    "SELECT set_config('default_transaction_read_only','off',false)",
    "select SET_CONFIG ('a', 'b', false)",
    "SELECT pg_catalog.set_config('a', 'b', false)",
    "SELECT pg_read_file('/etc/passwd')",
    "SELECT /* c */ pg_read_file /* c */ ('/etc/passwd')",
    "SELECT * FROM pg_ls_dir('/')",
    "SELECT lo_export(1, '/tmp/x')",
    'SELECT pg_terminate_backend(1)',
    "EXPLAIN SELECT pg_read_file('/etc/passwd')",
    "WITH a AS (SELECT pg_read_file('/etc/passwd')) SELECT * FROM a",
    "SELECT query_to_xml('select 1', true, true, '')",
    `SELECT "pg_read_file"('/etc/passwd')`,
    `SELECT "pg_catalog"."pg_read_file"('/etc/passwd')`,
    `SELECT U&"pg_read_file"('/etc/passwd')`,
  ])('does not count as a read on Postgres: %s', (sql) => {
    const classification = classifyQuery(sql, 'postgres');
    expect(classification.risk).toBe('write');
    expect(classification.reasons.length).toBeGreaterThan(0);
  });

  it.each(['mysql', 'mariadb'] as const)('does not count as a read on %s', (kind) => {
    expect(classifyQuery("SELECT LOAD_FILE('/etc/passwd')", kind).risk).toBe('write');
    expect(classifyQuery("SELECT `load_file`('/etc/passwd')", kind).risk).toBe('write');
  });

  it.each([
    'SELECT set_config FROM settings',
    'SELECT my_set_config(1)',
    "SELECT 'set_config(1)'",
    'SELECT count(*), lower(name), now() FROM users',
    'SELECT "name" FROM "users" WHERE "id" IN (1, 2)',
  ])('keeps a normal read: %s', (sql) => {
    expect(classifyQuery(sql, 'postgres').risk).toBe('read');
  });

  it('checks the functions of every driver when the database is unknown', () => {
    expect(classifyQuery("SELECT load_file('/x')").risk).toBe('write');
    expect(classifyQuery("SELECT pg_read_file('/x')").risk).toBe('write');
  });

  it('checks the functions of the driver in use', () => {
    expect(classifyQuery('SELECT load_file(1)', 'postgres').risk).toBe('read');
  });
});
