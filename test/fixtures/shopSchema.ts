import type { NamespaceSchema } from '../../src/domain/schema/model/NamespaceSchema';
import type { TableColumn } from '../../src/domain/schema/model/TableColumn';
import type { TableDefinition } from '../../src/domain/schema/model/TableDefinition';

function column(name: string, dataType: string, overrides: Partial<TableColumn> = {}): TableColumn {
  return { name, dataType, nullable: false, isPrimaryKey: false, ...overrides };
}

function table(name: string, definition: Partial<TableDefinition>): TableDefinition {
  return { namespace: 'public', name, kind: 'table', columns: [], primaryKey: [], foreignKeys: [], indexes: [], ...definition };
}

export const customers = table('customers', {
  columns: [
    column('id', 'integer', { isPrimaryKey: true, generationClause: 'GENERATED ALWAYS AS IDENTITY' }),
    column('name', 'character varying(120)'),
    column('email', 'text', { nullable: true }),
    column('referred_by', 'integer', { nullable: true }),
  ],
  primaryKey: ['id'],
  foreignKeys: [
    { name: 'customers_referred_by_fkey', columns: ['referred_by'], referencedNamespace: 'public', referencedTable: 'customers', referencedColumns: ['id'], onDelete: 'SET NULL' },
  ],
  indexes: [
    { name: 'customers_pkey', columns: ['id'], isUnique: true, isPrimary: true },
    { name: 'customers_email_key', columns: ['email'], isUnique: true, isPrimary: false },
  ],
});

export const profiles = table('customer_profiles', {
  columns: [column('customer_id', 'integer', { isPrimaryKey: true }), column('bio', 'text', { nullable: true })],
  primaryKey: ['customer_id'],
  foreignKeys: [
    { name: 'profiles_customer_fkey', columns: ['customer_id'], referencedNamespace: 'public', referencedTable: 'customers', referencedColumns: ['id'], onDelete: 'CASCADE' },
  ],
});

export const orders = table('orders', {
  columns: [
    column('id', 'integer', { isPrimaryKey: true, defaultValue: "nextval('orders_id_seq'::regclass)" }),
    column('customer_id', 'integer', { nullable: true }),
    column('status', 'text', { defaultValue: "'pending'::text" }),
    column('warehouse_id', 'integer', { nullable: true }),
  ],
  primaryKey: ['id'],
  foreignKeys: [
    { name: 'orders_customer_fkey', columns: ['customer_id'], referencedNamespace: 'public', referencedTable: 'customers', referencedColumns: ['id'] },
    { name: 'orders_warehouse_fkey', columns: ['warehouse_id'], referencedNamespace: 'logistics', referencedTable: 'warehouses', referencedColumns: ['id'] },
  ],
  indexes: [{ name: 'orders_status_idx', columns: ['status'], isUnique: false, isPrimary: false, definition: 'CREATE INDEX orders_status_idx ON public.orders USING btree (status)' }],
});

export const orderItems = table('order_items', {
  columns: [column('order_id', 'integer', { isPrimaryKey: true }), column('product_id', 'integer', { isPrimaryKey: true }), column('quantity', 'integer')],
  primaryKey: ['order_id', 'product_id'],
  foreignKeys: [
    { name: 'items_order_fkey', columns: ['order_id'], referencedNamespace: 'public', referencedTable: 'orders', referencedColumns: ['id'] },
    { name: 'items_product_fkey', columns: ['product_id'], referencedNamespace: 'public', referencedTable: 'products', referencedColumns: ['id'] },
  ],
});

export const products = table('products', {
  columns: [column('id', 'integer', { isPrimaryKey: true }), column('title', 'text')],
  primaryKey: ['id'],
});

export const auditLog = table('audit_log', {
  columns: [column('entry', 'text')],
});

export const paidOrders = table('paid_orders', {
  kind: 'view',
  columns: [column('id', 'integer', { nullable: true })],
  viewDefinition: "SELECT id FROM orders WHERE status = 'paid';",
});

export const shopSchema: NamespaceSchema = {
  kind: 'postgres',
  namespace: 'public',
  tables: [auditLog, customers, profiles, orderItems, orders, paidOrders, products],
};
