import { describe, expect, it } from 'vitest';
import { detectDatabaseKind } from '../../../src/infrastructure/docker/discovery/detectDatabaseKind';
import { resolveCredentials } from '../../../src/infrastructure/docker/discovery/resolveCredentials';
import { findDriver, findDriverByImage, findDriverByScheme, getDriver, listDrivers } from '../../../src/drivers/catalog/driverCatalog';
import { ADAPTER_FACTORIES } from '../../../src/infrastructure/database/constants/adapterFactories';
import { quoteIdentifier, quoteTable } from '../../../src/drivers/catalog/quoteIdentifier';

describe('driver catalog', () => {
  it('lists the supported drivers', () => {
    expect(listDrivers().map((driver) => driver.id)).toEqual(['postgres', 'mysql', 'mariadb']);
  });

  it('has an adapter registered for every driver', () => {
    for (const driver of listDrivers()) {
      expect(ADAPTER_FACTORIES[driver.id], driver.id).toBeTypeOf('function');
    }
  });

  it.each(listDrivers().map((driver) => [driver.id, driver] as const))('%s has a complete description', (_id, driver) => {
    expect(driver.label.length).toBeGreaterThan(0);
    expect(driver.defaultPort).toBeGreaterThan(0);
    expect(driver.connectionSchemes.length).toBeGreaterThan(0);
    expect(driver.dialect.commonTypes.length).toBeGreaterThan(0);
  });

  it('does not reuse a connection scheme between drivers', () => {
    const schemes = listDrivers().flatMap((driver) => driver.connectionSchemes);
    expect(new Set(schemes).size).toBe(schemes.length);
  });

  it('finds drivers by id, scheme and image', () => {
    expect(findDriver('mysql')?.label).toBe('MySQL');
    expect(findDriver('oracle')).toBeUndefined();
    expect(findDriverByScheme('postgresql')?.id).toBe('postgres');
    expect(findDriverByImage('mariadb:11')?.id).toBe('mariadb');
    expect(findDriverByImage('redis:7')).toBeUndefined();
  });

  it('fails clearly for an unknown driver', () => {
    expect(() => getDriver('oracle')).toThrow(/Unknown database driver: oracle/);
  });

  it('quotes identifiers with the quote of each driver', () => {
    expect(quoteIdentifier('postgres', 'a"b')).toBe('"a""b"');
    expect(quoteIdentifier('mysql', 'a`b')).toBe('`a``b`');
    expect(quoteTable('mariadb', { namespace: 'shop', name: 'orders' })).toBe('`shop`.`orders`');
  });

  it('detects MariaDB apart from MySQL, with the credentials of its image', () => {
    expect(detectDatabaseKind('mariadb:11')).toBe('mariadb');
    expect(resolveCredentials('mariadb', { MARIADB_ROOT_PASSWORD: 'pw', MARIADB_DATABASE: 'shop' })).toEqual({ user: 'root', password: 'pw', database: 'shop' });
  });
});
