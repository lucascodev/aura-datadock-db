import { readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listFilesIn, listSourceFolders, toSourcePath } from '../fixtures/sourceTree';

const MAX_FILES_IN_FOLDER = 8;
const WEBVIEW_ENTRY_POINT = 'main.ts';
const WEBVIEW_ROOT = 'presentation/webview/';

function hasSubfolders(folder: string): boolean {
  return readdirSync(folder).some((entry) => statSync(join(folder, entry)).isDirectory());
}

function isWebviewEntryPoint(file: string): boolean {
  return basename(file) === WEBVIEW_ENTRY_POINT && toSourcePath(file).startsWith(WEBVIEW_ROOT);
}

describe('folder structure', () => {
  it(`keeps at most ${MAX_FILES_IN_FOLDER} files in a folder`, () => {
    const crowded = listSourceFolders()
      .filter((folder) => listFilesIn(folder).length > MAX_FILES_IN_FOLDER)
      .map((folder) => `${toSourcePath(folder)} has ${listFilesIn(folder).length}`);
    expect(crowded).toEqual([]);
  });

  it('does not mix files and subfolders, except the entry point of a webview', () => {
    const looseFiles = listSourceFolders()
      .filter(hasSubfolders)
      .flatMap((folder) => listFilesIn(folder))
      .filter((file) => !isWebviewEntryPoint(file))
      .map(toSourcePath);
    expect(looseFiles).toEqual([]);
  });
});
