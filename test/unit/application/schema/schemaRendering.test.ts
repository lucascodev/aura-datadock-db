import { describe, expect, it } from 'vitest';
import { buildRelationships } from '../../../../src/application/schema/relationships/buildRelationships';
import { renderDbml } from '../../../../src/application/schema/rendering/renderDbml';
import { renderDdl } from '../../../../src/application/schema/rendering/renderDdl';
import { renderMermaidEr } from '../../../../src/application/schema/rendering/renderMermaidEr';
import { SchemaCache } from '../../../../src/application/schema/loading/SchemaCache';
import { SCHEMA_EXPORT_FORMATS } from '../../../../src/application/schema/constants/schemaExportFormats';
import { describeSchema } from '../../../../src/application/schema/loading/describeSchema';
import type { NamespaceSchema } from '../../../../src/domain/schema/model/NamespaceSchema';
import { shopSchema } from '../../../fixtures/shopSchema';

describe('buildRelationships', () => {
  const relationships = buildRelationships(shopSchema);
  const byName = (name: string) => relationships.find((relationship) => relationship.name === name);

  it('derives one-to-many from a plain foreign key', () => {
    expect(byName('orders_customer_fkey')).toMatchObject({ childTable: 'orders', parentTable: 'customers', cardinality: 'one-to-many' });
  });

  it('derives one-to-one when the foreign key is also the primary key', () => {
    expect(byName('profiles_customer_fkey')?.cardinality).toBe('one-to-one');
  });

  it('marks the parent optional when the foreign key is nullable', () => {
    expect(byName('orders_customer_fkey')?.isParentOptional).toBe(true);
    expect(byName('profiles_customer_fkey')?.isParentOptional).toBe(false);
  });

  it('does not treat a column of a composite key as unique', () => {
    expect(byName('items_order_fkey')?.cardinality).toBe('one-to-many');
  });

  it('keeps self references', () => {
    expect(byName('customers_referred_by_fkey')).toMatchObject({ childTable: 'customers', parentTable: 'customers' });
  });

  it('leaves out references to other namespaces', () => {
    expect(byName('orders_warehouse_fkey')).toBeUndefined();
  });
});

describe('renderDdl', () => {
  const ddl = renderDdl(shopSchema);

  it('creates tables with types, nullability, defaults and identity', () => {
    expect(ddl).toContain('CREATE TABLE "public"."customers" (');
    expect(ddl).toContain('"id" integer NOT NULL GENERATED ALWAYS AS IDENTITY');
    expect(ddl).toContain(`"status" text NOT NULL DEFAULT 'pending'::text`);
    expect(ddl).toContain('"email" text,');
  });

  it('declares composite primary keys in order', () => {
    expect(ddl).toContain('PRIMARY KEY ("order_id", "product_id")');
  });

  it('creates the sequences used by defaults before the tables', () => {
    expect(ddl.indexOf('CREATE SEQUENCE IF NOT EXISTS orders_id_seq;')).toBeLessThan(ddl.indexOf('CREATE TABLE'));
  });

  it('adds foreign keys after every table, so cycles and any order work', () => {
    const lastTable = ddl.lastIndexOf('CREATE TABLE');
    expect(ddl.indexOf('ALTER TABLE')).toBeGreaterThan(lastTable);
    expect(ddl).toContain('REFERENCES "logistics"."warehouses" ("id")');
    expect(ddl).toContain('ON DELETE CASCADE');
  });

  it('uses the stored index definition when there is one and builds it otherwise', () => {
    expect(ddl).toContain('CREATE INDEX orders_status_idx ON public.orders USING btree (status);');
    expect(ddl).toContain('CREATE UNIQUE INDEX "customers_email_key" ON "public"."customers" ("email");');
    expect(ddl).not.toContain('customers_pkey');
  });

  it('renders views after tables with a single terminator', () => {
    expect(ddl).toContain(`CREATE VIEW "public"."paid_orders" AS\nSELECT id FROM orders WHERE status = 'paid';`);
    expect(ddl).not.toContain(';;');
    expect(ddl.indexOf('CREATE VIEW')).toBeGreaterThan(ddl.lastIndexOf('CREATE TABLE'));
  });

  it('can be limited to selected tables', () => {
    const only = renderDdl(shopSchema, { tableNames: ['products'] });
    expect(only).toContain('"products"');
    expect(only).not.toContain('"customers"');
  });

  it('quotes with backticks for MySQL', () => {
    const mysql: NamespaceSchema = { ...shopSchema, kind: 'mysql' };
    expect(renderDdl(mysql)).toContain('CREATE TABLE `public`.`products`');
  });
});

