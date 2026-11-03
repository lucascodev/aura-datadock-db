import * as vscode from 'vscode';
import { AiConfigurationError, type AiProvider, type AiRequest } from './AiProvider';

export class VsCodeLmProvider implements AiProvider {
  readonly label = 'VS Code language model';

  constructor(private readonly preferredModel: string) {}

  async complete(request: AiRequest): Promise<string> {
    const selector: vscode.LanguageModelChatSelector = this.preferredModel ? { family: this.preferredModel } : {};
    const [model] = await vscode.lm.selectChatModels(selector);
    if (!model) {
      throw new AiConfigurationError(
        'No VS Code language model is available. Install GitHub Copilot or pick another provider in auraDataDock.ai.provider.',
      );
    }

    const cancellation = new vscode.CancellationTokenSource();
    request.signal?.addEventListener('abort', () => cancellation.cancel());

    try {
      const response = await model.sendRequest(
        [vscode.LanguageModelChatMessage.User(`${request.system}\n\n${request.prompt}`)],
        { justification: 'Aura DataDock uses the model to write SQL from your database schema.' },
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
