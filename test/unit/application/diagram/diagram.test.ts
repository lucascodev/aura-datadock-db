import { describe, expect, it } from 'vitest';
import { buildDiagram } from '../../../../src/application/diagram/model/buildDiagram';
import type { DiagramModel, DiagramPositions } from '../../../../src/application/diagram/model/DiagramModel';
import { EXPORT_PALETTE } from '../../../../src/application/diagram/render/exportPalette';
import { layoutDiagram } from '../../../../src/application/diagram/layout/layoutDiagram';
import { measureDiagram, renderDiagramSvg } from '../../../../src/application/diagram/render/renderDiagramSvg';
import { routeEdge } from '../../../../src/application/diagram/layout/routeEdge';
import type { NamespaceSchema } from '../../../../src/domain/schema/NamespaceSchema';
import { shopSchema } from '../../../fixtures/shopSchema';

const tableMap = (model: DiagramModel) => new Map(model.tables.map((table) => [table.name, table]));

describe('buildDiagram', () => {
  const columnsOf = (model: DiagramModel, name: string) => model.tables.find((table) => table.name === name)?.columns.map((column) => column.name);

  it('shows every column in full detail', () => {
    expect(columnsOf(buildDiagram(shopSchema, 'full'), 'customers')).toEqual(['id', 'name', 'email', 'referred_by']);
  });

  it('shows only key columns in keys detail', () => {
    expect(columnsOf(buildDiagram(shopSchema, 'keys'), 'orders')).toEqual(['id', 'customer_id', 'warehouse_id']);
  });

  it('keeps non-key columns that are referenced by a foreign key in keys detail', () => {
    const schema: NamespaceSchema = {
      kind: 'postgres',
      namespace: 'public',
      tables: [
        { namespace: 'public', name: 'a', kind: 'table', primaryKey: [], foreignKeys: [], indexes: [], columns: [{ name: 'code', dataType: 'text', nullable: false, isPrimaryKey: false }, { name: 'other', dataType: 'text', nullable: true, isPrimaryKey: false }] },
        { namespace: 'public', name: 'b', kind: 'table', primaryKey: [], indexes: [], columns: [{ name: 'a_code', dataType: 'text', nullable: false, isPrimaryKey: false }], foreignKeys: [{ name: 'fk', columns: ['a_code'], referencedNamespace: 'public', referencedTable: 'a', referencedColumns: ['code'] }] },
      ],
    };
    expect(columnsOf(buildDiagram(schema, 'keys'), 'a')).toEqual(['code']);
  });

  it('shows no columns in entities detail and anchors edges to the header', () => {
    const model = buildDiagram(shopSchema, 'entities');
    expect(model.tables.every((table) => table.columns.length === 0)).toBe(true);
    expect(model.edges.every((edge) => edge.childColumn === undefined && edge.parentColumn === undefined)).toBe(true);
  });

  it('marks a foreign key to another namespace without drawing an edge', () => {
    const model = buildDiagram(shopSchema, 'full');
    const column = model.tables.find((table) => table.name === 'orders')?.columns.find((candidate) => candidate.name === 'warehouse_id');
    expect(column).toMatchObject({ isForeignKey: true, foreignTarget: 'logistics.warehouses' });
    expect(model.edges.some((edge) => edge.name === 'orders_warehouse_fkey')).toBe(false);
  });

  it('grows the table with its columns', () => {
    const model = buildDiagram(shopSchema, 'full');
    const customers = model.tables.find((table) => table.name === 'customers');
    const products = model.tables.find((table) => table.name === 'products');
    expect(customers?.height).toBeGreaterThan(products?.height ?? 0);
  });
});

describe('layoutDiagram', () => {
  const model = buildDiagram(shopSchema, 'full');
  const positions = layoutDiagram(model);

  it('places every table', () => {
    expect(Object.keys(positions).sort()).toEqual(model.tables.map((table) => table.name).sort());
  });

  it('puts parents to the left of their children', () => {
    expect(positions.customers.x).toBeLessThan(positions.orders.x);
    expect(positions.orders.x).toBeLessThan(positions.order_items.x);
  });

  it('never overlaps tables', () => {
    expectNoOverlap(model, positions);
  });

  it('keeps a parent next to its only child, so the line does not cross other tables', () => {
    expect(positions.products.x).toBe(positions.orders.x);
    expect(positions.products.x).toBeLessThan(positions.order_items.x);
  });

  it('puts tables without relationships below the connected ones', () => {
    const connectedBottom = Math.max(...['customers', 'orders', 'order_items', 'products', 'customer_profiles'].map((name) => positions[name].y + (tableMap(model).get(name)?.height ?? 0)));
    expect(positions.audit_log.y).toBeGreaterThan(connectedBottom);
  });

  it('survives foreign key cycles', () => {
    const cycle: DiagramModel = {
      namespace: 'public',
      detail: 'entities',
      tables: ['a', 'b', 'c'].map((name) => ({ name, kind: 'table', columns: [], width: 150, height: 32 })),
      edges: [
        { id: '1', name: '1', childTable: 'a', parentTable: 'b', cardinality: 'one-to-many', isParentOptional: false },
        { id: '2', name: '2', childTable: 'b', parentTable: 'c', cardinality: 'one-to-many', isParentOptional: false },
        { id: '3', name: '3', childTable: 'c', parentTable: 'a', cardinality: 'one-to-many', isParentOptional: false },
      ],
    };
    const result = layoutDiagram(cycle);
    expect(Object.keys(result)).toHaveLength(3);
    expectNoOverlap(cycle, result);
  });

  it('keeps a large schema free of overlaps', () => {
    const tables = Array.from({ length: 300 }, (_, index) => ({ name: `t${index}`, kind: 'table' as const, columns: [], width: 150 + (index % 7) * 20, height: 32 + (index % 11) * 22 }));
    const edges = tables.slice(1).map((table, index) => ({ id: table.name, name: table.name, childTable: table.name, parentTable: `t${Math.floor(index / 8)}`, cardinality: 'one-to-many' as const, isParentOptional: false }));
    const large: DiagramModel = { namespace: 'public', detail: 'entities', tables, edges };
    expectNoOverlap(large, layoutDiagram(large));
  });

  it('handles an empty schema', () => {
    expect(layoutDiagram({ namespace: 'public', detail: 'full', tables: [], edges: [] })).toEqual({});
  });
});

