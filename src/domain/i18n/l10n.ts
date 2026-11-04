export interface L10nCatalog {
  readonly locale: string;
  readonly messages?: Readonly<Record<string, string>>;
}

type L10nArgument = string | number | boolean;

const DEFAULT_CATALOG: L10nCatalog = { locale: 'en' };
const PLACEHOLDER = /\{(\d+)\}/g;

let catalog = DEFAULT_CATALOG;

export function useL10nCatalog(next: L10nCatalog): void {
  catalog = next;
}

export const l10n = {
  t(message: string, ...args: readonly L10nArgument[]): string {
    const template = catalog.messages?.[message] ?? message;
    return template.replace(PLACEHOLDER, (placeholder, index: string) => {
      const value = args[Number(index)];
      return value === undefined ? placeholder : String(value);
    });
  },
  locale(): string {
    return catalog.locale;
  },
};
