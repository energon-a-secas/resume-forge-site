// The live preview: mounts the sheet, scales it to the pane, draws page
// guides at every paper height, and lists lint notes. The guides are an
// estimate of where the browser will break pages; the print pipeline decides.
import { state } from './state.js';
import { mountSheet } from './render.js';
import { ensureFonts } from './fonts.js';
import { lintResume } from './schema.js';
import { PAGES } from './design.js';
import { escHtml } from './utils.js';

const MM = 96 / 25.4;
let ro = null;

export function initPreview() {
  const scroll = document.getElementById('preview-scroll');
  if (window.ResizeObserver && scroll) {
    ro = new ResizeObserver(() => layout());
    ro.observe(scroll);
  }
  document.getElementById('zoom-select').value = String(state.ui.zoom || 'fit');
  document.getElementById('guides-toggle').checked = state.ui.guides !== false;
}

export function renderPreview() {
  const host = document.getElementById('sheet-host');
  if (!host) return;
  ensureFonts(state.doc.design);
  mountSheet(host, state.doc);
  layout();
  renderLint();
  if (document.fonts) document.fonts.ready.then(layout);
}

export function layout() {
  const host = document.getElementById('sheet-host');
  const sheet = host?.firstElementChild;
  const scale = document.getElementById('sheet-scale');
  const stage = document.getElementById('preview-stage');
  const scroll = document.getElementById('preview-scroll');
  if (!sheet || !scale || !stage || !scroll) return;
  const page = PAGES[state.doc.design.page] || PAGES.A4;
  const w = page.w * MM;
  const h = Math.max(sheet.offsetHeight, page.h * MM);
  const avail = scroll.clientWidth - 36;
  const z = state.ui.zoom === 'fit' || !state.ui.zoom ? Math.min(1.4, Math.max(0.2, avail / w)) : parseFloat(state.ui.zoom) || 1;
  scale.style.transform = `scale(${z})`;
  scale.style.width = `${w}px`;
  scale.style.height = `${h}px`;
  stage.style.width = `${Math.ceil(w * z)}px`;
  stage.style.height = `${Math.ceil(h * z)}px`;
  // page guides
  const guides = document.getElementById('page-guides');
  const pageH = page.h * MM;
  const pages = Math.max(1, Math.ceil((sheet.offsetHeight - 2) / pageH));
  let gh = '';
  if (state.ui.guides !== false) {
    for (let k = 1; k < pages; k++) gh += `<div class="page-guide" style="top:${Math.round(k * pageH)}px"><span>Page ${k + 1}</span></div>`;
  }
  guides.innerHTML = gh;
  const meta = document.getElementById('preview-meta');
  if (meta) {
    meta.textContent = `${pages} page${pages === 1 ? '' : 's'} · ${page.label} · ${Math.round(z * 100)}%`;
    meta.classList.toggle('is-warn', pages > 2);
  }
}

export function renderLint() {
  const el = document.getElementById('lint-list');
  if (!el) return;
  const notes = lintResume(state.doc);
  el.innerHTML = notes.slice(0, 8).map((n) => `<li class="${n.level}">${escHtml(n.text)}</li>`).join('');
}
