import * as vscode from 'vscode';
import { scanStatements } from '../../../application/query/analysis/splitStatements';
import type { ConnectionTarget } from '../../../domain/connection/ConnectionTarget';
import { l10n } from '../../../domain/i18n/l10n';

const MAX_STATEMENT_LENSES = 200;

interface SqlCodeLensDependencies {
  isEnabled(): boolean;
  connectionFor(document: vscode.TextDocument): ConnectionTarget | undefined;
}

export class SqlCodeLensProvider implements vscode.CodeLensProvider {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.changeEmitter.event;

  constructor(private readonly dependencies: SqlCodeLensDependencies) {}

  refresh(): void {
    this.changeEmitter.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!this.dependencies.isEnabled()) {
      return [];
    }
    const target = this.dependencies.connectionFor(document);
    return [connectionLens(target), ...statementLenses(document, target)];
  }
}

function connectionLens(target: ConnectionTarget | undefined): vscode.CodeLens {
  return new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
    title: target ? `$(database) ${target.name}${target.isRemote ? ` · ${l10n.t('remote')}` : ''}${target.isReadOnly ? ` · ${l10n.t('read-only')}` : ''}` : l10n.t('$(database) Select a database'),
    tooltip: l10n.t('Choose the database this file runs against'),
    command: 'auraDataDockDb.selectConnection',
  });
}

function statementLenses(document: vscode.TextDocument, target: ConnectionTarget | undefined): vscode.CodeLens[] {
  const statements = scanStatements(document.getText(), target?.kind).slice(0, MAX_STATEMENT_LENSES);

  return statements.flatMap((statement) => {
    const position = document.positionAt(statement.start);
    const range = new vscode.Range(position, position);
    return [
      new vscode.CodeLens(range, { title: l10n.t('$(play) Run'), command: 'auraDataDockDb.runStatementAt', arguments: [document.uri, statement.start] }),
      new vscode.CodeLens(range, { title: l10n.t('Explain'), command: 'auraDataDockDb.runStatementAt', arguments: [document.uri, statement.start, true] }),
    ];
  });
}
