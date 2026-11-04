import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const SOURCE_ROOT = join(__dirname, '..', '..', 'src');

const IMPORT_PATTERNS: readonly RegExp[] = [
  /^\s*(?:import|export)\s+(?:type\s+)?(?:\*|\{|[\w$])[^;'"`]*?\bfrom\s+['"]([^'"]+)['"]/gm,
  /^\s*import\s+['"]([^'"]+)['"]/gm,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
];

export function toSourcePath(path: string): string {
  return relative(SOURCE_ROOT, path).split(sep).join('/');
}

export function listSourceFolders(folder = SOURCE_ROOT): string[] {
  const subfolders = readdirSync(folder)
    .map((entry) => join(folder, entry))
    .filter((path) => statSync(path).isDirectory());
  return [folder, ...subfolders.flatMap((subfolder) => listSourceFolders(subfolder))];
}

export function listFilesIn(folder: string): string[] {
  return readdirSync(folder)
    .map((entry) => join(folder, entry))
    .filter((path) => statSync(path).isFile());
}

export function listSourceFiles(): string[] {
  return listSourceFolders().flatMap((folder) => listFilesIn(folder));
}

export function readImports(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  return IMPORT_PATTERNS.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[1]));
}
