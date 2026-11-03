const STRING_PLACEHOLDER = " '?' ";
const IDENTIFIER_PLACEHOLDER = ' _identifier_ ';
const DOLLAR_QUOTE_TAG = /^\$[A-Za-z_]*\$/;

export function splitStatements(sql: string): string[] {
  return new SqlScanner(sql).scan();
}

class SqlScanner {
  private position = 0;
  private current = '';
  private readonly statements: string[] = [];

  constructor(private readonly sql: string) {}

  scan(): string[] {
    while (this.position < this.sql.length) {
      this.consumeNext();
    }
    this.finishStatement();
    return this.statements;
  }

  private consumeNext(): void {
    const char = this.sql[this.position];
    const next = this.sql[this.position + 1];
    const dollarTag = char === '$' ? DOLLAR_QUOTE_TAG.exec(this.sql.slice(this.position))?.[0] : undefined;

    if ((char === '-' && next === '-') || char === '#') {
      this.skipUntil('\n');
    } else if (char === '/' && next === '*') {
      this.skipUntil('*/', ' ', 2);
    } else if (char === "'") {
      this.skipQuoted(char, STRING_PLACEHOLDER);
    } else if (char === '"' || char === '`') {
      this.skipQuoted(char, IDENTIFIER_PLACEHOLDER);
    } else if (dollarTag) {
      this.skipUntil(dollarTag, STRING_PLACEHOLDER, dollarTag.length);
    } else if (char === ';') {
      this.finishStatement();
      this.position++;
    } else {
      this.current += char;
      this.position++;
    }
  }

  private skipUntil(terminator: string, replacement = ' ', openingLength = 1): void {
    const end = this.sql.indexOf(terminator, this.position + openingLength);
    this.position = end === -1 ? this.sql.length : end + terminator.length;
    this.current += replacement;
  }

  private skipQuoted(quote: string, replacement: string): void {
    this.position++;
    while (this.position < this.sql.length) {
      const char = this.sql[this.position];
      if (char === '\\' && quote === "'") {
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
    this.current += replacement;
  }

  private finishStatement(): void {
    const statement = this.current.trim();
    if (statement.length > 0) {
      this.statements.push(statement);
    }
    this.current = '';
  }
}
