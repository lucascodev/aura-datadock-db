export interface SshTunnelOptions {
  readonly sshBinary?: string;
  readonly extraArgs?: readonly string[];
  readonly readyTimeoutMs?: number;
}

export interface SshTunnel {
  readonly localPort: number;
  onClose(listener: () => void): void;
  close(): Promise<void>;
}
