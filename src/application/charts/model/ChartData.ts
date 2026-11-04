import type { BoxplotStats } from '../statistics/BoxplotStats';
import type { HistogramBin } from '../statistics/HistogramBin';
import type { LinearRegression } from '../statistics/LinearRegression';
import type { ChartNotice } from './ChartNotice';

export type CartesianAxisType = 'category' | 'time' | 'value';
export type CartesianSeriesKind = 'line' | 'area' | 'bar';

export interface CartesianSeries {
  readonly name: string;
  readonly values: readonly (number | null)[];
}

export interface ScatterSeries {
  readonly name: string;
  readonly points: readonly (readonly [number, number])[];
}

export interface BoxplotGroup {
  readonly name: string;
  readonly stats: BoxplotStats;
}

interface ChartDataBase {
  readonly notices: readonly ChartNotice[];
}

export interface CartesianChartData extends ChartDataBase {
  readonly form: 'cartesian';
  readonly seriesKind: CartesianSeriesKind;
  readonly axisType: CartesianAxisType;
  readonly xName: string;
  readonly yName: string;
  readonly categories: readonly string[];
  readonly positions?: readonly number[];
  readonly series: readonly CartesianSeries[];
}

export interface PieChartData extends ChartDataBase {
  readonly form: 'pie';
  readonly valueName: string;
  readonly slices: readonly { readonly name: string; readonly value: number }[];
}

export interface ScatterChartData extends ChartDataBase {
  readonly form: 'scatter';
  readonly xName: string;
  readonly yName: string;
  readonly series: readonly ScatterSeries[];
  readonly regression?: LinearRegression;
}

export interface HistogramChartData extends ChartDataBase {
  readonly form: 'histogram';
  readonly valueName: string;
  readonly bins: readonly HistogramBin[];
}

export interface BoxplotChartData extends ChartDataBase {
  readonly form: 'boxplot';
  readonly valueName: string;
  readonly groupName?: string;
  readonly groups: readonly BoxplotGroup[];
}

export interface HeatmapChartData extends ChartDataBase {
  readonly form: 'heatmap';
  readonly xName: string;
  readonly yName: string;
  readonly valueName: string;
  readonly xCategories: readonly string[];
  readonly yCategories: readonly string[];
  readonly cells: readonly (readonly [number, number, number])[];
  readonly min: number;
  readonly max: number;
}

export interface StatChartData extends ChartDataBase {
  readonly form: 'stat';
  readonly label: string;
  readonly value: string;
}

export interface EmptyChartData extends ChartDataBase {
  readonly form: 'empty';
  readonly reason: string;
}

export type DrawableChartData = CartesianChartData | PieChartData | ScatterChartData | HistogramChartData | BoxplotChartData | HeatmapChartData;

export type ChartData = DrawableChartData | StatChartData | EmptyChartData;
