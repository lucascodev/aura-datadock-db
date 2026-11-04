import { l10n } from '../../../../domain/i18n/translation/l10n';
import { Tabs } from '../../shared/dom/Tabs';

type TableTabId = 'properties' | 'data' | 'diagram';

interface ShownAware {
  readonly element: HTMLElement;
  handleShown(): void;
}

export function buildTableTabs(propertiesElement: HTMLElement, dataTab: HTMLElement, diagramTab: ShownAware): Tabs<TableTabId> {
  const tableTabs = new Tabs<TableTabId>(
    [
      { id: 'properties', label: l10n.t('Properties'), content: [propertiesElement] },
      { id: 'data', label: l10n.t('Data'), content: [dataTab] },
      { id: 'diagram', label: l10n.t('Diagram'), content: [diagramTab.element] },
    ],
    (id) => {
      if (id === 'diagram') {
        diagramTab.handleShown();
      }
    },
  );
  tableTabs.select('data');
  return tableTabs;
}
