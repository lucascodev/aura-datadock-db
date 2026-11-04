import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listDrivers } from '../../src/drivers/catalog/listDrivers';
import { listSourceFiles, toSourcePath } from '../fixtures/sourceTree';

const DRIVER_SPECIFIC_FOLDERS = ['drivers/', 'infrastructure/database/'];

describe('driver literals', () => {
  it('keeps decisions by driver inside the driver folders', () => {
    const driverIds = listDrivers().map((driver) => driver.id).join('|');
    const driverLiteral = new RegExp(`['"\`](${driverIds})['"\`]`);

    const offenders = listSourceFiles()
      .filter((file) => !DRIVER_SPECIFIC_FOLDERS.some((folder) => toSourcePath(file).startsWith(folder)))
      .filter((file) => driverLiteral.test(readFileSync(file, 'utf8')))
      .map(toSourcePath);

    expect(offenders).toEqual([]);
  });
});
