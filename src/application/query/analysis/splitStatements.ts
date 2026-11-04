import type { DriverId } from '../../../domain/driver/DriverId';
import type { SqlDialect } from '../../../domain/driver/SqlDialect';
import { getDriver } from '../../../drivers/catalog/driverCatalog';
import type { SqlStatement } from './SqlStatement';

const STRING_PLACEHOLDER = " '?' ";
const IDENTIFIER_PLACEHOLDER = ' _identifier_ ';
const DOLLAR_QUOTE_TAG = /^\$(?:[A-Za-z_]\w*)?\$/;
const WORD_CHARACTER = /\w/;

export function splitStatements(sql: string, kind?: DriverId): string[] {
  return scanStatements(sql, kind).map((statement) => statement.sanitized);
}

export function scanStatements(sql: string, kind?: DriverId): SqlStatement[] {
  return new SqlScanner(sql, kind ? getDriver(kind).dialect : undefined).scan();
}

class SqlScanner {
  private position = 0;
  private sanitized = '';
  private start?: number;
  private end = 0;
  private readonly statements: SqlStatement[] = [];

  constructor(
    private readonly sql: string,
    private readonly dialect?: SqlDialect,
  ) {}

  scan(): SqlStatement[] {
    while (this.position < this.sql.length) {
      this.consumeNext();
    }
    this.finishStatement(this.sql.length);
    return this.statements;
  }

  private consumeNext(): void {
    const char = this.sql[this.position];
    const next = this.sql[this.position + 1];
    const dollarTag = this.readDollarTag(char);

    if ((char === '-' && next === '-') || this.startsHashComment(char)) {
      this.skipComment('\n');
    } else if (char === '/' && next === '*') {
      this.skipComment('*/', 2);
    } else if (char === "'") {
      this.skipQuoted(char, STRING_PLACEHOLDER);
    } else if (char === '"' || char === '`') {
      this.skipQuoted(char, IDENTIFIER_PLACEHOLDER);
    } else if (dollarTag) {
      this.skipDollarQuoted(dollarTag);
    } else if (char === ';') {
      this.position++;
      this.finishStatement(this.position);
    } else {
      this.consumePlainCharacter(char);
    }
  }

  private startsHashComment(char: string): boolean {
    return char === '#' && (this.dialect?.hasHashComments ?? true);
  }

  private readDollarTag(char: string): string | undefined {
    if (char !== '$' || this.dialect?.hasDollarQuotes === false) {
      return undefined;
    }
    return DOLLAR_QUOTE_TAG.exec(this.sql.slice(this.position))?.[0];
  }

  private consumePlainCharacter(char: string): void {
    const from = this.position;
    this.sanitized += char;
    this.position++;
    if (char.trim().length > 0) {
      this.markSignificant(from);
    }
  }

  private skipComment(terminator: string, openingLength = 1): void {
    const end = this.sql.indexOf(terminator, this.position + openingLength);
    this.position = end === -1 ? this.sql.length : end + terminator.length;
    this.sanitized += ' ';
  }

  private skipDollarQuoted(tag: string): void {
    const from = this.position;
    const end = this.sql.indexOf(tag, this.position + tag.length);
    this.position = end === -1 ? this.sql.length : end + tag.length;
    this.sanitized += STRING_PLACEHOLDER;
    this.markSignificant(from);
  }

  private skipQuoted(quote: string, replacement: string): void {
    const from = this.position;
    const allowsBackslashEscape = this.allowsBackslashEscape(quote);
    this.position++;
    while (this.position < this.sql.length) {
      const char = this.sql[this.position];
      if (char === '\\' && allowsBackslashEscape) {
        this.position += 2;
      } else if (char === quote && this.sql[this.position + 1] === quote) {
        this.position += 2;
      } else if (char === quote) {
        this.position++;
        break;
      } else {
        this.position++;
      }
    }
    this.sanitized += replacement;
    this.markSignificant(from);
  }

  private allowsBackslashEscape(quote: string): boolean {
    if (this.dialect?.backslashEscapes === 'all-strings') {
      return quote !== '`';
    }
    if (quote !== "'") {
      return false;
    }
    return this.dialect?.backslashEscapes === 'escape-strings-only' ? this.isEscapeStringPrefix() : true;
  }

  private isEscapeStringPrefix(): boolean {
    const previous = this.sql[this.position - 1];
    const beforePrevious = this.sql[this.position - 2] ?? '';
    return (previous === 'E' || previous === 'e') && !WORD_CHARACTER.test(beforePrevious);
  }

  private markSignificant(from: number): void {
    this.start ??= from;
    this.end = this.position;
  }

  private finishStatement(terminatorEnd: number): void {
    const sanitized = this.sanitized.trim();
    if (sanitized.length > 0 && this.start !== undefined) {
      this.statements.push({
        text: this.sql.slice(this.start, this.end),
        sanitized,
        start: this.start,
        end: this.end,
        terminatorEnd,
      });
    }
    this.sanitized = '';
    this.start = undefined;
  }
}
