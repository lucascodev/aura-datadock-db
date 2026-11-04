import { spawn, type ChildProcess } from 'node:child_process';
import { connect, createServer } from 'node:net';
import type { SshSettings } from '../../domain/connection/SshSettings';
import { buildSshArgs, LOOPBACK_ADDRESS } from './buildSshArgs';
import type { TunnelEndpoint } from './TunnelEndpoint';
import { explainSshFailure } from './explainSshFailure';
import { l10n } from '../../domain/i18n/l10n';
import type { SshTunnelOptions, SshTunnel } from './SshTunnel';

const READY_TIMEOUT_MS = 20_000;
const READY_POLL_MS = 150;
const MAX_STDERR_CHARACTERS = 4000;

export async function openSshTunnel(settings: SshSettings, destination: TunnelEndpoint, options: SshTunnelOptions = {}): Promise<SshTunnel> {
  const localPort = await findFreeLocalPort();
  const args = buildSshArgs(settings, destination, localPort, options.extraArgs);
  const child = spawn(options.sshBinary ?? 'ssh', args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  const monitor = new TunnelProcessMonitor(child);

  try {
    await waitUntilReady(localPort, monitor, options.readyTimeoutMs ?? READY_TIMEOUT_MS);
  } catch (error) {
    child.kill();
    throw error;
  }
  return { localPort, onClose: (listener) => monitor.onClose(listener), close: () => monitor.terminate() };
}

class TunnelProcessMonitor {
  private stderr = '';
  private errorCode?: string;
  private hasExited = false;
  private readonly listeners: (() => void)[] = [];

  constructor(private readonly child: ChildProcess) {
    child.stderr?.on('data', (chunk: Buffer) => {
      this.stderr = `${this.stderr}${chunk.toString('utf8')}`.slice(-MAX_STDERR_CHARACTERS);
    });
    child.once('error', (error: NodeJS.ErrnoException) => {
      this.errorCode = error.code;
      this.markExited();
    });
    child.once('exit', () => this.markExited());
  }

  get exited(): boolean {
    return this.hasExited;
  }

  describeFailure(): string {
    return explainSshFailure(this.stderr, this.errorCode);
  }

  onClose(listener: () => void): void {
    this.listeners.push(listener);
    if (this.hasExited) {
      listener();
    }
  }

  terminate(): Promise<void> {
    if (this.hasExited) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.child.once('exit', () => resolve());
      this.child.kill();
    });
  }

  private markExited(): void {
    if (!this.hasExited) {
      this.hasExited = true;
      this.listeners.forEach((listener) => listener());
    }
  }
}

function findFreeLocalPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, LOOPBACK_ADDRESS, () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : undefined;
      server.close(() => (port === undefined ? reject(new Error(l10n.t('Could not find a free local port'))) : resolve(port)));
    });
  });
}

async function waitUntilReady(localPort: number, monitor: TunnelProcessMonitor, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (monitor.exited) {
      throw new Error(monitor.describeFailure());
    }
    if (await canConnect(localPort)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
  }
  throw new Error(l10n.t('The SSH tunnel did not open within {0} seconds. {1}', Math.round(timeoutMs / 1000), monitor.describeFailure()));
}

function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: LOOPBACK_ADDRESS, port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}
