// Google Fonts for the sheet. One <link> whose href follows the design; the
// app chrome never changes font, only the resume does.
import { googleFontsUrl } from './design.js';

let current = '';

export function ensureFonts(design) {
  const url = googleFontsUrl(design.fonts);
  if (url === current) return;
  current = url;
  let link = document.getElementById('r-fonts');
  if (!url) { if (link) link.remove(); return; }
  if (!link) {
    link = document.createElement('link');
    link.id = 'r-fonts';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = url;
}

/** Resolves when the sheet's fonts have loaded (or after a timeout). */
export function fontsReady(timeout = 2500) {
  if (!document.fonts) return Promise.resolve();
  return Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, timeout))]);
}
