import { SQL_KEYWORDS } from './sqlKeywords';

export const RESERVED_WORDS = new Set(SQL_KEYWORDS.map((keyword) => keyword.toLowerCase()));
