import type { RowExportFormatId } from '../../application/export/model/RowExportFormat';

export interface ResultColumnView {
  readonly name: string;
  readonly isNumeric: boolean;
}

export type ResultSetView =
  | {
      readonly status: 'rows';
      readonly sql: string;
      readonly columns: readonly ResultColumnView[];
      readonly rows: readonly (readonly (string | null)[])[];
      readonly isTruncated: boolean;
      readonly durationMs: number;
    }
  | { readonly status: 'command'; readonly sql: string; readonly affectedRows: number; readonly durationMs: number }
  | { readonly status: 'error'; readonly sql: string; readonly message: string };

export interface ExportFormatView {
  readonly id: RowExportFormatId;
  readonly label: string;
}

export type ResultsViewState =
  | { readonly phase: 'running'; readonly connectionName: string; readonly sql: string }
  | { readonly phase: 'done'; readonly connectionName: string; readonly opensAsChart?: boolean; readonly results: readonly ResultSetView[]; readonly exportFormats: readonly ExportFormatView[] };

export type ResultsHostMessage = { readonly type: 'state'; readonly state: ResultsViewState };

export type ResultsWebviewMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'cancel' }
  | { readonly type: 'copyText'; readonly text: string }
  | { readonly type: 'openValue'; readonly text: string }
  | { readonly type: 'exportResult'; readonly resultIndex: number; readonly format: RowExportFormatId; readonly destination: 'file' | 'clipboard' }
  | { readonly type: 'saveChartImage'; readonly format: 'png' | 'svg'; readonly content: string };
