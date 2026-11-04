import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import type { SavedConnection } from '../../../domain/connection/model/SavedConnection';
import { isLocalHost } from '../guidance/isLocalHost';
import { l10n } from '../../../domain/i18n/translation/l10n';

export function toConnectionTarget(connection: SavedConnection): ConnectionTarget {
  return {
    id: connection.id,
    key: `saved:${connection.id}`,
    name: connection.name,
    detail: connection.ssh ? l10n.t('{0} via SSH {1}', connection.host, connection.ssh.host) : connection.host,
    source: 'saved',
    kind: connection.kind,
    host: connection.host,
    port: connection.port,
    user: connection.user,
    database: connection.database,
    credentialSource: 'missing',
    isRemote: connection.ssh !== undefined || !isLocalHost(connection.host),
    isReadOnly: connection.isReadOnly,
    tls: { mode: connection.tlsMode, caFile: connection.caFile },
    ssh: connection.ssh,
  };
}
