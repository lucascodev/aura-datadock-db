import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ConnectionManager } from '../core/ConnectionManager';
import { describeSchema } from '../core/describeSchema';
import { classifyQuery } from '../core/classifyQuery';
import { isReachable, type ConnectionTarget } from '../domain/ConnectionTarget';
import { ContainerDiscovery } from '../docker/ContainerDiscovery';
import { DockerClient } from '../docker/DockerClient';
import { resolveDockerEndpoint } from '../docker/resolveDockerEndpoint';
import { formatValue } from '../ui/results/renderResultsHtml';

const MAX_ROWS = Number(process.env.DATADOCK_MAX_ROWS ?? 200);
const MAX_RESPONSE_CHARS = 60_000;

const docker = new DockerClient(resolveDockerEndpoint(process.env.DATADOCK_DOCKER_HOST));
const connections = new ConnectionManager(
  new ContainerDiscovery(docker),
  { get: async () => undefined },
  { readOnly: () => true },
);

const server = new McpServer({ name: 'aura-datadock', version: '0.1.0' });

server.tool(
  'list_databases',
  'Lists databases running in local Docker containers (Postgres, MySQL, MariaDB) and whether they can be queried.',
  {},
  async () => {
    const targets = await connections.refresh();
    const summary = targets.map((target) => ({
      container: target.containerName,
      engine: target.kind,
      image: target.image,
      database: target.database ?? null,
      queryable: isReachable(target) && target.password !== undefined,
      note: !isReachable(target)
        ? 'Database port is not published to the host'
        : target.password === undefined
          ? 'Password is not available from the container environment'
          : undefined,
    }));
    return text(JSON.stringify(summary, null, 2));
  },
);

server.tool(
  'describe_schema',
  'Returns tables and columns of a container database. Use it before writing queries.',
  {
    container: z.string().describe('Container name from list_databases'),
    namespace: z.string().optional().describe('Schema (Postgres) or database (MySQL) to restrict the output'),
  },
  async ({ container, namespace }) => {
    const target = await requireTarget(container);
    const adapter = await connections.getAdapter(target.id);
    return text(await describeSchema(adapter, { maxTables: 200, namespace }));
  },
);

server.tool(
  'run_query',
  `Runs a read-only SQL query (SELECT, WITH, SHOW, EXPLAIN) and returns up to ${MAX_ROWS} rows as JSON. Writes are rejected.`,
  {
    container: z.string().describe('Container name from list_databases'),
    sql: z.string().describe('SQL in the dialect of the container engine'),
  },
  async ({ container, sql }) => {
    const classification = classifyQuery(sql);
    if (classification.risk !== 'read') {
      return error(`Rejected: only read-only queries are allowed through MCP. ${classification.reasons.join('; ')}`);
    }

    const target = await requireTarget(container);
    const adapter = await connections.getAdapter(target.id);
    const result = await adapter.runQuery(sql, MAX_ROWS);
    const rows = result.rows.map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === null ? null : formatValue(value)])),
    );
    const payload = JSON.stringify({ columns: result.columns, rows, truncated: result.truncated }, null, 2);
    return text(payload.length > MAX_RESPONSE_CHARS ? `${payload.slice(0, MAX_RESPONSE_CHARS)}\n... output truncated` : payload);
  },
);

async function requireTarget(name: string): Promise<ConnectionTarget> {
  if (connections.getTargets().length === 0) {
    await connections.refresh();
  }
  const target = connections.findByName(name);
  if (!target) {
    throw new Error(`Container "${name}" not found. Call list_databases first.`);
  }
  return target;
}

function text(value: string) {
  return { content: [{ type: 'text' as const, text: value }] };
}

function error(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error('Aura DataDock MCP server ready');
}

const shutdown = async () => {
  await connections.closeAll();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((cause) => {
  console.error(cause);
  process.exit(1);
});
