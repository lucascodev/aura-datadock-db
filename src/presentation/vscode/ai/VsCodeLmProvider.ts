import * as vscode from 'vscode';
import { type AiProvider, type AiRequest } from '../../../application/ai/ports/AiProvider';
import { AiConfigurationError } from '../../../application/ai/errors/AiConfigurationError';
import { l10n } from '../../../domain/i18n/translation/l10n';

export class VsCodeLmProvider implements AiProvider {
  readonly label = 'VS Code language model';

  constructor(private readonly preferredModel: string) {}

  async complete(request: AiRequest): Promise<string> {
    const selector: vscode.LanguageModelChatSelector = this.preferredModel ? { family: this.preferredModel } : {};
    const [model] = await vscode.lm.selectChatModels(selector);
    if (!model) {
      throw new AiConfigurationError(
        l10n.t('No VS Code language model is available. Install GitHub Copilot or pick another provider in auraDataDockDb.ai.provider.'),
      );
    }

    const cancellation = new vscode.CancellationTokenSource();
    request.signal?.addEventListener('abort', () => cancellation.cancel());

    try {
      const response = await model.sendRequest(
        [vscode.LanguageModelChatMessage.User(`${request.system}\n\n${request.prompt}`)],
        { justification: l10n.t('Aura DataDock DB uses the model to write SQL from your database schema.') },
        cancellation.token,
      );

      let text = '';
      for await (const fragment of response.text) {
        text += fragment;
      }
      return text;
    } finally {
      cancellation.dispose();
    }
  }
}
