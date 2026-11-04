import { CHART_MODULE_GLOBAL, type ChartModule } from '../../chart/ports/ChartRenderer';
import { l10n } from '../../../../domain/i18n/translation/l10n';

const ownNonce = (document.currentScript as HTMLScriptElement | null)?.nonce ?? '';

let loading: Promise<ChartModule> | undefined;

function readModule(): ChartModule | undefined {
  return (window as unknown as Record<string, ChartModule | undefined>)[CHART_MODULE_GLOBAL];
}

function loadScript(source: string): Promise<ChartModule> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.nonce = ownNonce;
    script.src = source;
    script.onload = () => {
      const chartModule = readModule();
      if (chartModule) {
        resolve(chartModule);
      } else {
        reject(new Error(l10n.t('The chart library loaded, but did not start.')));
      }
    };
    script.onerror = () => reject(new Error(l10n.t('The chart library could not be loaded.')));
    document.body.append(script);
  });
}

export function loadChartModule(): Promise<ChartModule> {
  const source = document.body.dataset.chartScript;
  if (!source) {
    return Promise.reject(new Error(l10n.t('The chart library was not found in this panel.')));
  }
  loading ??= loadScript(source).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
