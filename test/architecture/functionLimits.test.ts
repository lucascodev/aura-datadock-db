import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listSourceFiles, toSourcePath } from '../fixtures/sourceTree';

const MAX_FUNCTIONS_PER_FILE = 5;
const MAX_LINES_PER_FUNCTION = 30;
const MAX_METHODS_PER_CLASS = 20;
const TOP_LEVEL_FUNCTION = /^(?:export )?(?:async )?function\*? (\w+)/;
const CLASS_START = /^(?:export )?(?:abstract )?class /;
const METHOD_START = /^ {2}(?!if\b|for\b|while\b|switch\b|return\b|try\b|else\b|const\b|let\b)[^ /].*\)[^;=]*\{$/;
const OWN_CLASS_INHERITANCE = /^(?:export )?(?:abstract )?class (\w+) extends (?!vscode\.|Error\b)(\w+)/gm;
const ARRAY_PARAMETER = /^(?:export )?(?:async )?function\*? \w+\([^)]*?\b(\w+): \w+\[\]/gm;

interface Measured {
  readonly path: string;
  readonly functions: readonly { readonly name: string; readonly lines: number }[];
  readonly methods: readonly { readonly name: string; readonly lines: number }[];
  readonly mutatedParameters: readonly string[];
}

function measure(path: string, text: string): Measured {
  const lines = text.split('\n');
  const functions: { name: string; lines: number }[] = [];
  const methods: { name: string; lines: number }[] = [];
  let isInsideClass = false;
  lines.forEach((line, index) => {
    const declared = TOP_LEVEL_FUNCTION.exec(line);
    if (declared) {
      let end = index;
      while (end < lines.length - 1 && !lines[end].startsWith('}')) {
        end += 1;
      }
      functions.push({ name: declared[1], lines: end - index + 1 });
    }
    if (CLASS_START.test(line)) {
      isInsideClass = true;
    } else if (line.startsWith('}')) {
      isInsideClass = false;
    } else if (isInsideClass && METHOD_START.test(line)) {
      let end = index;
      while (end < lines.length - 1 && !lines[end].startsWith('  }')) {
        end += 1;
      }
      methods.push({ name: line.trim().split('(')[0], lines: end - index + 1 });
    }
  });
  const mutatedParameters = [...text.matchAll(ARRAY_PARAMETER)].map((match) => match[1]).filter((name) => text.includes(`${name}.push(`));
  return { path, functions, methods, mutatedParameters };
}

const measured = listSourceFiles()
  .map((file) => measure(toSourcePath(file), readFileSync(file, 'utf8').replace(/\r\n/g, '\n')));

describe('function limits', () => {
  it(`keeps at most ${MAX_FUNCTIONS_PER_FILE} functions in a file`, () => {
    const crowded = measured.filter((file) => file.functions.length > MAX_FUNCTIONS_PER_FILE).map((file) => `${file.path}: ${file.functions.length}`);
    expect(crowded).toEqual([]);
  });

  it(`keeps functions and methods within ${MAX_LINES_PER_FUNCTION} lines`, () => {
    const long = measured.flatMap((file) =>
      [...file.functions, ...file.methods].filter((item) => item.lines > MAX_LINES_PER_FUNCTION).map((item) => `${file.path}: ${item.name} has ${item.lines}`),
    );
    expect(long).toEqual([]);
  });

  it(`keeps at most ${MAX_METHODS_PER_CLASS} methods in a class`, () => {
    const crowded = measured.filter((file) => file.methods.length > MAX_METHODS_PER_CLASS).map((file) => `${file.path}: ${file.methods.length}`);
    expect(crowded).toEqual([]);
  });

  it('prefers composition to inheritance between classes of the project', () => {
    const inherited = listSourceFiles().flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(OWN_CLASS_INHERITANCE)].map((match) => `${toSourcePath(file)}: ${match[1]} extends ${match[2]}`),
    );
    expect(inherited).toEqual([]);
  });

  it('does not change array parameters', () => {
    const mutating = measured.filter((file) => file.mutatedParameters.length > 0).map((file) => `${file.path}: ${file.mutatedParameters.join(', ')}`);
    expect(mutating).toEqual([]);
  });
});
