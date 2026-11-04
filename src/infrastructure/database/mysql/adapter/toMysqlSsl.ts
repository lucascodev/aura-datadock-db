import { readFileSync } from 'node:fs';
import type { SslOptions } from 'mysql2';
import type { ConnectionTls } from '../../../../domain/connection/model/ConnectionTls';

export function toMysqlSsl(tls: ConnectionTls): SslOptions | undefined {
  switch (tls.mode) {
    case 'off':
      return undefined;
    case 'required':
      return { rejectUnauthorized: false };
    case 'verified':
      return {
        rejectUnauthorized: true,
        verifyIdentity: tls.serverName === undefined,
        ca: tls.caFile ? readFileSync(tls.caFile, 'utf8') : undefined,
      };
  }
}
