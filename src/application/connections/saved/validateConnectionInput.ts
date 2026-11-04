import type { SavedConnection } from '../../../domain/connection/SavedConnection';
import type { SshSettings } from '../../../domain/connection/SshSettings';
import type { ConnectionInput } from './ConnectionInput';
import { l10n } from '../../../domain/i18n/l10n';

export type ConnectionFieldErrors = Partial<Record<keyof ConnectionInput, string>>;

export type ConnectionValidation =
  | { readonly isValid: true; readonly connection: Omit<SavedConnection, 'id'> }
  | { readonly isValid: false; readonly errors: ConnectionFieldErrors };

const MAX_PORT = 65535;
const HAS_WHITESPACE = /\s/;

export function isSafeCommandValue(value: string): boolean {
  return value.length > 0 && !value.startsWith('-') && !HAS_WHITESPACE.test(value);
}

export function validateConnectionInput(input: ConnectionInput, takenNames: readonly string[]): ConnectionValidation {
  const errors: ConnectionFieldErrors = {
    name: validateName(input.name, takenNames),
    host: validateHost(input.host, l10n.t('Enter the host of the database.')),
    port: validatePort(input.port, true),
    user: validateUser(input.user),
    ...(input.usesSsh ? validateSsh(input) : {}),
  };
  const found = Object.fromEntries(Object.entries(errors).filter(([, message]) => message !== undefined));
  if (Object.keys(found).length > 0) {
    return { isValid: false, errors: found };
  }
  return { isValid: true, connection: toConnection(input) };
}

function validateName(name: string, takenNames: readonly string[]): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) {
    return l10n.t('Enter a name for this connection.');
  }
  return takenNames.some((taken) => taken.toLowerCase() === trimmed.toLowerCase()) ? l10n.t('Another connection already uses this name.') : undefined;
}

function validateHost(host: string, requiredMessage: string): string | undefined {
  const trimmed = host.trim();
  if (!trimmed) {
    return requiredMessage;
  }
  return isSafeCommandValue(trimmed) ? undefined : l10n.t('A host cannot contain spaces or start with a hyphen.');
}

function validatePort(port: string, isRequired: boolean): string | undefined {
  const trimmed = port.trim();
  if (!trimmed) {
    return isRequired ? l10n.t('Enter the port.') : undefined;
  }
  const value = Number(trimmed);
  return Number.isInteger(value) && value >= 1 && value <= MAX_PORT ? undefined : l10n.t('Enter a port from 1 to {0}.', MAX_PORT);
}

function validateUser(user: string): string | undefined {
  const trimmed = user.trim();
  if (!trimmed) {
    return l10n.t('Enter the user.');
  }
  return trimmed.startsWith('-') ? l10n.t('A user cannot start with a hyphen.') : undefined;
}

function validateSsh(input: ConnectionInput): ConnectionFieldErrors {
  return {
    sshHost: validateHost(input.sshHost, l10n.t('Enter the SSH host or an alias from your SSH config.')),
    sshPort: validatePort(input.sshPort, false),
    sshUser: validateOptionalValue(input.sshUser, l10n.t('An SSH user cannot contain spaces or start with a hyphen.')),
    sshJumpHost: validateOptionalValue(input.sshJumpHost, l10n.t('A jump host cannot contain spaces or start with a hyphen.')),
    sshIdentityFile: input.sshIdentityFile.trim().startsWith('-') ? l10n.t('A key path cannot start with a hyphen.') : undefined,
  };
}

function validateOptionalValue(value: string, message: string): string | undefined {
  const trimmed = value.trim();
  return !trimmed || isSafeCommandValue(trimmed) ? undefined : message;
}

function toConnection(input: ConnectionInput): Omit<SavedConnection, 'id'> {
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

function toSsh(input: ConnectionInput): SshSettings {
  return {
    host: input.sshHost.trim(),
    port: input.sshPort.trim() ? Number(input.sshPort.trim()) : undefined,
    user: optional(input.sshUser),
    identityFile: optional(input.sshIdentityFile),
    jumpHost: optional(input.sshJumpHost),
  };
}

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}
