import type { DiagramPoint, DiagramTable } from './DiagramModel';

export interface EdgeAnchor {
  readonly table: DiagramTable;
  readonly origin: DiagramPoint;
  readonly y: number;
}
