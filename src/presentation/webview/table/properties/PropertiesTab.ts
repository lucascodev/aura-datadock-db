import type { TablePropertiesView } from '../../../contracts/TableEditorMessages';
import { l10n } from '../../../../domain/i18n/l10n';
import { createElement } from '../../shared/createElement';
import { Tabs } from '../../shared/Tabs';

type PropertiesSection = 'columns' | 'indexes' | 'references' | 'ddl';

interface PropertiesTabCallbacks {
  onCopy(text: string): void;
  onOpenSql(sql: string): void;
  onOpenTable(table: string): void;
}

export class PropertiesTab {
  readonly element = createElement('div', { className: 'properties-tab' });

  constructor(private readonly callbacks: PropertiesTabCallbacks) {}

  render(properties: TablePropertiesView): void {
    const tabs = new Tabs<PropertiesSection>([
      { id: 'columns', label: l10n.t('Columns ({0})', properties.table.columns.length), content: [renderColumns(properties)] },
      { id: 'indexes', label: l10n.t('Indexes ({0})', properties.table.indexes.length), content: [renderIndexes(properties)] },
      { id: 'references', label: l10n.t('References ({0})', properties.table.foreignKeys.length + properties.incomingReferences.length), content: [this.renderReferences(properties)] },
      { id: 'ddl', label: 'DDL', content: [this.renderDdl(properties.ddl)] },
    ]);
    this.element.replaceChildren(tabs.element);
  }

  private renderReferences(properties: TablePropertiesView): HTMLElement {
    const outgoing = properties.table.foreignKeys.map((foreignKey) => [
      foreignKey.name,
      foreignKey.columns.join(', '),
      this.tableLink(foreignKey.referencedTable, foreignKey.referencedNamespace === properties.table.namespace, foreignKey.referencedNamespace),
      foreignKey.referencedColumns.join(', '),
      [foreignKey.onDelete ? `ON DELETE ${foreignKey.onDelete}` : '', foreignKey.onUpdate ? `ON UPDATE ${foreignKey.onUpdate}` : ''].filter(Boolean).join(' · '),
    ]);
    const incoming = properties.incomingReferences.map((reference) => [
      reference.name,
      this.tableLink(reference.table, true),
      reference.columns.join(', '),
      reference.referencedColumns.join(', '),
    ]);
    return createElement('div', { className: 'section-stack' }, [
      createElement('h3', { text: l10n.t('This table references') }),
      renderTable([l10n.t('Name'), l10n.t('Columns'), l10n.t('Table'), l10n.t('Referenced columns'), l10n.t('Actions')], outgoing, l10n.t('No foreign keys.')),
      createElement('h3', { text: l10n.t('Referenced by') }),
      renderTable([l10n.t('Name'), l10n.t('Table'), l10n.t('Columns'), l10n.t('Referenced columns')], incoming, l10n.t('No table references this one.')),
    ]);
  }

  private tableLink(table: string, canOpen: boolean, namespace?: string): Node {
    if (!canOpen) {
      return document.createTextNode(`${namespace}.${table}`);
    }
    return createElement('button', { className: 'link', text: table, title: l10n.t('Open {0}', table), onClick: () => this.callbacks.onOpenTable(table) });
  }

  private renderDdl(ddl: string): HTMLElement {
    return createElement('div', { className: 'section-stack' }, [
      createElement('div', { className: 'toolbar-row' }, [
        createElement('button', { className: 'secondary', text: l10n.t('Copy'), onClick: () => this.callbacks.onCopy(ddl) }),
        createElement('button', { className: 'secondary', text: l10n.t('Open in Editor'), onClick: () => this.callbacks.onOpenSql(ddl) }),
      ]),
      createElement('pre', { className: 'ddl', text: ddl }),
    ]);
  }
}

function renderColumns({ table }: TablePropertiesView): HTMLElement {
  const rows = table.columns.map((column) => {
    const foreignKey = table.foreignKeys.find((candidate) => candidate.columns.includes(column.name));
    const key = [column.isPrimaryKey ? 'PK' : '', foreignKey ? 'FK' : ''].filter(Boolean).join(', ');
    return [
      column.name,
      column.dataType,
      column.nullable ? l10n.t('Yes') : l10n.t('No'),
      column.defaultValue ?? column.generationClause ?? '',
      key,
      foreignKey ? `${foreignKey.referencedTable}(${foreignKey.referencedColumns.join(', ')})` : '',
    ];
  });
  return renderTable([l10n.t('Name'), l10n.t('Type'), l10n.t('Nullable'), l10n.t('Default'), l10n.t('Key'), l10n.t('References')], rows, l10n.t('No columns.'));
}

function renderIndexes({ table }: TablePropertiesView): HTMLElement {
  const rows = table.indexes.map((index) => [index.name, index.columns.join(', '), index.isUnique ? l10n.t('Yes') : l10n.t('No'), index.isPrimary ? l10n.t('Yes') : l10n.t('No')]);
  return renderTable([l10n.t('Name'), l10n.t('Columns'), l10n.t('Unique'), l10n.t('Primary')], rows, l10n.t('No indexes.'));
}

function renderTable(headers: readonly string[], rows: readonly (readonly (string | Node)[])[], emptyText: string): HTMLElement {
  if (rows.length === 0) {
    return createElement('div', { className: 'muted', text: emptyText });
  }
  return createElement('table', { className: 'properties-table' }, [
    createElement('thead', {}, [createElement('tr', {}, headers.map((header) => createElement('th', { text: header })))]),
    createElement('tbody', {}, rows.map((row) => createElement('tr', {}, row.map((cell) => (typeof cell === 'string' ? createElement('td', { text: cell, title: cell }) : createElement('td', {}, [cell])))))),
  ]);
}
