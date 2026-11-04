import type { ChartPalette } from './ChartPalette';

const SYSTEM_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const LIGHT_PALETTE: ChartPalette = {
  categorical: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  sequential: ['#cde2fb', '#86b6ef', '#2a78d6', '#184f95', '#0d366b'],
  surface: '#ffffff',
  text: '#1f1f1f',
  mutedText: '#616161',
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
  fontFamily: SYSTEM_FONT,
};

export const DARK_PALETTE: ChartPalette = {
  categorical: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  sequential: ['#104281', '#1c5cab', '#3987e5', '#86b6ef', '#cde2fb'],
  surface: '#1e1e1e',
  text: '#cccccc',
  mutedText: '#9d9d9d',
  grid: '#2c2c2a',
  baseline: '#454545',
  fontFamily: SYSTEM_FONT,
};
