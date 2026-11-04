import * as vscode from 'vscode';
import type { ImageFormat } from '../model/ImageFormat';

export async function saveImageFile(defaultName: string, format: ImageFormat, content: string): Promise<vscode.Uri | undefined> {
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`${defaultName}.${format}`),
    filters: { [format.toUpperCase()]: [format] },
  });
  if (!uri) {
    return undefined;
  }
  const bytes = format === 'png' ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf8');
  await vscode.workspace.fs.writeFile(uri, bytes);
  return uri;
}
