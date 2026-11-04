import type { DiagramPalette } from '../../../../application/diagram/model/DiagramPalette';

export const LIVE_PALETTE: DiagramPalette = {
  background: 'var(--vscode-editor-background)',
  tableFill: 'var(--vscode-editorWidget-background, var(--vscode-editor-background))',
  tableBorder: 'var(--vscode-editorWidget-border, var(--vscode-panel-border))',
  headerFill: 'var(--vscode-button-background)',
  viewHeaderFill: 'var(--vscode-badge-background)',
  headerText: 'var(--vscode-button-foreground)',
  text: 'var(--vscode-editor-foreground)',
  mutedText: 'var(--vscode-descriptionForeground)',
  primaryKey: 'var(--vscode-charts-yellow, #cca700)',
  foreignKey: 'var(--vscode-charts-blue, #3794ff)',
  edge: 'var(--vscode-descriptionForeground)',
  fontFamily: 'var(--vscode-editor-font-family, monospace)',
};
