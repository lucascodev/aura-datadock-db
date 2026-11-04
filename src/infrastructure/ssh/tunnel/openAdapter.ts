import { createAdapter } from '../../database/factory/createAdapter';
import type { ConnectionTarget } from '../../../domain/connection/model/ConnectionTarget';
import type { DatabaseAdapter } from '../../../domain/database/ports/DatabaseAdapter';
import { LOOPBACK_ADDRESS } from '../constants/loopbackAddress';
import { openSshTunnel } from './openSshTunnel';
import type { SshTunnel, SshTunnelOptions } from '../model/SshTunnel';
import { TunneledAdapter } from './TunneledAdapter';
import { l10n } from '../../../domain/i18n/translation/l10n';

export async function openAdapter(target: ConnectionTarget, tunnelOptions?: SshTunnelOptions): Promise<DatabaseAdapter> {
  if (!target.ssh) {
    return createAdapter(target);
  }
  if (target.host === undefined || target.port === undefined) {
    throw new Error(l10n.t('The connection {0} has no database address', target.name));
  }

  const tunnel = await openSshTunnel(target.ssh, { host: target.host, port: target.port }, tunnelOptions);
  try {
    return new TunneledAdapter(createAdapter(throughTunnel(target, tunnel)), tunnel);
  } catch (error) {
    await tunnel.close();
    throw error;
  }
}

function throughTunnel(target: ConnectionTarget, tunnel: SshTunnel): ConnectionTarget {
  return {
    ...target,
    host: LOOPBACK_ADDRESS,
    port: tunnel.localPort,
    tls: { ...target.tls, serverName: target.host },
  };
}
