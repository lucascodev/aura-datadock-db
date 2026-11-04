import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { TlsMode } from '../../../../domain/connection/model/ConnectionTls';

export function getTlsOptions(): readonly { readonly id: TlsMode; readonly label: string }[] {
  return [
    { id: 'off', label: l10n.t('Off') },
    { id: 'required', label: l10n.t('Required: encrypt, do not validate the certificate') },
    { id: 'verified', label: l10n.t('Verified: encrypt and validate the certificate') },
  ];
}
