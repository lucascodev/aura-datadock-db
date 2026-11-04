import { posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listSourceFiles, readImports, toSourcePath } from '../fixtures/sourceTree';

type Layer = 'domain' | 'drivers' | 'application' | 'infrastructure' | 'presentation/contracts' | 'presentation/webview' | 'presentation/vscode' | 'main';

interface LayerRule {
  readonly layer: Layer;
  readonly mayImport: readonly Layer[];
  readonly allowedLibraries: RegExp;
}

const NO_LIBRARIES = /^$/;
const EVERY_LIBRARY = /./;
const ECHARTS_LIBRARY = /^echarts(\/.*)?$/;
const ECHARTS_FOLDER = 'presentation/webview/chart/echarts/';

const RULES: readonly LayerRule[] = [
  { layer: 'domain', mayImport: [], allowedLibraries: NO_LIBRARIES },
  { layer: 'drivers', mayImport: ['domain'], allowedLibraries: NO_LIBRARIES },
  { layer: 'application', mayImport: ['domain', 'drivers'], allowedLibraries: NO_LIBRARIES },
  { layer: 'infrastructure', mayImport: ['domain', 'drivers', 'application'], allowedLibraries: /^(pg|pg-cursor|mysql2(\/.*)?|node:.*)$/ },
  { layer: 'presentation/contracts', mayImport: ['domain', 'application'], allowedLibraries: NO_LIBRARIES },
  { layer: 'presentation/webview', mayImport: ['domain', 'drivers', 'application', 'presentation/contracts'], allowedLibraries: NO_LIBRARIES },
  { layer: 'presentation/vscode', mayImport: ['domain', 'drivers', 'application', 'presentation/contracts'], allowedLibraries: /^(vscode|node:.*)$/ },
  { layer: 'main', mayImport: ['domain', 'drivers', 'application', 'infrastructure', 'presentation/contracts', 'presentation/webview', 'presentation/vscode'], allowedLibraries: EVERY_LIBRARY },
];

function layerOf(sourcePath: string): Layer | undefined {
  return RULES.find(({ layer }) => sourcePath.startsWith(`${layer}/`))?.layer;
}

function isEChartsAllowedIn(sourcePath: string, specifier: string): boolean {
  return ECHARTS_LIBRARY.test(specifier) && sourcePath.startsWith(ECHARTS_FOLDER);
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith('.');
}

function findViolations(rule: LayerRule): string[] {
  const files = listSourceFiles().filter((file) => layerOf(toSourcePath(file)) === rule.layer);
  return files.flatMap((file) => {
    const from = toSourcePath(file);
    return readImports(file).flatMap((specifier) => {
      if (!isRelative(specifier)) {
        return rule.allowedLibraries.test(specifier) || isEChartsAllowedIn(from, specifier) ? [] : [`${from} -> library ${specifier}`];
      }
      const to = posix.join(posix.dirname(from), specifier);
      const target = layerOf(to);
      return target === rule.layer || (target && rule.mayImport.includes(target)) ? [] : [`${from} -> ${to}`];
    });
  });
}

describe('layers', () => {
  it('has every source file inside a known layer', () => {
    const outside = listSourceFiles().map(toSourcePath).filter((path) => !layerOf(path));
    expect(outside).toEqual([]);
  });

  it.each(RULES.map((rule) => [rule.layer, rule] as const))('%s only depends on what it may know', (_layer, rule) => {
    expect(findViolations(rule)).toEqual([]);
  });
});
