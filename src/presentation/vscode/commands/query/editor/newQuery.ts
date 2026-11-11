import type { ConnectionNode } from '../../../tree/nodes/connection/ConnectionNode';
import type { DataDockContext } from '../../model/DataDockContext';
import { resolveConnection } from '../../registry/resolveConnection';
import { l10n } from '../../../../../domain/i18n/translation/l10n';
import { openBoundDocument } from './openBoundDocument';

export async function newQuery(context: DataDockContext, node?: ConnectionNode, initialSql = ''): Promise<void> {
  if (node) {
    context.connections.setActive(node.target.id);
  }
  const target = node?.target ?? (await resolveConnection(context));
  if (!target) {
    return;
  }

  const header = `-- ${l10n.t('{0} ({1}) · Ctrl+Enter runs the selection or the statement under the cursor, Ctrl+Shift+Enter runs the file', target.name, target.kind)}\n`;
  await openBoundDocument(context, target.key, `${header}${initialSql}`);
}
