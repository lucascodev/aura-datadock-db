import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultsPanel } from '../../../../src/presentation/vscode/panels/results/ResultsPanel';
import { saveImageFile } from '../../../../src/presentation/vscode/panels/shared/saveImageFile';
import { createdPanels, Uri, window, workspace } from '../../../fixtures/vscodeStub';

const chosenFile = { fsPath: 'C:/charts/out.png' };

describe('saveImageFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.showSaveDialog.mockResolvedValue(chosenFile);
  });

  it('decodes a PNG before writing', async () => {
    await expect(saveImageFile('chart', 'png', Buffer.from('image bytes').toString('base64'))).resolves.toBe(chosenFile);
    expect(workspace.fs.writeFile).toHaveBeenCalledWith(chosenFile, Buffer.from('image bytes'));
  });

  it('writes an SVG as text', async () => {
    await saveImageFile('chart', 'svg', '<svg>é</svg>');
    expect(workspace.fs.writeFile).toHaveBeenCalledWith(chosenFile, Buffer.from('<svg>é</svg>', 'utf8'));
  });

  it('suggests the name and filters by the format', async () => {
    await saveImageFile('query-chart', 'svg', '<svg/>');
    expect(window.showSaveDialog).toHaveBeenCalledWith({ defaultUri: { fsPath: 'query-chart.svg' }, filters: { SVG: ['svg'] } });
  });

  it('writes nothing when the dialog is canceled', async () => {
    window.showSaveDialog.mockResolvedValue(undefined);
    await expect(saveImageFile('chart', 'png', '')).resolves.toBeUndefined();
    expect(workspace.fs.writeFile).not.toHaveBeenCalled();
  });
});

describe('ResultsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdPanels.length = 0;
    window.showSaveDialog.mockResolvedValue(chosenFile);
  });

  function open(): ResultsPanel {
    const panel = new ResultsPanel(Uri as never);
    panel.showRunning('db', 'SELECT 1');
    return panel;
  }

  it('saves the chart image it receives, and says where', async () => {
    open();
    await createdPanels[0].receive({ type: 'saveChartImage', format: 'svg', content: '<svg/>' });
    expect(window.showSaveDialog).toHaveBeenCalledWith(expect.objectContaining({ defaultUri: { fsPath: 'query-chart.svg' } }));
    expect(workspace.fs.writeFile).toHaveBeenCalledWith(chosenFile, Buffer.from('<svg/>', 'utf8'));
    expect(window.setStatusBarMessage).toHaveBeenCalledWith(expect.stringContaining('C:/charts/out.png'), expect.any(Number));
  });

  it('stays quiet when the save is canceled', async () => {
    window.showSaveDialog.mockResolvedValue(undefined);
    open();
    await createdPanels[0].receive({ type: 'saveChartImage', format: 'png', content: '' });
    expect(window.setStatusBarMessage).not.toHaveBeenCalled();
  });

  it('tells the page where the chart library is, without loading it', () => {
    open();
    const { webview } = window.createWebviewPanel.mock.results[0].value as { webview: { html: string } };
    expect(webview.html).toContain('data-chart-script=');
    expect(webview.html.match(/<script /g)).toHaveLength(1);
  });
});
