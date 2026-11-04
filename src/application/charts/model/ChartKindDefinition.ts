import type { ChartKind } from './ChartKind';

export type XRole = 'any' | 'number' | 'none';

export type YRole = 'many' | 'one' | 'none';

export type GroupRole = 'optional' | 'required' | 'none';

export interface ChartKindDefinition {
  readonly id: ChartKind;
  readonly label: () => string;
  readonly x: XRole;
  readonly y: YRole;
  readonly group: GroupRole;
  readonly groupLabel: () => string;
}
