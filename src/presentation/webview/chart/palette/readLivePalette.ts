import { DARK_PALETTE, LIGHT_PALETTE } from '../constants/chartPalettes';
import type { ChartPalette } from '../model/ChartPalette';

const LIGHT_THEME_CLASSES = ['vscode-light', 'vscode-high-contrast-light'];

function readThemeColor(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  return styles.getPropertyValue(name).trim() || fallback;
}

export function readLivePalette(): ChartPalette {
  const isLight = LIGHT_THEME_CLASSES.some((name) => document.body.classList.contains(name));
  const base = isLight ? LIGHT_PALETTE : DARK_PALETTE;
  const styles = getComputedStyle(document.documentElement);
  return {
    ...base,
    surface: readThemeColor(styles, '--vscode-editor-background', base.surface),
    text: readThemeColor(styles, '--vscode-foreground', base.text),
    mutedText: readThemeColor(styles, '--vscode-descriptionForeground', base.mutedText),
    fontFamily: readThemeColor(styles, '--vscode-font-family', base.fontFamily),
  };
}
