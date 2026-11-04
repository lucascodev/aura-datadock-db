import type { DriverId } from '../../domain/driver/model/DriverId';
import { getDriver } from '../../drivers/catalog/driverCatalog';
import type { AiRequest } from './AiProvider';

export function buildTextToSqlPrompt(kind: DriverId, schema: string, question: string): Omit<AiRequest, 'signal'> {
  return {
    system: [
      `You write ${getDriver(kind).dialect.assistantName} queries for a developer.`,
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
