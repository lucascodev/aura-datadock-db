export type TlsMode = 'off' | 'required' | 'verified';

export interface ConnectionTls {
  readonly mode: TlsMode;
  readonly caFile?: string;
  readonly serverName?: string;
}
