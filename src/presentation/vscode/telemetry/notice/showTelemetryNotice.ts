import * as vscode from 'vscode';
import { l10n } from '../../../../domain/i18n/translation/l10n';
import { TELEMETRY_SETTING } from '../../constants/telemetrySetting';

const NOTICE_SHOWN_KEY = 'telemetryNoticeShown';
const TELEMETRY_DOCS_URL = 'https://github.com/lucascodev/aura-datadock-db#telemetry';

export async function showTelemetryNotice(extension: vscode.ExtensionContext, config: () => vscode.WorkspaceConfiguration): Promise<void> {
  if (extension.globalState.get<boolean>(NOTICE_SHOWN_KEY)) {
    return;
  }
  await extension.globalState.update(NOTICE_SHOWN_KEY, true);

  const learnMore = l10n.t('Learn More');
  const turnOff = l10n.t('Turn Off');
  const choice = await vscode.window.showInformationMessage(
    l10n.t('Aura DataDock DB sends usage statistics, such as which commands and database types are used, to improve the extension. Hosts, names, queries and data are never sent, and it follows your VS Code telemetry setting.'),
    learnMore,
    turnOff,
  );
  if (choice === learnMore) {
    await vscode.env.openExternal(vscode.Uri.parse(TELEMETRY_DOCS_URL));
  }
  if (choice === turnOff) {
    await config().update(TELEMETRY_SETTING, false, vscode.ConfigurationTarget.Global);
  }
}
