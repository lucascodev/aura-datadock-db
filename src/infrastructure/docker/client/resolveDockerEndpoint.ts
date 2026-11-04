import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { posix } from 'node:path';
import type { DockerEndpoint } from '../model/DockerEndpoint';
import { parseDockerHost } from './parseDockerHost';

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
