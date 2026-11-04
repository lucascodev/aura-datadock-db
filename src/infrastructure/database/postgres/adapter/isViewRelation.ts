const VIEW_RELATION_KINDS = new Set(['v', 'm']);

export function isViewRelation(relationKind: string): boolean {
  return VIEW_RELATION_KINDS.has(relationKind);
}
