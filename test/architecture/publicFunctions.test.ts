import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listSourceFiles, toSourcePath } from '../fixtures/sourceTree';

const EXCEPTIONS = new Set(['main/entry/extension.ts', 'domain/i18n/translation/l10n.ts']);
const EXPORTED_FUNCTION = /^export (?:async )?function\*? (\w+)/gm;

const sources = listSourceFiles().map((file) => ({ path: toSourcePath(file), text: readFileSync(file, 'utf8').replace(/\r\n/g, '\n') }));

describe('public functions', () => {
  it('exports one function per file, with the name of the file', () => {
    const crowded = sources
      .filter((file) => !EXCEPTIONS.has(file.path))
      .map((file) => ({ path: file.path, names: [...file.text.matchAll(EXPORTED_FUNCTION)].map((match) => match[1]) }))
      .filter(({ path, names }) => names.length > 1 || (names.length === 1 && !path.endsWith(`/${names[0]}.ts`)))
      .map(({ path, names }) => `${path}: ${names.join(', ')}`);
    expect(crowded).toEqual([]);
  });
});
