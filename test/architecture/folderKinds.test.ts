import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listSourceFiles, toSourcePath } from '../fixtures/sourceTree';

const CONTRACT_FOLDER = /(^|\/)(model|ports|contracts)\//;
const ERROR_FOLDER = /(^|\/)errors\//;
const EXPORTED_TYPE = /^export (?:interface|type) /m;
const ANY_VALUE = /^(?:export )?(?:const|let|enum) /m;
const ANY_LOGIC = /^(?:export )?(?:async )?function\*? |^(?:export )?(?:abstract )?class /m;
const ERROR_CLASS = /^(?:export )?class \w+Error\b/m;

const sources = listSourceFiles().map((file) => ({ path: toSourcePath(file), text: readFileSync(file, 'utf8').replace(/\r\n/g, '\n') }));

function isOnlyContracts(text: string): boolean {
  return EXPORTED_TYPE.test(text) && !ANY_VALUE.test(text) && !ANY_LOGIC.test(text);
}

describe('folders by kind', () => {
  it('keeps contracts in model, ports or contracts folders', () => {
    const outside = sources.filter((file) => isOnlyContracts(file.text) && !CONTRACT_FOLDER.test(file.path)).map((file) => file.path);
    expect(outside).toEqual([]);
  });

  it('keeps logic out of contract folders', () => {
    const withLogic = sources.filter((file) => CONTRACT_FOLDER.test(file.path) && ANY_LOGIC.test(file.text)).map((file) => file.path);
    expect(withLogic).toEqual([]);
  });

  it('keeps error classes in errors folders, and nothing else there', () => {
    const misplaced = sources.filter((file) => ERROR_CLASS.test(file.text) !== ERROR_FOLDER.test(file.path)).map((file) => file.path);
    expect(misplaced).toEqual([]);
  });
});
