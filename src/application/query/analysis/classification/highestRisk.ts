import type { QueryRisk } from '../../model/QueryClassification';

const RISK_ORDER: readonly QueryRisk[] = ['read', 'write', 'destructive'];

export function highestRisk(a: QueryRisk, b: QueryRisk): QueryRisk {
  return RISK_ORDER[Math.max(RISK_ORDER.indexOf(a), RISK_ORDER.indexOf(b))];
}
