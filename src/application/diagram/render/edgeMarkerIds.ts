import type { DiagramEdge } from '../model/DiagramModel';

export function edgeMarkerIds(edge: DiagramEdge): { start: string; end: string } {
  return {
    start: edge.cardinality === 'one-to-one' ? 'dd-zero-one' : 'dd-zero-many',
    end: edge.isParentOptional ? 'dd-zero-one' : 'dd-one',
  };
}
