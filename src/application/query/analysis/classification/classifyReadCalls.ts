import { l10n } from '../../../../domain/i18n/translation/l10n';
import type { RiskVerdict } from '../../model/RiskVerdict';

const QUOTED_FUNCTION_CALL = /_identifier_\s*\(/;

export function classifyReadCalls(statement: string, serverSideCall: RegExp): RiskVerdict {
  const call = serverSideCall.exec(statement);
  if (call) {
    return { risk: 'write', reason: l10n.t('{0} can change the server or read its files', call[1]) };
  }
  if (QUOTED_FUNCTION_CALL.test(statement)) {
    return { risk: 'write', reason: l10n.t('A function called by a quoted name may change the server, so it counts as a write') };
  }
  return { risk: 'read' };
}
