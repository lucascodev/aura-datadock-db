import { BarChart, BoxplotChart, HeatmapChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import { DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';
import type { DrawableChartData } from '../../../../application/charts/model/data/ChartData';
import { LIGHT_PALETTE } from '../constants/chartPalettes';
import { readLivePalette } from '../palette/readLivePalette';
import type { ChartRenderer } from '../ports/ChartRenderer';
import { createTooltipContent } from './createTooltipContent';
import { toEChartsOption } from './toEChartsOption';

const EXPORT_WIDTH = 1200;
const EXPORT_HEIGHT = 700;
const EXPORT_PIXEL_RATIO = 2;
const PNG_DATA_PREFIX = 'data:image/png;base64,';

echarts.use([BarChart, BoxplotChart, HeatmapChart, LineChart, PieChart, ScatterChart, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, CanvasRenderer, SVGRenderer]);

function exportOption(data: DrawableChartData) {
  return toEChartsOption(data, { palette: LIGHT_PALETTE, isExport: true, renderTooltip: () => '' });
}

export class EChartsRenderer implements ChartRenderer {
  private readonly chart: echarts.ECharts;

  constructor(element: HTMLElement) {
    this.chart = echarts.init(element, undefined, { renderer: 'canvas' });
  }

  render(data: DrawableChartData): void {
    this.chart.setOption(toEChartsOption(data, { palette: readLivePalette(), isExport: false, renderTooltip: createTooltipContent }), true);
  }

  resize(): void {
    this.chart.resize();
  }

  exportPng(data: DrawableChartData): string {
    const chart = echarts.init(document.createElement('div'), undefined, { renderer: 'canvas', width: EXPORT_WIDTH, height: EXPORT_HEIGHT });
    try {
      chart.setOption(exportOption(data));
      return chart.getDataURL({ type: 'png', pixelRatio: EXPORT_PIXEL_RATIO, backgroundColor: LIGHT_PALETTE.surface }).slice(PNG_DATA_PREFIX.length);
    } finally {
      chart.dispose();
    }
  }

  exportSvg(data: DrawableChartData): string {
    const chart = echarts.init(null as unknown as HTMLElement, undefined, { renderer: 'svg', ssr: true, width: EXPORT_WIDTH, height: EXPORT_HEIGHT });
    try {
      chart.setOption(exportOption(data));
      return chart.renderToSVGString();
    } finally {
      chart.dispose();
    }
  }

  dispose(): void {
    this.chart.dispose();
  }
}
