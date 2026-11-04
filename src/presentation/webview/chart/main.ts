import { useL10nCatalog } from '../../../domain/i18n/translation/l10n';
import { readL10nCatalog } from '../shared/readL10nCatalog';
import { EChartsRenderer } from './echarts/EChartsRenderer';
import { CHART_MODULE_GLOBAL, type ChartModule } from './ports/ChartRenderer';

useL10nCatalog(readL10nCatalog());

const chartModule: ChartModule = { createRenderer: (element) => new EChartsRenderer(element) };

Object.assign(window, { [CHART_MODULE_GLOBAL]: chartModule });
