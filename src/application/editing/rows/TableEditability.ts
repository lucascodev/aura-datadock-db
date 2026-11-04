export interface TableEditability {
  readonly canInsert: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly notice?: string;
}
