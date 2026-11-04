import type { SavedConnection } from '../../../domain/connection/model/SavedConnection';
import type { SshSettings } from '../../../domain/connection/model/SshSettings';
import type { ConnectionInput } from '../model/ConnectionInput';

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

function toSsh(input: ConnectionInput): SshSettings {
  return {
    host: input.sshHost.trim(),
    port: input.sshPort.trim() ? Number(input.sshPort.trim()) : undefined,
    user: optional(input.sshUser),
    identityFile: optional(input.sshIdentityFile),
    jumpHost: optional(input.sshJumpHost),
  };
}

export function toConnection(input: ConnectionInput): Omit<SavedConnection, 'id'> {
  return {
    name: input.name.trim(),
    kind: input.kind,
    host: input.host.trim(),
    port: Number(input.port.trim()),
    user: input.user.trim(),
    database: optional(input.database),
    tlsMode: input.tlsMode,
    caFile: input.tlsMode === 'verified' ? optional(input.caFile) : undefined,
    isReadOnly: input.isReadOnly,
    ssh: input.usesSsh ? toSsh(input) : undefined,
  };
}
