import { request } from 'node:http';
import type { DockerContainerDetails, DockerContainerSummary } from './DockerContainer';
import type { DockerEndpoint } from './resolveDockerEndpoint';

const REQUEST_TIMEOUT_MS = 5000;

export class DockerClient {
  constructor(private readonly endpoint: DockerEndpoint) {}

  listRunningContainers(): Promise<DockerContainerSummary[]> {
    return this.get<DockerContainerSummary[]>('/containers/json');
  }

  inspectContainer(id: string): Promise<DockerContainerDetails> {
    return this.get<DockerContainerDetails>(`/containers/${encodeURIComponent(id)}/json`);
  }

  private get<T>(path: string): Promise<T> {
    const target =
      this.endpoint.type === 'socket'
        ? { socketPath: this.endpoint.socketPath }
        : { host: this.endpoint.host, port: this.endpoint.port };

    return new Promise<T>((resolve, reject) => {
      const req = request({ ...target, path, method: 'GET', timeout: REQUEST_TIMEOUT_MS }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (!res.statusCode || res.statusCode >= 400) {
            reject(new Error(`Docker API ${path} answered ${res.statusCode}: ${body}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch (error) {
            reject(error);
          }
        });
      });
      req.on('timeout', () => req.destroy(new Error('Docker API request timed out')));
      req.on('error', (error) => reject(new DockerUnavailableError(error)));
      req.end();
    });
  }
}

export class DockerUnavailableError extends Error {
  constructor(cause: Error) {
    super(`Could not reach the Docker Engine. Is Docker running? (${cause.message})`);
    this.name = 'DockerUnavailableError';
  }
}
