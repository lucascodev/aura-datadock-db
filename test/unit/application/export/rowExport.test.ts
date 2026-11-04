import { describe, expect, it } from 'vitest';
import { createCsvEncoder } from '../../../../src/application/export/encoders/createCsvEncoder';
import { createJsonEncoder, createNdjsonEncoder } from '../../../../src/application/export/encoders/createJsonEncoder';
import { createMarkdownEncoder } from '../../../../src/application/export/encoders/createMarkdownEncoder';
import { createSqlInsertEncoder } from '../../../../src/application/export/encoders/createSqlInsertEncoder';
import { encodeRows, writeRowBatches } from '../../../../src/application/export/encoders/encodeRows';
import { ROW_EXPORT_FORMATS } from '../../../../src/application/export/formats/rowExportFormats';
import { uniqueColumnNames } from '../../../../src/application/format/uniqueColumnNames';
import type { RowBatch } from '../../../../src/domain/database/model/RowBatch';

describe('createCsvEncoder', () => {
  it('quotes separators, quotes and line breaks and leaves NULL empty', () => {
    const csv = encodeRows(createCsvEncoder(), {
      columns: ['a', 'b,c'],
      rows: [['x"y', null], ['line\nbreak', 1]],
    });
    expect(csv).toBe('a,"b,c"\r\n"x""y",\r\n"line\nbreak",1\r\n');
  });

  it('writes binary as hex and objects as JSON', () => {
    const csv = encodeRows(createCsvEncoder(), { columns: ['bin', 'obj'], rows: [[Buffer.from([0xab]), { a: 1 }]] });
    expect(csv).toContain('\\xab,"{""a"":1}"');
  });
});

describe('createJsonEncoder', () => {
  it('produces valid JSON, keeping duplicated columns apart', () => {
    const json = encodeRows(createJsonEncoder(), { columns: ['id', 'id'], rows: [[1, 2], [3, null]] });
    expect(JSON.parse(json)).toEqual([{ id: 1, id_2: 2 }, { id: 3, id_2: null }]);
  });

  it('produces an empty array without rows', () => {
    expect(JSON.parse(encodeRows(createJsonEncoder(), { columns: ['id'], rows: [] }))).toEqual([]);
  });
});

describe('createNdjsonEncoder', () => {
  it('writes one object per line', () => {
    const lines = encodeRows(createNdjsonEncoder(), { columns: ['id'], rows: [[1], [2]] }).trim().split('\n');
    expect(lines.map((line) => JSON.parse(line))).toEqual([{ id: 1 }, { id: 2 }]);
  });
});

describe('createMarkdownEncoder', () => {
  it('renders a table and escapes pipes and line breaks', () => {
    const markdown = encodeRows(createMarkdownEncoder(), { columns: ['a'], rows: [['x|y\nz'], [null]] });
    expect(markdown).toBe('| a |\n| --- |\n| x\\|y<br>z |\n| NULL |\n');
  });
});

describe('createSqlInsertEncoder', () => {
  const table = { namespace: 'public', name: 'orders' };

  it('renders Postgres literals', () => {
    const sql = encodeRows(createSqlInsertEncoder({ kind: 'postgres', table }), {
      columns: ['id', 'note', 'ok', 'bin', 'meta', 'missing'],
      rows: [[1, "it's \\ here", true, Buffer.from([1]), { a: 1 }, null]],
    });
    expect(sql).toBe(
      `INSERT INTO "public"."orders" ("id", "note", "ok", "bin", "meta", "missing") VALUES (1, 'it''s \\ here', TRUE, '\\x01', '{"a":1}', NULL);\n`,
    );
  });

  it('escapes backslashes and uses hex literals in MySQL', () => {
    const sql = encodeRows(createSqlInsertEncoder({ kind: 'mysql', table }), { columns: ['note', 'bin'], rows: [['a\\b', Buffer.from([1])]] });
    expect(sql).toBe("INSERT INTO `public`.`orders` (`note`, `bin`) VALUES ('a\\\\b', x'01');\n");
  });

  it('uses a placeholder table for query results', () => {
    const sql = encodeRows(createSqlInsertEncoder({ kind: 'postgres' }), { columns: ['a'], rows: [[1]] });
    expect(sql).toContain('INSERT INTO "query_result"');
  });
});

describe('writeRowBatches', () => {
  async function* batches(...items: RowBatch[]): AsyncIterable<RowBatch> {
    yield* items;
  }

  it('writes the header once and closes the output', async () => {
    const chunks: string[] = [];
    const result = await writeRowBatches(
      batches({ columns: ['id'], rows: [[1]] }, { columns: ['id'], rows: [[2]] }),
      createJsonEncoder(),
      async (chunk) => void chunks.push(chunk),
    );
    expect(result).toEqual({ rowCount: 2, isComplete: true });
    expect(JSON.parse(chunks.join(''))).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('writes a valid empty file for an empty table', async () => {
    const chunks: string[] = [];
    await writeRowBatches(batches({ columns: ['id'], rows: [] }), createCsvEncoder(), async (chunk) => void chunks.push(chunk));
    expect(chunks.join('')).toBe('id\r\n');
  });

  it('stops when aborted and reports the partial result', async () => {
    const controller = new AbortController();
    const result = await writeRowBatches(
      batches({ columns: ['id'], rows: [[1]] }, { columns: ['id'], rows: [[2]] }),
      createCsvEncoder(),
      async () => undefined,
      { signal: controller.signal, onProgress: () => controller.abort() },
    );
    expect(result).toEqual({ rowCount: 1, isComplete: false });
  });

  it('closes the source when aborted', async () => {
    const controller = new AbortController();
    let isClosed = false;
    async function* source(): AsyncIterable<RowBatch> {
      try {
        yield { columns: ['id'], rows: [[1]] };
        yield { columns: ['id'], rows: [[2]] };
      } finally {
        isClosed = true;
      }
    }
    await writeRowBatches(source(), createCsvEncoder(), async () => undefined, { signal: controller.signal, onProgress: () => controller.abort() });
    expect(isClosed).toBe(true);
  });
});

describe('ROW_EXPORT_FORMATS', () => {
  it('has unique ids', () => {
    const ids = ROW_EXPORT_FORMATS.map((format) => format.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('uniqueColumnNames', () => {
  it('suffixes duplicates without colliding with existing names', () => {
    expect(uniqueColumnNames(['id', 'id', 'id_2', 'id'])).toEqual(['id', 'id_3', 'id_2', 'id_4']);
  });
});
