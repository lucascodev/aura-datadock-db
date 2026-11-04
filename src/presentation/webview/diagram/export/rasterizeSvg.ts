import { l10n } from '../../../../domain/i18n/translation/l10n';
import { PNG_DATA_PREFIX } from '../../shared/constants/pngDataPrefix';

const MAX_CANVAS_SIZE = 16000;
const PREFERRED_SCALE = 2;

export async function rasterizeSvg(svg: string, width: number, height: number): Promise<string> {
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const scale = Math.min(PREFERRED_SCALE, MAX_CANVAS_SIZE / Math.max(width, height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error(l10n.t('Could not create a canvas to render the PNG'));
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png').slice(PNG_DATA_PREFIX.length);
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(l10n.t('Could not render the diagram as an image')));
    image.src = source;
  });
}
