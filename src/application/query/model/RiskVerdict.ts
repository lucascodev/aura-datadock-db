import type { QueryRisk } from './QueryClassification';

export interface RiskVerdict {
  readonly risk: QueryRisk;
  readonly reason?: string;
}
