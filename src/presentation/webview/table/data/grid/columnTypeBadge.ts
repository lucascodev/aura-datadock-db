const BADGES: readonly (readonly [RegExp, string])[] = [
  [/^(bool|tinyint\(1\))/i, 'T/F'],
  [/(int|numeric|decimal|real|double|float|serial|money|^bit)/i, '123'],
  [/(timestamp|date|time|interval|year)/i, 'DT'],
  [/json/i, '{ }'],
  [/(bytea|blob|binary)/i, '01'],
  [/uuid/i, 'ID'],
];

const TEXT_BADGE = 'A-Z';

export function columnTypeBadge(dataType: string): string {
  return BADGES.find(([pattern]) => pattern.test(dataType))?.[1] ?? TEXT_BADGE;
}
