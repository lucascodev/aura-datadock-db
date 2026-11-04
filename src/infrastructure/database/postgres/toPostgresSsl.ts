import { readFileSync } from 'node:fs';
import type { ConnectionOptions as TlsConnectionOptions } from 'node:tls';
import type { ConnectionTls } from '../../../domain/connection/model/ConnectionTls';

export function toPostgresSsl(tls: ConnectionTls): boolean | TlsConnectionOptions {
  switch (tls.mode) {
    case 'off':
      return false;
    case 'required':
      return { rejectUnauthorized: false };
    case 'verified':
      return {
        rejectUnauthorized: true,
        ca: tls.caFile ? readFileSync(tls.caFile, 'utf8') : undefined,
        servername: tls.serverName,
      };
  }
}
