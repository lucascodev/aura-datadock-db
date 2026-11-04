const HAS_WHITESPACE = /\s/;

export function isSafeCommandValue(value: string): boolean {
  return value.length > 0 && !value.startsWith('-') && !HAS_WHITESPACE.test(value);
}
