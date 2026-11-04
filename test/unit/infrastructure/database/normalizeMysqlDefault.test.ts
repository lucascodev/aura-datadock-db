import { describe, expect, it } from 'vitest';
import { normalizeMysqlDefault } from '../../../../src/infrastructure/database/mysql/adapter/normalizeMysqlDefault';

describe('normalizeMysqlDefault', () => {
  it.each([
    [null, '', undefined],
    ['NULL', '', undefined],
    ['pending', '', "'pending'"],
    ["it's", '', "'it''s'"],
    ['a\\b', '', "'a\\\\b'"],
    ['10', '', '10'],
    ['-1.5', '', '-1.5'],
    ['CURRENT_TIMESTAMP', 'DEFAULT_GENERATED', 'CURRENT_TIMESTAMP'],
    ['current_timestamp()', '', 'current_timestamp()'],
    ["'quoted'", '', "'quoted'"],
  ])('turns %s with extra "%s" into %s', (value, extra, expected) => {
    expect(normalizeMysqlDefault(value, extra)).toBe(expected);
  });
});
