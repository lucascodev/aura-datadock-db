import { CompletionContext } from '@codemirror/autocomplete';
import type { CompletionResult, CompletionSource } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { createFilterCompletionSource } from '../../../../src/presentation/webview/table/sqlField/completion/createFilterCompletionSource';
import { createQueryCompletionSource } from '../../../../src/presentation/webview/table/sqlField/completion/createQueryCompletionSource';
import { orders, shopSchema } from '../../../fixtures/shopSchema';

async function complete(source: CompletionSource, text: string, explicit = false): Promise<CompletionResult | null> {
  const state = EditorState.create({ doc: text });
  return source(new CompletionContext(state, text.length, explicit));
}

const labels = (result: CompletionResult | null): string[] => (result?.options ?? []).map((option) => option.label);

describe('createQueryCompletionSource', () => {
  const source = createQueryCompletionSource(() => shopSchema);

  it('suggests tables while typing after FROM', async () => {
    const result = await complete(source, 'SELECT * FROM ord');
    expect(labels(result)).toContain('orders');
    expect(result?.from).toBe('SELECT * FROM '.length);
  });

  it('suggests the columns of a table after its name and a dot', async () => {
    const result = await complete(source, 'SELECT orders.');
    expect(labels(result)).toEqual(expect.arrayContaining(orders.columns.map((column) => column.name)));
    expect(result?.from).toBe('SELECT orders.'.length);
  });

  it('stays quiet on an empty word until it is asked', async () => {
    expect(await complete(source, 'SELECT ')).toBeNull();
    expect(labels(await complete(source, 'SELECT ', true)).length).toBeGreaterThan(0);
  });

  it('stays quiet before the schema is known', async () => {
    expect(await complete(createQueryCompletionSource(() => undefined), 'SELECT', true)).toBeNull();
  });

  it('lists columns before tables and tables before keywords', async () => {
    const result = await complete(source, 'SELECT o FROM orders');
    const boosts = (result?.options ?? []).map((option) => option.boost ?? 0);
    expect(Math.max(...boosts)).toBeGreaterThan(Math.min(...boosts));
  });
});

describe('createFilterCompletionSource', () => {
  const source = createFilterCompletionSource({
    wholeQuery: createQueryCompletionSource(() => shopSchema),
    getKind: () => shopSchema.kind,
    getColumns: () => orders.columns,
  });

  it('suggests columns of the table while typing a condition', async () => {
    const [column] = orders.columns;
    expect(labels(await complete(source, column.name.slice(0, 2)))).toContain(column.name);
  });

  it('suggests operators while typing a condition', async () => {
    expect(labels(await complete(source, 'id IS'))).toContain('IS NULL');
  });

  it('stays quiet on an empty word until it is asked', async () => {
    expect(await complete(source, 'id = ')).toBeNull();
    expect(labels(await complete(source, 'id = ', true)).length).toBeGreaterThan(0);
  });

  it('suggests tables once the text is a whole query', async () => {
    expect(labels(await complete(source, 'SELECT * FROM ord'))).toContain('orders');
  });
});
