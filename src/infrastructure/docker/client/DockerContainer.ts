export interface DockerPort {
  readonly IP?: string;
  readonly PrivatePort: number;
  readonly PublicPort?: number;
  readonly Type: string;
}

export interface DockerContainerSummary {
  readonly Id: string;
  readonly Names: string[];
  readonly Image: string;
  readonly State: string;
  readonly Ports: DockerPort[];
  readonly Labels?: Record<string, string>;
}

export interface DockerContainerDetails {
  readonly Id: string;
  readonly Config: {
    readonly Env?: string[];
    readonly Image: string;
  };
}
