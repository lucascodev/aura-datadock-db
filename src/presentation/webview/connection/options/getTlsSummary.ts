import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { TlsMode } from '../../../../domain/connection/model/ConnectionTls';

export function getTlsSummary(): Readonly<Record<TlsMode, string>> {
  return {
    off: l10n.t('TLS off'),
    required: l10n.t('TLS required'),
    verified: l10n.t('TLS verified'),
  };
}
