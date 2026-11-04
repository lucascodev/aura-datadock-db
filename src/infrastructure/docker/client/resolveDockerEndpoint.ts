import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { posix } from 'node:path';
import { l10n } from '../../../domain/i18n/l10n';

export type DockerEndpoint =
  | { readonly type: 'socket'; readonly socketPath: string }
  | { readonly type: 'tcp'; readonly host: string; readonly port: number };

const WINDOWS_PIPE = '\\\\.\\pipe\\docker_engine';

export function resolveDockerEndpoint(
  configured: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  fileExists: (path: string) => boolean = existsSync,
): DockerEndpoint {
  const value = configured?.trim() || env.DOCKER_HOST?.trim();
  if (value) {
    return parseDockerHost(value);
  }

  if (platform === 'win32') {
    return { type: 'socket', socketPath: WINDOWS_PIPE };
  }

  const candidates = [
    '/var/run/docker.sock',
    posix.join(homedir(), '.docker', 'run', 'docker.sock'),
    posix.join(homedir(), '.colima', 'default', 'docker.sock'),
    env.XDG_RUNTIME_DIR ? posix.join(env.XDG_RUNTIME_DIR, 'podman', 'podman.sock') : undefined,
  ].filter((candidate): candidate is string => candidate !== undefined);

  const found = candidates.find((candidate) => fileExists(candidate));
  return { type: 'socket', socketPath: found ?? candidates[0] };
}

export function parseDockerHost(value: string): DockerEndpoint {
  if (value.startsWith('unix://')) {
    return { type: 'socket', socketPath: value.slice('unix://'.length) };
  }
  if (value.startsWith('npipe://')) {
    const pipe = value.slice('npipe://'.length).replace(/\//g, '\\');
    return { type: 'socket', socketPath: pipe.startsWith('\\\\') ? pipe : `\\\\${pipe.replace(/^\\+/, '')}` };
  }
  if (value.startsWith('tcp://') || value.startsWith('http://')) {
    const url = new URL(value.replace(/^tcp:/, 'http:'));
    return { type: 'tcp', host: url.hostname, port: Number(url.port || 2375) };
  }
  throw new Error(l10n.t('Unsupported Docker host: {0}', value));
}
