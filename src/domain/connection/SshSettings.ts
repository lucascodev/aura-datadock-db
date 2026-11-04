export interface SshSettings {
  readonly host: string;
  readonly port?: number;
  readonly user?: string;
  readonly identityFile?: string;
  readonly jumpHost?: string;
}
