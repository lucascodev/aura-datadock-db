import type { DiagramEdge } from '../../../../application/diagram/model/DiagramModel';

export function relatedEdges(edges: readonly DiagramEdge[], tableName: string): DiagramEdge[] {
  return edges.filter((edge) => edge.childTable === tableName || edge.parentTable === tableName);
}

export function relatedTableNames(edges: readonly DiagramEdge[], tableName: string): Set<string> {
  return new Set([tableName, ...relatedEdges(edges, tableName).flatMap((edge) => [edge.childTable, edge.parentTable])]);
}
