import * as vscode from 'vscode';
import { buildTextToSqlPrompt } from '../../../../application/ai/prompts/buildTextToSqlPrompt';
import { extractSql } from '../../../../application/ai/prompts/extractSql';
import { describeSchema } from '../../../../application/schema/loading/describeSchema';
import type { DataDockContext } from '../model/DataDockContext';
import { openBoundDocument } from '../query/newQuery';
import { resolveConnection } from '../registry/pickConnection';
import { l10n } from '../../../../domain/i18n/translation/l10n';

const MAX_SCHEMA_TABLES = 80;

export async function generateSql(context: DataDockContext): Promise<void> {
  const target = await resolveConnection(context);
  if (!target) {
    return;
  }

  const question = await vscode.window.showInputBox({
    title: l10n.t('Generate SQL for {0}', target.name),
    prompt: l10n.t('Describe what you need, for example: customers with more than 3 paid orders this month'),
    ignoreFocusOut: true,
  });
  if (!question) {
    return;
  }

  try {
    const sql = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: l10n.t('Generating SQL'), cancellable: true },
      async (_progress, token) => {
        const abort = new AbortController();
        token.onCancellationRequested(() => abort.abort());

        const adapter = await context.connections.getAdapter(target.id);
        const schema = await describeSchema(adapter, { maxTables: MAX_SCHEMA_TABLES });
        const provider = await context.createAiProvider();
        const prompt = buildTextToSqlPrompt(target.kind, schema, question);
        context.output.info(`[ai] ${provider.label} generating SQL for ${target.name}`);
        return extractSql(await provider.complete({ ...prompt, signal: abort.signal }));
      },
    );

    const content = `-- ${l10n.t('{0} · AI: {1}', target.name, question)}\n-- ${l10n.t('Review before running')}\n${sql}\n`;
    await openBoundDocument(context, target.key, content);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
    vscode.window.showErrorMessage(l10n.t('AI request failed: {0}', error instanceof Error ? error.message : String(error)));
  }
}
