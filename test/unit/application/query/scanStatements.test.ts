import { describe, expect, it } from 'vitest';
import { classifyQuery } from '../../../../src/application/query/analysis/classifyQuery';
import { statementAtOffset } from '../../../../src/application/query/analysis/statementAtOffset';
import { scanStatements } from '../../../../src/application/query/analysis/scanStatements';
import { splitStatements } from '../../../../src/application/query/analysis/splitStatements';

describe('scanStatements', () => {
  it('keeps the original text and offsets of each statement', () => {
    const sql = "-- header\nSELECT ';' AS a;\n\n  SELECT 2";
    const [first, second] = scanStatements(sql);

    expect(first.text).toBe("SELECT ';' AS a");
    expect(sql.slice(first.start, first.end)).toBe(first.text);
    expect(second.text).toBe('SELECT 2');
    expect(sql.slice(second.start, second.end)).toBe('SELECT 2');
  });

  it('keeps comments that sit between tokens of a statement', () => {
    expect(scanStatements('SELECT /* inline */ 1')[0].text).toBe('SELECT /* inline */ 1');
  });

  it('ignores files made only of comments', () => {
    expect(scanStatements('-- nothing\n/* here */')).toEqual([]);
  });

  describe('postgres dialect', () => {
    it('does not treat # as a comment, so JSON operators cannot hide a statement', () => {
      const sql = `SELECT data #>> '{a}' FROM t; DROP TABLE t`;
      expect(splitStatements(sql, 'postgres')).toHaveLength(2);
      expect(classifyQuery(sql, 'postgres').risk).toBe('destructive');
    });

    it('does not treat a backslash as an escape in standard strings', () => {
      const sql = `SELECT 'C:\\'; DROP TABLE t; --'`;
      expect(splitStatements(sql, 'postgres')).toHaveLength(2);
      expect(classifyQuery(sql, 'postgres').risk).toBe('destructive');
    });

    it('honors backslash escapes in E strings', () => {
      expect(splitStatements(`SELECT E'it\\'s; fine'`, 'postgres')).toHaveLength(1);
    });

    it('understands tagged dollar quotes', () => {
      expect(splitStatements('SELECT $tag1$ a; b $tag1$', 'postgres')).toHaveLength(1);
    });
  });

  describe('mysql dialect', () => {
    it('treats # as a comment', () => {
      expect(scanStatements('# comment; here\nSELECT 1', 'mysql')[0].text).toBe('SELECT 1');
    });

    it('honors backslash escapes in strings', () => {
      expect(splitStatements(`SELECT 'it\\'s; fine'`, 'mysql')).toHaveLength(1);
    });

    it('does not treat dollar signs as quotes', () => {
      expect(splitStatements('SELECT $$; SELECT 2', 'mysql')).toHaveLength(2);
    });
  });
});

describe('statementAtOffset', () => {
  const sql = 'SELECT 1;\n\nSELECT 2;\n';
  const statements = scanStatements(sql);

  it('finds the statement containing the cursor', () => {
    expect(statementAtOffset(statements, 3)?.text).toBe('SELECT 1');
    expect(statementAtOffset(statements, sql.indexOf('2'))?.text).toBe('SELECT 2');
  });

  it('includes the position right after the semicolon', () => {
    expect(statementAtOffset(statements, sql.indexOf(';') + 1)?.text).toBe('SELECT 1');
  });

  it('falls back to the previous statement on a blank line', () => {
    expect(statementAtOffset(statements, sql.indexOf('\n\n') + 1)?.text).toBe('SELECT 1');
  });

  it('uses the next statement when the cursor is before the first one', () => {
    const withHeader = '-- header\nSELECT 3';
    expect(statementAtOffset(scanStatements(withHeader), 2)?.text).toBe('SELECT 3');
  });

  it('returns undefined when there are no statements', () => {
    expect(statementAtOffset([], 0)).toBeUndefined();
  });
});
