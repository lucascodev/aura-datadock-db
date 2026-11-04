import type { TlsMode } from '../../../domain/connection/ConnectionTls';
import type { DriverId } from '../../../domain/driver/DriverId';
import { findDriverByScheme } from '../../../drivers/catalog/driverCatalog';

interface ParsedConnectionString {
  readonly kind: DriverId;
  readonly host: string;
  readonly port: string;
  readonly user: string;
  readonly password?: string;
  readonly database: string;
  readonly tlsMode?: TlsMode;
}

const TLS_BY_QUERY_VALUE: Readonly<Record<string, TlsMode | undefined>> = {
  disable: 'off',
  disabled: 'off',
  false: 'off',
  allow: 'required',
  prefer: 'required',
  preferred: 'required',
  require: 'required',
  required: 'required',
  true: 'required',
  'verify-ca': 'verified',
  verify_ca: 'verified',
  'verify-full': 'verified',
  verify_identity: 'verified',
};

const TLS_QUERY_KEYS = ['sslmode', 'ssl-mode', 'ssl_mode', 'ssl'];

export function parseConnectionString(text: string): ParsedConnectionString | undefined {
  const url = parseUrl(text.trim());
  const driver = url ? findDriverByScheme(url.protocol.replace(/:$/, '')) : undefined;
  if (!url || !driver || !url.hostname) {
    return undefined;
  }

  return {
    kind: driver.id,
    host: url.hostname.replace(/^\[|\]$/g, ''),
    port: url.port || String(driver.defaultPort),
    user: decodeURIComponent(url.username),
    password: url.password ? decodeURIComponent(url.password) : undefined,
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    tlsMode: readTlsMode(url),
  };
}

function parseUrl(text: string): URL | undefined {
  try {
    return new URL(text);
  } catch (error) {
    return error instanceof TypeError ? undefined : rethrow(error);
  }
}

function rethrow(error: unknown): never {
  throw error;
}

function readTlsMode(url: URL): TlsMode | undefined {
  const key = TLS_QUERY_KEYS.find((candidate) => url.searchParams.has(candidate));
  return key ? TLS_BY_QUERY_VALUE[(url.searchParams.get(key) ?? '').toLowerCase()] : undefined;
}