function expectNoOverlap(model: DiagramModel, positions: DiagramPositions): void {
  const boxes = model.tables.map((table) => ({ name: table.name, ...positions[table.name], width: table.width, height: table.height }));
  for (const [index, a] of boxes.entries()) {
    for (const b of boxes.slice(index + 1)) {
      const isSeparate = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
      expect(isSeparate, `${a.name} overlaps ${b.name}`).toBe(true);
    }
  }
}

describe('routeEdge', () => {
  const model = buildDiagram(shopSchema, 'full');
  const tables = tableMap(model);
  const edge = (name: string) => {
    const found = model.edges.find((candidate) => candidate.name === name);
    if (!found) {
      throw new Error(`Missing edge ${name}`);
    }
    return found;
  };

  it('leaves the left side of a child placed to the right of its parent, at the column row', () => {
    const positions = { customers: { x: 0, y: 0 }, orders: { x: 600, y: 100 } };
    const path = routeEdge(edge('orders_customer_fkey'), tables, positions);
    expect(path?.startsWith('M 600 ')).toBe(true);
    expect(path).toContain(`${tables.get('customers')?.width} 43`);
  });

  it('uses the same side when tables are stacked', () => {
    const positions = { customers: { x: 0, y: 0 }, orders: { x: 10, y: 300 } };
    const path = routeEdge(edge('orders_customer_fkey'), tables, positions);
    expect(path?.startsWith(`M ${10 + (tables.get('orders')?.width ?? 0)} `)).toBe(true);
  });

  it('draws self references as a loop on the right', () => {
    const positions = { customers: { x: 0, y: 0 } };
    const width = tables.get('customers')?.width ?? 0;
    const path = routeEdge(edge('customers_referred_by_fkey'), tables, positions);
    expect(path?.startsWith(`M ${width} `)).toBe(true);
    expect(path?.endsWith(`${width} 43`)).toBe(true);
  });

  it('keeps both ends of a self reference inside the header when columns are hidden', () => {
    const entities = buildDiagram(shopSchema, 'entities');
    const selfEdge = entities.edges.find((candidate) => candidate.name === 'customers_referred_by_fkey');
    const customers = entities.tables.find((table) => table.name === 'customers');
    const path = selfEdge && routeEdge(selfEdge, tableMap(entities), { customers: { x: 0, y: 0 } });
    const endpoints = path?.match(/^M \S+ (\S+) .* (\S+)$/);
    expect(Number(endpoints?.[1])).toBeGreaterThanOrEqual(0);
    expect(Number(endpoints?.[2])).toBeLessThanOrEqual(customers?.height ?? 0);
    expect(endpoints?.[1]).not.toBe(endpoints?.[2]);
  });

  it('returns undefined when a table has no position', () => {
    expect(routeEdge(edge('orders_customer_fkey'), tables, { customers: { x: 0, y: 0 } })).toBeUndefined();
  });
});

describe('renderDiagramSvg', () => {
  const model = buildDiagram(shopSchema, 'full');
  const positions = layoutDiagram(model);
  const svg = renderDiagramSvg(model, positions, EXPORT_PALETTE);

  it('is a standalone document sized to the content', () => {
    const bounds = measureDiagram(model, positions);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain(`width="${bounds.right - bounds.left + 64}"`);
  });

  it('renders every table and edge', () => {
    for (const table of model.tables) {
      expect(svg).toContain(`data-table="${table.name}"`);
    }
    expect(svg.match(/data-edge=/g)).toHaveLength(model.edges.length);
  });

  it('uses crow foot markers according to the cardinality', () => {
    expect(svg).toMatch(/data-edge="orders\.orders_customer_fkey"[^>]*marker-start="url\(#dd-zero-many\)"[^>]*marker-end="url\(#dd-zero-one\)"/);
    expect(svg).toMatch(/data-edge="customer_profiles\.profiles_customer_fkey"[^>]*marker-start="url\(#dd-zero-one\)"[^>]*marker-end="url\(#dd-one\)"/);
  });

  it('escapes names, so a table name cannot inject markup', () => {
    const hostile: NamespaceSchema = {
      kind: 'postgres',
      namespace: 'public',
      tables: [{ namespace: 'public', name: '<img src=x onerror=alert(1)>', kind: 'table', primaryKey: [], foreignKeys: [], indexes: [], columns: [{ name: '"><script>', dataType: 'text', nullable: true, isPrimaryKey: false }] }],
    };
    const hostileModel = buildDiagram(hostile, 'full');
    const output = renderDiagramSvg(hostileModel, layoutDiagram(hostileModel), EXPORT_PALETTE);
    expect(output).not.toContain('<img');
    expect(output).not.toContain('<script');
  });

  it('marks views in the header', () => {
    expect(svg).toContain('paid_orders (view)');
  });
});
