import { readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listFilesIn, listSourceFiles, listSourceFolders, toSourcePath } from '../fixtures/sourceTree';

const TEST_ROOT = join(__dirname, '..');
const NAMED_IMPORT = /(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"](\.[^'"]+)['"]/g;
const INLINE_TYPE_IMPORT = /import\(\s*['"](\.[^'"]+)['"]\s*\)\.(\w+)/g;
const EXPORTED_TYPE = /^export (?:interface|type) (\w+)/gm;
const EXPORTED_LOGIC = /^export (?:async )?function\*? |^export (?:abstract )?class /m;
const ERROR_CLASS = /^(?:export )?class (\w+Error)\b/gm;
const ANY_CLASS = /^(?:export )?(?:abstract )?class /gm;
const ANY_FUNCTION = /^(?:export )?(?:async )?function\*? /m;

interface SourceFile {
  readonly path: string;
  readonly text: string;
}

function read(path: string): SourceFile {
  return { path: resolve(path), text: readFileSync(path, 'utf8').replace(/\r\n/g, '\n') };
}

const sources = listSourceFiles().map(read);
const testFiles = listSourceFolders(TEST_ROOT).flatMap((folder) => listFilesIn(folder)).filter((file) => file.endsWith('.ts')).map(read);

function collectImportedNames(files: readonly SourceFile[]): Set<string> {
  const imported = new Set<string>();
  for (const file of files) {
    for (const [, names, specifier] of file.text.matchAll(NAMED_IMPORT)) {
      const target = resolve(dirname(file.path), `${specifier}.ts`);
      for (const entry of names.split(',')) {
        const name = entry.replace(/^\s*type\s+/, '').split(/\s+as\s+/)[0].trim();
        if (name) {
          imported.add(`${target}#${name}`);
        }
      }
    }
    for (const [, specifier, name] of file.text.matchAll(INLINE_TYPE_IMPORT)) {
      imported.add(`${resolve(dirname(file.path), `${specifier}.ts`)}#${name}`);
    }
  }
  return imported;
}

const importedNames = collectImportedNames([...sources, ...testFiles]);

function exportedTypesOf(file: SourceFile): string[] {
  return [...file.text.matchAll(EXPORTED_TYPE)].map((match) => match[1]);
}

describe('contract placement', () => {
  it('keeps exported contracts out of files with logic', () => {
    const mixed = sources
      .filter((file) => EXPORTED_LOGIC.test(file.text) && exportedTypesOf(file).length > 0)
      .map((file) => `${toSourcePath(file.path)}: ${exportedTypesOf(file).join(', ')}`);
    expect(mixed).toEqual([]);
  });

  it('exports a type only when another file uses it', () => {
    const unused = sources.flatMap((file) =>
      exportedTypesOf(file)
        .filter((name) => !importedNames.has(`${file.path}#${name}`))
        .map((name) => `${toSourcePath(file.path)}: ${name}`),
    );
    expect(unused).toEqual([]);
  });

  it('keeps each error class alone, in a file with its name', () => {
    const misplaced = sources.flatMap((file) =>
      [...file.text.matchAll(ERROR_CLASS)]
        .map((match) => match[1])
        .filter((name) => basename(file.path, '.ts') !== name || (file.text.match(ANY_CLASS) ?? []).length > 1 || ANY_FUNCTION.test(file.text))
        .map((name) => `${toSourcePath(file.path)}: ${name}`),
    );
    expect(misplaced).toEqual([]);
  });
});
