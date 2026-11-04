import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listSourceFiles, toSourcePath } from '../fixtures/sourceTree';

const CONSTANTS_FOLDER = /(^|\/)constants\//;
const DRIVER_FOLDER = /^drivers\//;
const TRANSLATION_MODULE = 'domain/i18n/translation/l10n.ts';
const EXPORTED_CONSTANT = /^export const (\w+)/gm;
const PRIVATE_CONSTANT = /^const ([A-Z][A-Z_0-9]+)\b[^=]*= *(.+)$/gm;
const ANY_LOGIC = /^(?:export )?(?:async )?function\*? |^(?:export )?(?:abstract )?class /m;
const EXPORTED_TYPE = /^export (?:interface|type) /m;

const sources = listSourceFiles().map((file) => ({ path: toSourcePath(file), text: readFileSync(file, 'utf8').replace(/\r\n/g, '\n') }));

function isExempt(path: string): boolean {
  return DRIVER_FOLDER.test(path) || path === TRANSLATION_MODULE;
}

describe('constant placement', () => {
  it('exports constants only from constants folders', () => {
    const outside = sources
      .filter((file) => !CONSTANTS_FOLDER.test(file.path) && !isExempt(file.path))
      .flatMap((file) => [...file.text.matchAll(EXPORTED_CONSTANT)].map((match) => `${file.path}: ${match[1]}`));
    expect(outside).toEqual([]);
  });

  it('keeps only data in constants folders', () => {
    const withOtherKinds = sources
      .filter((file) => CONSTANTS_FOLDER.test(file.path) && (ANY_LOGIC.test(file.text) || EXPORTED_TYPE.test(file.text)))
      .map((file) => file.path);
    expect(withOtherKinds).toEqual([]);
  });

  it('does not repeat the same constant in two files', () => {
    const seen = new Map<string, string>();
    const repeated: string[] = [];
    for (const file of sources) {
      for (const [, name, value] of file.text.matchAll(PRIVATE_CONSTANT)) {
        const key = `${name}=${value}`;
        const first = seen.get(key);
        if (first && first !== file.path) {
          repeated.push(`${name}: ${first}, ${file.path}`);
        }
        seen.set(key, first ?? file.path);
      }
    }
    expect(repeated).toEqual([]);
  });
});
