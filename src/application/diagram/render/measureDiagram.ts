import type { DiagramModel, DiagramPositions } from '../model/DiagramModel';

export function measureDiagram(model: DiagramModel, positions: DiagramPositions): { left: number; top: number; right: number; bottom: number } {
  const placed = model.tables.filter((table) => positions[table.name]);
  if (placed.length === 0) {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }
  return {
    left: Math.min(...placed.map((table) => positions[table.name].x)),
    top: Math.min(...placed.map((table) => positions[table.name].y)),
    right: Math.max(...placed.map((table) => positions[table.name].x + table.width)),
    bottom: Math.max(...placed.map((table) => positions[table.name].y + table.height)),
  };
}
