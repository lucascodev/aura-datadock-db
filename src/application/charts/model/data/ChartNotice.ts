export type ChartNoticeKind = 'truncated' | 'unusable' | 'merged' | 'folded' | 'approximate' | 'regression';

export interface ChartNotice {
  readonly kind: ChartNoticeKind;
  readonly message: string;
}
