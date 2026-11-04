import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { ConnectionFileField } from '../../../contracts/ConnectionFormMessages';
import type { TextFieldName } from '../model/TextFieldName';

interface TextFieldDefinition {
  readonly label: string;
  readonly placeholder?: string;
  readonly hint?: string;
  readonly file?: ConnectionFileField;
}

export function getTextFields(): Readonly<Record<TextFieldName, TextFieldDefinition>> {
  return {
    name: { label: l10n.t('Name'), placeholder: l10n.t('Staging database') },
    host: { label: l10n.t('Host'), placeholder: 'localhost' },
    port: { label: l10n.t('Port') },
    user: { label: l10n.t('User') },
    database: { label: l10n.t('Database'), hint: l10n.t('Optional. Leave empty to use the default of the user.') },
    caFile: { label: l10n.t('CA file'), hint: l10n.t('Optional. Needed when the certificate is not signed by a public authority, as in Amazon RDS.'), file: 'caFile' },
    sshHost: { label: l10n.t('SSH host'), placeholder: 'bastion.example.com', hint: l10n.t('A host name, or an alias from your SSH config.') },
    sshPort: { label: l10n.t('SSH port'), placeholder: '22' },
    sshUser: { label: l10n.t('SSH user'), hint: l10n.t('Optional. Your SSH config is used when empty.') },
    sshIdentityFile: { label: l10n.t('Private key'), hint: l10n.t('Optional. Your SSH config and ssh-agent are used when empty. Keys with a passphrase must be in ssh-agent.'), file: 'sshIdentityFile' },
    sshJumpHost: { label: l10n.t('Jump host'), hint: l10n.t('Optional. Same as ssh -J.') },
  };
}
