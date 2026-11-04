import type { TableKind } from '../../../domain/schema/model/TableRef';
import type { RelationshipCardinality } from '../../schema/model/Relationship';

export type DiagramDetail = 'full' | 'keys' | 'entities';

export interface DiagramColumn {
  readonly name: string;
  readonly dataType: string;
  readonly isPrimaryKey: boolean;
  readonly isForeignKey: boolean;
  readonly isNullable: boolean;
  readonly foreignTarget?: string;
}

export interface DiagramTable {
  readonly name: string;
  readonly kind: TableKind;
  readonly columns: readonly DiagramColumn[];
  readonly width: number;
  readonly height: number;
}

export interface DiagramEdge {
  readonly id: string;
  readonly name: string;
  readonly childTable: string;
  readonly childColumn?: string;
  readonly parentTable: string;
  readonly parentColumn?: string;
  readonly cardinality: RelationshipCardinality;
  readonly isParentOptional: boolean;
}

export interface DiagramModel {
  readonly namespace: string;
  readonly detail: DiagramDetail;
  readonly tables: readonly DiagramTable[];
  readonly edges: readonly DiagramEdge[];
}

export interface DiagramPoint {
  readonly x: number;
  readonly y: number;
}

export type DiagramPositions = Readonly<Record<string, DiagramPoint>>;
