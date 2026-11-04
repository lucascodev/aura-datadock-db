import { l10n } from '../../../domain/i18n/l10n';

export class DockerUnavailableError extends Error {
  constructor(cause: Error) {
    super(l10n.t('Could not reach the Docker Engine. Is Docker running? ({0})', cause.message));
    this.name = 'DockerUnavailableError';
  }
}
