import { l10n } from '../../../domain/i18n/translation/l10n';
import type { DockerEndpoint } from '../model/DockerEndpoint';

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
