import type { DiagramEdge } from '../../../../application/diagram/model/DiagramModel';
import { relatedEdges } from './relatedEdges';

export function relatedTableNames(edges: readonly DiagramEdge[], tableName: string): Set<string> {
  return new Set([tableName, ...relatedEdges(edges, tableName).flatMap((edge) => [edge.childTable, edge.parentTable])]);
}
