import type { TlsMode } from '../../../../domain/connection/model/ConnectionTls';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { ConnectionFormControls } from '../model/ConnectionFormControls';
import { getTlsSummary } from '../options/getTlsSummary';

export function describeProtection({ readOnlyCheckbox, tlsSelect, usesSshCheckbox }: ConnectionFormControls): string {
  const parts = [
    readOnlyCheckbox.checked ? l10n.t('Read-only') : l10n.t('Writes allowed'),
    getTlsSummary()[tlsSelect.value as TlsMode],
    ...(usesSshCheckbox.checked ? [l10n.t('through SSH')] : []),
  ];
  return l10n.t('{0}. Change it on the Security and SSH tabs.', parts.join(' · '));
}
