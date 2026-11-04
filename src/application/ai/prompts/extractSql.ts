export function extractSql(answer: string): string {
  const fenced = /```(?:sql)?\s*([\s\S]*?)```/i.exec(answer);
  return (fenced ? fenced[1] : answer).trim();
}
