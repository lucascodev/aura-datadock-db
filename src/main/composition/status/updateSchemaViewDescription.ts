import { l10n } from '../../../domain/i18n/translation/l10n';
import type { DataDockContext } from '../../../presentation/vscode/commands/model/DataDockContext';
import type { Views } from '../model/Views';

export function updateSchemaViewDescription(schemaView: Views['schemaView'], context: DataDockContext): void {
  const { schemaTree, connections } = context;
  const parts = [connections.activeTarget?.name, schemaTree.filter ? l10n.t('filter: {0}', schemaTree.filter) : undefined].filter((part) => part !== undefined);
  schemaView.description = parts.join(' · ');
}
