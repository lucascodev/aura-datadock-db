export interface L10nCatalog {
  readonly locale: string;
  readonly messages?: Readonly<Record<string, string>>;
}
