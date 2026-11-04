import type { ChartKind } from './ChartKind';

type XRole = 'any' | 'number' | 'none';

type YRole = 'many' | 'one' | 'none';

type GroupRole = 'optional' | 'required' | 'none';

export interface ChartKindDefinition {
  readonly id: ChartKind;
  readonly label: () => string;
  readonly x: XRole;
  readonly y: YRole;
  readonly group: GroupRole;
  readonly groupLabel: () => string;
}
