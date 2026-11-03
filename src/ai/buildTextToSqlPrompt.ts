import type { DatabaseKind } from '../domain/DatabaseKind';
import type { AiRequest } from './AiProvider';

const DIALECT: Record<DatabaseKind, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
};

export function buildTextToSqlPrompt(kind: DatabaseKind, schema: string, question: string): Omit<AiRequest, 'signal'> {
  return {
    system: [
      `You write ${DIALECT[kind]} queries for a developer.`,
      'Use only the tables and columns listed in the schema.',
      'Prefer read-only SELECT statements unless the developer explicitly asks to change data.',
      'Answer with the SQL only, no explanations and no markdown fences.',
      'If the request cannot be answered with the schema, answer with a single SQL comment explaining why.',
    ].join('\n'),
    prompt: `Schema:\n${schema}\n\nRequest:\n${question}`,
  };
}

export function extractSql(answer: string): string {
  const fenced = /```(?:sql)?\s*([\s\S]*?)```/i.exec(answer);
  return (fenced ? fenced[1] : answer).trim();
}
