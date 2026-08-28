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
// The page count layout() measured, kept so renderLint() can report it without
// reading offsetHeight again. One forced reflow per render is the budget; a
// second read here would double it on every keystroke.
let measuredPages = 1;

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
  measuredPages = pages;
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
  // Length is the one note lintResume cannot produce: it is pure and has no
  // DOM, so it cannot measure a rendered sheet. The number comes from the
  // measurement layout() already took, never from a fresh read.
  if (measuredPages > 2) {
    notes.push({ level: 'info', text: `This resume is estimated at ${measuredPages} pages. Two is the usual maximum for a CV.` });
  }
  el.innerHTML = notes.slice(0, 8).map((n) => `<li class="${n.level}">${escHtml(n.text)}</li>`).join('');
}
