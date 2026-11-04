import * as vscode from 'vscode';
import type { RowChange } from '../../../../application/editing/model/RowChange';
import type { ConnectionTarget } from '../../../../domain/connection/model/ConnectionTarget';
import type { TableRef } from '../../../../domain/schema/model/TableRef';
import { TableEditorPanel } from './TableEditorPanel';
import type { TableEditorDependencies, TableEditorOptions } from './TableEditorDependencies';
import { l10n } from '../../../../domain/i18n/translation/l10n';

type TableLocation = Pick<TableRef, 'namespace' | 'name'>;

export class TableEditors {
  private readonly panels = new Map<string, TableEditorPanel>();

  constructor(private readonly dependencies: TableEditorDependencies) {}

  async show(target: ConnectionTarget, table: TableLocation, options: TableEditorOptions = {}): Promise<void> {
    const key = `${target.id}\u0000${table.namespace}\u0000${table.name}`;
    const existing = this.panels.get(key);
    if (existing) {
      existing.reveal(options.shouldAddRow ?? false);
      return;
    }

    const schema = await this.dependencies.loadSchema(target, table.namespace);
    const panel = new TableEditorPanel(target, schema, table.name, this.dependencies, options);
    this.panels.set(key, panel);
    panel.onDidDispose(() => {
      this.panels.delete(key);
      void this.offerToRestore(target, table, panel.pendingChanges);
    });
  }

  private async offerToRestore(target: ConnectionTarget, table: TableLocation, changes: readonly RowChange[]): Promise<void> {
    if (changes.length === 0) {
      return;
    }
    const reopenLabel = l10n.t('Reopen');
    const answer = await vscode.window.showWarningMessage(l10n.t('{0} was closed with {1} unsaved change(s).', table.name, changes.length), reopenLabel);
    if (answer === reopenLabel) {
      await this.show(target, table, { restoredChanges: changes });
    }
  }
}
