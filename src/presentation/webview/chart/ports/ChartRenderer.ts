import type { DrawableChartData } from '../../../../application/charts/model/data/ChartData';

export interface ChartRenderer {
  render(data: DrawableChartData): void;
  resize(): void;
  exportPng(data: DrawableChartData): string;
  exportSvg(data: DrawableChartData): string;
  dispose(): void;
}

export interface ChartModule {
  createRenderer(element: HTMLElement): ChartRenderer;
}
