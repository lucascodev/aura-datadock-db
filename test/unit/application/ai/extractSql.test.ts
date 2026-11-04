import { describe, expect, it } from 'vitest';
import { extractSql } from '../../../../src/application/ai/prompts/extractSql';

describe('extractSql', () => {
  it('removes markdown fences', () => {
    expect(extractSql('Here it is:\n```sql\nSELECT 1;\n```')).toBe('SELECT 1;');
  });

  it('keeps plain answers', () => {
    expect(extractSql('  SELECT 1;  ')).toBe('SELECT 1;');
  });
});
