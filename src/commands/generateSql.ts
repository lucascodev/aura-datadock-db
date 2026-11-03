import * as vscode from 'vscode';
import { createAiProvider } from '../ai/createAiProvider';
import { buildTextToSqlPrompt, extractSql } from '../ai/buildTextToSqlPrompt';
import { describeSchema } from '../core/describeSchema';
import type { DataDockContext } from './DataDockContext';
import { resolveConnection } from './pickConnection';

const MAX_SCHEMA_TABLES = 80;

export async function generateSql(context: DataDockContext): Promise<void> {
  const target = await resolveConnection(context);
  if (!target) {
    return;
  }

  const question = await vscode.window.showInputBox({
    title: `Generate SQL for ${target.containerName}`,
    prompt: 'Describe what you need, for example: customers with more than 3 paid orders this month',
    ignoreFocusOut: true,
  });
  if (!question) {
    return;
  }

  try {
    const sql = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Generating SQL', cancellable: true },
      async (_progress, token) => {
        const abort = new AbortController();
        token.onCancellationRequested(() => abort.abort());

        const adapter = await context.connections.getAdapter(target.id);
        const schema = await describeSchema(adapter, { maxTables: MAX_SCHEMA_TABLES });
        const provider = await createAiProvider(context.config(), context.secrets);
        const prompt = buildTextToSqlPrompt(target.kind, schema, question);
        context.output.info(`[ai] ${provider.label} generating SQL for ${target.containerName}`);
        return extractSql(await provider.complete({ ...prompt, signal: abort.signal }));
      },
    );

    const content = `-- ${target.containerName} · AI: ${question}\n-- Review before running\n${sql}\n`;
    const document = await vscode.workspace.openTextDocument({ language: 'sql', content });
    await vscode.window.showTextDocument(document);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
    vscode.window.showErrorMessage(`AI request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