describe('renderMermaidEr', () => {
  const mermaid = renderMermaidEr(shopSchema);

  it('starts with the diagram type', () => {
    expect(mermaid.startsWith('erDiagram\n')).toBe(true);
  });

  it('renders cardinality from the parent to the child', () => {
    expect(mermaid).toContain('customers |o--o{ orders : "customer_id"');
    expect(mermaid).toContain('customers ||--o| customer_profiles : "customer_id"');
  });

  it('turns types into a single word and marks keys', () => {
    expect(mermaid).toContain('character_varying_120 name');
    expect(mermaid).toContain('integer id PK');
    expect(mermaid).toContain('text email UK');
    expect(mermaid).toContain('integer customer_id PK, FK');
  });

  it('quotes entity names that are not plain words', () => {
    const schema: NamespaceSchema = { ...shopSchema, tables: [{ ...shopSchema.tables[0], name: 'audit log' }] };
    expect(renderMermaidEr(schema)).toContain('"audit log" {');
  });
});

describe('renderDbml', () => {
  const dbml = renderDbml(shopSchema);

  it('renders tables with settings and quoted complex types', () => {
    expect(dbml).toContain('Table public.customers {');
    expect(dbml).toContain('id integer [pk, not null, increment]');
    expect(dbml).toContain('name "character varying(120)" [not null]');
  });

  it('renders composite keys as an index', () => {
    expect(dbml).toContain('(order_id, product_id) [pk]');
  });

  it('renders references with the right operator', () => {
    expect(dbml).toContain('Ref: public.orders.customer_id > public.customers.id');
    expect(dbml).toContain('Ref: public.customer_profiles.customer_id - public.customers.id [delete: cascade]');
  });

  it('renders literal defaults as strings and expressions in backticks', () => {
    expect(dbml).toContain(`default: 'pending'`);
    expect(dbml).toContain("default: `nextval('orders_id_seq'::regclass)`");
  });

  it('leaves views out', () => {
    expect(dbml).not.toContain('paid_orders');
  });
});

describe('SCHEMA_EXPORT_FORMATS', () => {
  it('renders every format', () => {
    for (const format of SCHEMA_EXPORT_FORMATS) {
      expect(format.render(shopSchema).length).toBeGreaterThan(0);
    }
  });
});

describe('SchemaCache', () => {
  const schema: NamespaceSchema = { kind: 'postgres', namespace: 'public', tables: [] };

  it('loads once while fresh', async () => {
    let loads = 0;
    const cache = new SchemaCache(async () => {
      loads++;
      return schema;
    });
    await cache.get('a', 'public');
    await cache.get('a', 'public');
    expect(loads).toBe(1);
  });

  it('reloads after the time to live', async () => {
    let loads = 0;
    let now = 0;
    const cache = new SchemaCache(async () => {
      loads++;
      return schema;
    }, 100, () => now);
    await cache.get('a', 'public');
    now = 101;
    await cache.get('a', 'public');
    expect(loads).toBe(2);
  });

  it('invalidates only the given target', async () => {
    const loaded: string[] = [];
    const cache = new SchemaCache(async (targetId) => {
      loaded.push(targetId);
      return schema;
    });
    await cache.get('a', 'public');
    await cache.get('b', 'public');
    cache.invalidate('a');
    await cache.get('a', 'public');
    await cache.get('b', 'public');
    expect(loaded).toEqual(['a', 'b', 'a']);
  });

  it('does not keep failures', async () => {
    let attempts = 0;
    const cache = new SchemaCache(async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error('down');
      }
      return schema;
    });
    await expect(cache.get('a', 'public')).rejects.toThrow('down');
    await expect(cache.get('a', 'public')).resolves.toBe(schema);
  });
});

describe('describeSchema', () => {
  const adapter = { listNamespaces: async () => ['public'], readSchema: async () => shopSchema };

  it('lists columns and foreign keys', async () => {
    const description = await describeSchema(adapter, { maxTables: 50 });
    expect(description).toContain('public.products(id integer PK NOT NULL, title text NOT NULL)');
    expect(description).toContain('FK(customer_id) -> public.customers(id)');
    expect(description).toContain('FK(warehouse_id) -> logistics.warehouses(id)');
  });

  it('respects the table limit', async () => {
    const description = await describeSchema(adapter, { maxTables: 2 });
    expect(description.split('\n')).toHaveLength(3);
    expect(description).toContain('more tables omitted');
  });
});
