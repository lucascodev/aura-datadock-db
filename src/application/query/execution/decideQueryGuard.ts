import type { QueryRisk } from '../model/QueryClassification';

type QueryGuardDecision = 'allow' | 'confirm' | 'block';

interface QueryGuardContext {
  readonly isReadOnly: boolean;
  readonly isRemote: boolean;
  readonly confirmsDestructive: boolean;
}

export function decideQueryGuard(risk: QueryRisk, context: QueryGuardContext): QueryGuardDecision {
  if (risk === 'read') {
    return 'allow';
  }
  if (context.isReadOnly) {
    return 'block';
  }
  if (context.isRemote) {
    return 'confirm';
  }
  return risk === 'destructive' && context.confirmsDestructive ? 'confirm' : 'allow';
}
