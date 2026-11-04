export type DockerEndpoint =
  | { readonly type: 'socket'; readonly socketPath: string }
  | { readonly type: 'tcp'; readonly host: string; readonly port: number };
