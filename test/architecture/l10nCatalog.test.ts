import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listSourceFiles, toSourcePath } from '../fixtures/sourceTree';

const L10N_MODULE = 'domain/i18n/l10n.ts';
const BUNDLE_FILE = 'l10n/bundle.l10n.pt-br.json';
const KEY_CALL = /l10n\.t\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
const ANY_CALL = /l10n\.t\(\s*([^\s])/g;
const PLACEHOLDER = /\{\d+\}/g;
const MANIFEST_KEY = /^%(.+)%$/;
const TOP_LEVEL_STATEMENT = /^(export )?(const|let) /;
const HARD_CODED_SINK = /(show(Error|Warning|Information)Message|showInputBox|withProgress)\(\s*['`"]|\b(text|title|prompt|placeHolder|placeholder):\s*['`"][A-Z][a-z]+ /;
const DOCUMENT_PAIRS = [
  ['README.md', 'README.pt-BR.md'],
  ['CHANGELOG.md', 'CHANGELOG.pt-BR.md'],
  ['CONTRIBUTING.md', 'CONTRIBUTING.pt-BR.md'],
  ['docs/architecture.md', 'docs/architecture.pt-BR.md'],
] as const;

const sources = listSourceFiles()
  .filter((file) => toSourcePath(file) !== L10N_MODULE)
  .map((file) => ({ path: toSourcePath(file), text: readFileSync(file, 'utf8') }));

function readJson(path: string): Record<string, string> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
}

function parseLiteral(literal: string): string {
  const body = literal.slice(1, -1);
  return body.replace(/\\(.)/g, (_, character: string) => (character === 'n' ? '\n' : character));
}

function placeholdersOf(message: string): string[] {
  return [...new Set(message.match(PLACEHOLDER) ?? [])].sort();
}

function findModuleLoadCalls(path: string, text: string): string[] {
  const lines = text.split('\n');
  const found: string[] = [];
  let isInsideStatement = false;
  let isLazyStatement = false;
  lines.forEach((line, index) => {
    if (line.length > 0 && !/^[\s})\]]/.test(line)) {
      isInsideStatement = TOP_LEVEL_STATEMENT.test(line);
      isLazyStatement = line.includes('=>');
    }
    if (isInsideStatement && !isLazyStatement && line.includes('l10n.t(') && !line.includes('=>')) {
      found.push(`${path}:${index + 1}`);
    }
  });
  return found;
}

function collectManifestValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectManifestValues);
  }
  return value && typeof value === 'object' ? Object.values(value).flatMap(collectManifestValues) : [];
}

function headingCount(path: string): number {
  const withoutCode = readFileSync(path, 'utf8').replace(/\r\n/g, '\n').replace(/```[\s\S]*?```/g, '');
  return withoutCode.match(/^#{1,6} /gm)?.length ?? 0;
}

describe('runtime translations', () => {
  const messages = [...new Set(sources.flatMap(({ text }) => [...text.matchAll(KEY_CALL)].map((match) => parseLiteral(match[1]))))];
  const bundle = readJson(BUNDLE_FILE);

  it('translates every message used in the code', () => {
    expect(messages.filter((message) => !(message in bundle))).toEqual([]);
  });

  it('has no translation for a message that no longer exists', () => {
    expect(Object.keys(bundle).filter((message) => !messages.includes(message))).toEqual([]);
  });

  it('keeps the same placeholders in the translation', () => {
    const different = Object.entries(bundle).filter(([message, translation]) => placeholdersOf(message).join() !== placeholdersOf(translation).join());
    expect(different).toEqual([]);
  });

  it('always passes a literal as the message', () => {
    const dynamic = sources.flatMap(({ path, text }) => [...text.matchAll(ANY_CALL)].filter((match) => !`'"`.includes(match[1])).map(() => path));
    expect(dynamic).toEqual([]);
  });

  it('never translates at module load, before the catalog is set', () => {
    const afterImports = sources.filter(({ path, text }) => !(path.endsWith('/main.ts') && text.includes('useL10nCatalog(readL10nCatalog());')));
    expect(afterImports.flatMap(({ path, text }) => findModuleLoadCalls(path, text))).toEqual([]);
  });

  it('leaves no hard-coded text in the main places that show it', () => {
    const presentation = sources.filter(({ path }) => path.startsWith('presentation/'));
    const hardCoded = presentation.flatMap(({ path, text }) => text.split('\n').filter((line) => HARD_CODED_SINK.test(line)).map((line) => `${path}: ${line.trim()}`));
    expect(hardCoded).toEqual([]);
  });
});

describe('manifest translations', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { displayName: string; description: string; contributes: unknown };
  const english = readJson('package.nls.json');
  const portuguese = readJson('package.nls.pt-br.json');

  it('resolves every key used in the manifest', () => {
    const keys = collectManifestValues([manifest.displayName, manifest.description, manifest.contributes]).flatMap((value) => MANIFEST_KEY.exec(value)?.[1] ?? []);
    expect(keys.filter((key) => !(key in english))).toEqual([]);
  });

  it('has the same keys in both languages', () => {
    expect(Object.keys(portuguese).sort()).toEqual(Object.keys(english).sort());
  });

  it('keeps the commands linked by the welcome views', () => {
    const links = (text: string) => text.match(/command:[\w.]+/g) ?? [];
    const different = Object.keys(english).filter((key) => links(english[key]).join() !== links(portuguese[key]).join());
    expect(different).toEqual([]);
  });
});

describe('documentation in two languages', () => {
  it.each(DOCUMENT_PAIRS)('%s has a twin with the same structure', (englishFile, portugueseFile) => {
    expect(existsSync(englishFile)).toBe(true);
    expect(existsSync(portugueseFile)).toBe(true);
    expect(headingCount(portugueseFile)).toBe(headingCount(englishFile));
  });

  it.each(DOCUMENT_PAIRS)('%s links to the other language', (englishFile, portugueseFile) => {
    expect(readFileSync(englishFile, 'utf8')).toContain('Português (Brasil)');
    expect(readFileSync(portugueseFile, 'utf8')).toContain('[English]');
  });
});
