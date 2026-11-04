import type { DiagramPalette } from '../../model/DiagramPalette';

const MARKER_SIZE = 18;

export function renderMarkers(palette: DiagramPalette): string {
  const stroke = `fill="none" stroke="${palette.edge}" stroke-width="1.4"`;
  const circle = `<circle cx="5" cy="9" r="3" fill="${palette.background}" stroke="${palette.edge}" stroke-width="1.4"/>`;
  const crowFoot = `<path d="M 9 9 L 18 3 M 9 9 L 18 15 M 9 9 L 18 9" ${stroke}/>`;
  const bar = (x: number) => `<path d="M ${x} 3 L ${x} 15" ${stroke}/>`;

  const markers: Readonly<Record<string, string>> = {
    'dd-one': `${bar(9)}${bar(13)}`,
    'dd-zero-one': `${circle}${bar(13)}`,
    'dd-zero-many': `${circle}${crowFoot}`,
  };

  const definitions = Object.entries(markers).map(
    ([id, shape]) =>
      `<marker id="${id}" viewBox="0 0 ${MARKER_SIZE} ${MARKER_SIZE}" refX="${MARKER_SIZE}" refY="9" markerWidth="${MARKER_SIZE}" markerHeight="${MARKER_SIZE}" markerUnits="userSpaceOnUse" orient="auto-start-reverse">${shape}</marker>`,
  );
  return `<defs>${definitions.join('')}</defs>`;
}
