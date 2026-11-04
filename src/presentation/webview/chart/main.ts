import { useL10nCatalog } from '../../../domain/i18n/translation/l10n';
import { readL10nCatalog } from '../shared/host/readL10nCatalog';
import { EChartsRenderer } from './echarts/EChartsRenderer';
import { type ChartModule } from './ports/ChartRenderer';
import { CHART_MODULE_GLOBAL } from './constants/chartModuleGlobal';

useL10nCatalog(readL10nCatalog());

const chartModule: ChartModule = { createRenderer: (element) => new EChartsRenderer(element) };

Object.assign(window, { [CHART_MODULE_GLOBAL]: chartModule });
