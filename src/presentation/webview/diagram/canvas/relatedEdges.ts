import type { DiagramEdge } from '../../../../application/diagram/model/DiagramModel';

export function relatedEdges(edges: readonly DiagramEdge[], tableName: string): DiagramEdge[] {
  return edges.filter((edge) => edge.childTable === tableName || edge.parentTable === tableName);
}
