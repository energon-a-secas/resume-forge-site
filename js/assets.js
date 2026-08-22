// Images the resume carries: photo, banner background, uploaded icons, list
// pictures. They live inside the YAML as data: URIs, so they are resized here
// before storage: a 4 MB phone photo would exhaust localStorage on its own.
import { readAsDataUrl } from './utils.js';

const KB = 1024;

/**
 * @param {File} file
 * @param {{max?:number, quality?:number, keepSvg?:boolean, maxBytes?:number}} o
 *   max: longest side in px after resize; keepSvg: leave SVG files untouched (icons)
 */
export async function imageToDataUrl(file, o = {}) {
  const { max = 1200, quality = 0.86, keepSvg = true, maxBytes = 900 * KB } = o;
  if (!file || !file.type.startsWith('image/')) throw new Error('Not an image file');
  if (file.type === 'image/svg+xml') {
    if (!keepSvg) throw new Error('SVG is not accepted here');
    if (file.size > 200 * KB) throw new Error('SVG over 200 KB; simplify it first');
    return readAsDataUrl(file);
  }
  const src = await readAsDataUrl(file);
  const img = await loadImage(src);
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1 && file.size <= maxBytes) return src;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
  let out = canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', quality);
  if (hasAlpha && out.length > maxBytes * 1.37) out = canvas.toDataURL('image/jpeg', quality);
  return out;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to decode'));
    img.src = src;
  });
}

/** Approximate bytes of a data: URI payload, for the storage readout. */
export function dataUrlBytes(uri) {
  const i = String(uri || '').indexOf(',');
  return i < 0 ? 0 : Math.round((uri.length - i - 1) * 0.75);
}
