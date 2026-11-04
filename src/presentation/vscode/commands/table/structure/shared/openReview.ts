import type { ConnectionTarget } from '../../../../../../domain/connection/model/ConnectionTarget';
import type { DataDockContext } from '../../../model/DataDockContext';
import { openBoundDocument } from '../../../query/editor/openBoundDocument';
import { l10n } from '../../../../../../domain/i18n/translation/l10n';

export async function openReview(context: DataDockContext, target: ConnectionTarget, sql: string): Promise<void> {
  await openBoundDocument(context, target.key, `-- ${l10n.t('Review this statement and run it with Ctrl+Enter')}\n${sql}\n`);
}
