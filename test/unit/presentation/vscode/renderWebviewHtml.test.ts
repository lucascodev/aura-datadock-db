import { afterEach, describe, expect, it } from 'vitest';
import { renderWebviewHtml } from '../../../../src/presentation/vscode/panels/shared/renderWebviewHtml';
import { env, l10n, Uri } from '../../../fixtures/vscodeStub';

const webview = { cspSource: 'source', asWebviewUri: (uri: unknown) => String(uri) };
const page = { title: 'Page', scriptPath: ['a.js'], stylePath: ['a.css'] };

function render(): string {
  return renderWebviewHtml(webview as never, Uri as never, page);
}

describe('renderWebviewHtml', () => {
  afterEach(() => {
    env.language = 'en';
    l10n.bundle = undefined;
  });

  it('declares the language of VS Code', () => {
    env.language = 'pt-br';
    expect(render()).toContain('<html lang="pt-br">');
  });

  it('sends no catalog in the default language', () => {
    expect(render()).not.toContain('data-l10n');
  });

  it('allows only the stylesheet of the extension by default', () => {
    const html = render();
    expect(html).toContain('style-src source;');
    expect(html).not.toContain('data-style-nonce');
  });

  it('authorizes editor styles with a nonce of their own, never with unsafe-inline', () => {
    const html = renderWebviewHtml(webview as never, Uri as never, { ...page, allowsEditorStyles: true });
    const styleNonce = /data-style-nonce="([^"]+)"/.exec(html)?.[1];
    const scriptNonce = /script-src 'nonce-([^']+)'/.exec(html)?.[1];
    expect(styleNonce).toBeTruthy();
    expect(styleNonce).not.toBe(scriptNonce);
    expect(html).toContain(`style-src source 'nonce-${styleNonce}'`);
    expect(html).not.toContain('unsafe-inline');
  });

  it('sends the catalog escaped, so a translation cannot break the page', () => {
    l10n.bundle = { Save: 'Salvar "agora" <já>' };
    const html = render();
    expect(html).toContain('data-l10n="');
    expect(html).not.toContain('<já>');
    expect(html).toContain('&lt;já&gt;');
  });
});
