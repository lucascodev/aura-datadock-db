import type { ConnectionInput } from '../../../../application/connections/model/ConnectionInput';
import type { TlsMode } from '../../../../domain/connection/model/ConnectionTls';
import type { DriverId } from '../../../../domain/driver/model/DriverId';
import type { FormFields } from '../fields/FormFields';
import type { ConnectionFormControls } from '../model/ConnectionFormControls';

export function readInput(controls: ConnectionFormControls, fields: FormFields): ConnectionInput {
  return {
    name: fields.readText('name'),
    kind: controls.kindSelect.value as DriverId,
    host: fields.readText('host'),
    port: fields.readText('port'),
    user: fields.readText('user'),
    database: fields.readText('database'),
    tlsMode: controls.tlsSelect.value as TlsMode,
    caFile: fields.readText('caFile'),
    isReadOnly: controls.readOnlyCheckbox.checked,
    usesSsh: controls.usesSshCheckbox.checked,
    sshHost: fields.readText('sshHost'),
    sshPort: fields.readText('sshPort'),
    sshUser: fields.readText('sshUser'),
    sshIdentityFile: fields.readText('sshIdentityFile'),
    sshJumpHost: fields.readText('sshJumpHost'),
  };
}
