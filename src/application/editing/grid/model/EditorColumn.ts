export interface EditorColumn {
  readonly name: string;
  readonly isNullable: boolean;
  readonly isEditable: boolean;
  readonly hasDefault: boolean;
  readonly isPrimaryKey: boolean;
}
