import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ConnectionManager } from '../application/connections/lifecycle/ConnectionManager';
import { describeSchema } from '../application/schema/loading/describeSchema';
import { classifyQuery } from '../application/query/analysis/classifyQuery';
import { formatValue } from '../application/format/formatValue';
import { uniqueColumnNames } from '../application/format/uniqueColumnNames';
import { scanStatements } from '../application/query/analysis/splitStatements';
import { isReachable, type ConnectionTarget } from '../domain/connection/ConnectionTarget';
import { ContainerDiscovery } from '../infrastructure/docker/discovery/ContainerDiscovery';
import { DockerClient } from '../infrastructure/docker/client/DockerClient';
import { resolveDockerEndpoint } from '../infrastructure/docker/client/resolveDockerEndpoint';
import { openAdapter } from '../infrastructure/ssh/openAdapter';

const MAX_ROWS = Number(process.env.DATADOCK_MAX_ROWS ?? 200);
const MAX_RESPONSE_CHARS = 60_000;

const docker = new DockerClient(resolveDockerEndpoint(process.env.DATADOCK_DOCKER_HOST));
const connections = new ConnectionManager(
  [new ContainerDiscovery(docker)],
  { get: async () => undefined },
  { readOnly: () => true, openAdapter },
);

const server = new McpServer({ name: 'aura-datadock-db', version: '0.1.0' });

server.tool(
  'list_databases',
  'Lists databases running in local Docker containers (Postgres, MySQL, MariaDB) and whether they can be queried.',
  {},
  async () => {
    const targets = await connections.refresh();
    const dockerError = connections.getSourceError('docker');
    if (dockerError) {
      return error(`Docker is not available: ${dockerError}`);
    }
    const summary = targets.map((target) => ({
      container: target.name,
      engine: target.kind,
      image: target.detail,
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
  'Returns tables, columns and foreign keys of a container database. Use it before writing queries.',
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
    const target = await requireTarget(container);
    const classification = classifyQuery(sql, target.kind);
    if (classification.risk !== 'read') {
      return error(`Rejected: only read-only queries are allowed through MCP. ${classification.reasons.join('; ')}`);
    }
    if (classification.statementCount !== 1) {
      return error('Rejected: send one statement at a time.');
    }

    const [statement] = scanStatements(sql, target.kind);
    const adapter = await connections.getAdapter(target.id);
    const result = await adapter.runQuery(statement.text, MAX_ROWS);
    const columns = uniqueColumnNames(result.columns);
    const rows = result.rows.map((row) =>
      Object.fromEntries(columns.map((column, index) => [column, row[index] === null ? null : formatValue(row[index])])),
    );
    const payload = JSON.stringify({ columns, rows, truncated: result.truncated }, null, 2);
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
  console.error('Aura DataDock DB MCP server ready');
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
