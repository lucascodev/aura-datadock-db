import { l10n } from '../../../domain/i18n/translation/l10n';

const UNTRUSTED_CERTIFICATE = /self[- ]signed|unable to verify|unable to get (local )?issuer|certificate|altnames|ERR_TLS/i;
const SERVER_WITHOUT_TLS = /does not support (ssl|secure)|ssl (is )?not (enabled|supported)|ssl off/i;
const SERVER_REQUIRES_TLS = /no pg_hba\.conf entry.*no encryption|requires? (ssl|a secure)|secure transport required/i;

export function explainConnectionFailure(message: string): string {
  const hint = findHint(message);
  return hint ? l10n.t('{0}. {1}', message, hint) : message;
}

function findHint(message: string): string | undefined {
  if (SERVER_WITHOUT_TLS.test(message)) {
    return l10n.t('This server does not accept TLS. Change TLS to "Off" only if the network is trusted, or connect over SSH.');
  }
  if (SERVER_REQUIRES_TLS.test(message)) {
    return l10n.t('This server requires TLS. Change TLS to "Required" or "Verified".');
  }
  return UNTRUSTED_CERTIFICATE.test(message) ? l10n.t('Point the connection to the CA file of your provider, or change TLS to "Required" to encrypt without validating the certificate.') : undefined;
}
