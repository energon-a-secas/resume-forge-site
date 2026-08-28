// The Catalog: templates rendered with the user's own resume, example files,
// section types with live previews, and the design controls. Everything here
// is drawn by the same renderer as the sheet, so a preview cannot go stale.
// This import is not for the Catalog. js/a11y.js self-initialises on load and
// nothing here calls it; it hangs off this file because a11y.js and catalog.js
// share an owner and js/app.js, the obvious host, does not. Deliberate, frozen
// as contract C10 in docs/delivery/CONTRACTS.md. Do not "tidy" it away: removing
// it silently disables keyboard reordering and every move announcement.
import './a11y.js';
import { state } from './state.js';
import { escHtml } from './utils.js';
import { renderResume, renderSection, sheetClasses, sheetStyle } from './render.js';
import { SECTION_TYPES, TYPE_IDS, newSection, blankItem } from './schema.js';
import { TEMPLATES } from './design.js';
import { designControlsHtml } from './design-panel.js';

let currentTab = 'templates';
let examples = null;
let lastFocus = null;

export const SAMPLES = {
  text: { text: 'I build the paved road: clusters, pipelines and guardrails that let teams ship.\n\nEight years on Kubernetes and Terraform, with a soft spot for boring infrastructure.' },
  experience: { items: [{ role: 'Platform Engineering Lead', company: 'Fabrikam Logistics', team: 'Developer Platform', start: 'Jan 2024', end: 'Present', highlights: ['Own the internal developer platform behind 40 services.', 'Run the on-call rotation and the monthly game day.'] }] },
  education: { items: [{ degree: 'B.S. Computer Science', school: 'University of Lisbon', start: '2010', end: '2014', location: 'Lisbon' }] },
  skills: { items: [{ name: 'Kubernetes', level: 5, group: '' }, { name: 'AWS', level: 4, group: '' }, { name: 'GitLab CI', level: 4, group: '' }, { name: 'Terraform', level: 3, group: '' }] },
  languages: { items: [{ name: 'Portuguese', level: 'Native', score: 5 }, { name: 'English', level: 'Fluent', score: 4 }] },
  certifications: { items: [{ name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2023' }] },
  projects: { items: [{ name: 'Route planner', role: 'Maintainer', url: 'https://example.dev/routes', start: '2023', end: 'Present', summary: 'A bike-route planner for the coast.', highlights: ['8k monthly users, no backend'] }] },
  awards: { items: [{ title: 'Engineer of the year', issuer: 'Fabrikam', date: '2024', summary: 'For the platform migration.' }] },
  volunteer: { items: [{ role: 'Mentor', org: 'Code Club', start: '2022', end: 'Present', highlights: ['Weekly sessions for beginners'] }] },
  publications: { items: [{ title: 'Boring clusters', publisher: 'Medium', date: 'Mar 2025', url: 'https://medium.com' }] },
  iconrow: { items: [{ label: 'GitHub', icon: 'github', url: 'https://github.com' }, { label: 'LinkedIn', icon: 'linkedin', url: 'https://linkedin.com' }, { label: 'Photography', icon: 'camera' }, { label: 'Games', icon: 'gamepad' }, { label: 'Steam', icon: 'steam' }] },
  list: { items: [{ text: 'Portuguese, based in Lisbon', icon: 'pin' }, { text: 'Learned Kubernetes on three thrift-store laptops', icon: '' }] },
  tags: { items: [{ name: 'Photography' }, { name: 'Board games' }, { name: 'Coffee' }] },
  contact: {},
  pagebreak: {},
  references: { items: [{ name: 'Jane Smith', role: 'Engineering Manager, Acme', contact: 'jane@acme.example' }] },
  gaming: { data: { psn: { username: 'player1', stats: { level: 412, games: 88, trophies: { platinum: 12, gold: 120, silver: 300, bronze: 900 } } }, steam: { id: '', stats: null } } },
};

export function sampleSection(type, zone) {
  const s = newSection(type, zone);
  const def = SECTION_TYPES[type];
  const sm = SAMPLES[type] || {};
  if (sm.items) s.items = sm.items.map((it) => ({ ...blankItem(type), ...it }));
  if (sm.text) s.text = sm.text;
  if (sm.data) s.data = sm.data;
  if (def.hasData && !sm.data) s.data = { psn: { username: '', stats: null }, steam: { id: '', stats: null } };
  return s;
}

export const isCatalogOpen = () => !document.getElementById('catalog').hidden;

/* ── modality: inert behind, a trap inside ───────────────────
   The overlay is a role="dialog" div rather than a native <dialog>, so it gets
   neither of those for free. `inert` takes the whole page behind it out of the
   tab order, out of the accessibility tree and out of reach of a click; it is
   Baseline Widely available since April 2023, which is why the markup does not
   need to change. The Tab wrap below is the in-page half: it binds to #catalog,
   not to document, so it is inactive by construction whenever the overlay is
   closed. Escape is handled once, in events.js, and is not re-implemented here. */

const BEHIND = '.header-bar, .toolbar, #main, .neo-footer';
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const setBehindInert = (on) => document.querySelectorAll(BEHIND).forEach((el) => { el.inert = on; });

function onCatalogKey(e) {
  if (e.key !== 'Tab') return;
  const el = document.getElementById('catalog');
  const stops = [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.getClientRects().length);
  if (!stops.length) return;
  const first = stops[0];
  const last = stops[stops.length - 1];
  const here = document.activeElement;
  if (e.shiftKey && (here === first || !el.contains(here))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && here === last) { e.preventDefault(); first.focus(); }
}

export function openCatalog(tab = 'templates') {
  const el = document.getElementById('catalog');
  lastFocus = document.activeElement;
  currentTab = tab;
  el.hidden = false;
  document.body.classList.add('modal-open');
  setBehindInert(true);
  el.addEventListener('keydown', onCatalogKey);
  renderCatalog();
  el.querySelector('.cat-close')?.focus();
}

export function closeCatalog() {
  const el = document.getElementById('catalog');
  if (el.hidden) return;
  el.hidden = true;
  el.removeEventListener('keydown', onCatalogKey);
  document.body.classList.remove('modal-open');
  setBehindInert(false);   // before the focus restore: focus cannot land in an inert subtree
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

export function setCatalogTab(tab) { currentTab = tab; renderCatalog(); }

export async function renderCatalog() {
  const body = document.getElementById('cat-body');
  document.querySelectorAll('#cat-tabs .cat-tab').forEach((b) => {
    const on = b.dataset.catTab === currentTab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (currentTab === 'templates') body.innerHTML = templatesHtml();
  else if (currentTab === 'sections') body.innerHTML = sectionsHtml();
  else if (currentTab === 'design') body.innerHTML = `<div class="cat-section"><h3>Design</h3><p class="cat-hint">Every change applies immediately to the resume behind this panel. Palette names are colours; the name travels inside the YAML.</p><div class="cat-design">${designControlsHtml(state.doc.design, { rich: true })}</div></div>`;
  else if (currentTab === 'examples') {
    body.innerHTML = '<div class="cat-section"><h3>Examples</h3><p class="cat-hint">Loading…</p></div>';
    const list = await loadExamples();
    if (currentTab === 'examples') body.innerHTML = examplesHtml(list);
  }
}

function templatesHtml() {
  const doc = state.doc;
  const cards = Object.entries(TEMPLATES).map(([id, t]) => {
    const d = structuredClone(doc);
    d.design.template = id;
    const html = renderResume(d);
    const on = doc.design.template === id;
    return `<div class="cat-card ${on ? 'on' : ''}">
      <div class="cat-preview"><div class="sheet-mini" data-mini>${html}</div></div>
      <div class="cat-card-head"><div class="cat-name">${escHtml(t.label)}</div><span class="cat-when">${escHtml(t.desc)}</span></div>
      <div class="cat-actions"><button type="button" class="btn btn-sm ${on ? '' : 'btn-primary'}" data-act="design-set" data-path="design.template" data-value="${id}">${on ? 'In use' : 'Use this template'}</button></div>
    </div>`;
  }).join('');
  queueMicrotask(scaleMinis);
  return `<div class="cat-section"><h3>Templates</h3><p class="cat-hint">Each card is your resume, rendered in that layout right now. Switching keeps every word; only the arrangement changes. Side-column sections render in the main flow when a template has no side column.</p><div class="cat-grid">${cards}</div></div>`;
}

function sectionsHtml() {
  const doc = state.doc;
  const cards = TYPE_IDS.map((type) => {
    const def = SECTION_TYPES[type];
    const sec = sampleSection(type, def.zone);
    const m = { ...doc, sections: [sec] };
    const inner = renderSection(m, sec, doc.design);
    const wrap = sec.zone === 'aside'
      ? `<aside class="r-aside" style="padding:5mm 6mm;min-height:100%">${inner}</aside>`
      : `<main class="r-main" style="padding:5mm 6mm">${inner}</main>`;
    const html = `<article class="${sheetClasses(doc.design)} is-editing" style="${sheetStyle(doc.design)};min-height:0;width:110mm">${wrap}</article>`;
    return `<div class="cat-card">
      <div class="cat-preview" style="aspect-ratio: 110 / 80"><div class="sheet-mini" data-mini="110">${html}</div></div>
      <div class="cat-card-head"><div class="cat-name">${escHtml(def.label)}</div><span class="cat-when">${escHtml(def.desc)}</span></div>
      <div class="cat-actions">
        <button type="button" class="btn btn-sm btn-primary" data-act="section-add" data-type="${type}" data-zone="main">+ Main</button>
        <button type="button" class="btn btn-sm" data-act="section-add" data-type="${type}" data-zone="aside">+ Side</button>
      </div>
    </div>`;
  }).join('');
  queueMicrotask(scaleMinis);
  return `<div class="cat-section"><h3>Section types</h3><p class="cat-hint">Sample content in your current design. A new section arrives with one blank entry; type into it on the Content tab.</p><div class="cat-grid">${cards}</div></div>`;
}

function examplesHtml(list) {
  if (!list?.length) return '<div class="cat-section"><h3>Examples</h3><p class="cat-hint">The example library could not be loaded.</p></div>';
  return `<div class="cat-section"><h3>Example resumes</h3><p class="cat-hint">Complete files under <code>library/</code>. Load one to start from it, or take only its design and keep your content.</p>
  <div class="cat-examples">${list.map((e) => `<div class="cat-ex">
      <span class="cat-ex-cat">${escHtml(e.category || '')}</span>
      <h4>${escHtml(e.name)}</h4>
      <p>${escHtml(e.desc || '')}</p>
      <span class="cat-ex-uses">${escHtml(e.uses || '')}</span>
      <div class="cat-actions">
        <button type="button" class="btn btn-sm btn-primary" data-act="example-load" data-id="${escHtml(e.id)}">Load</button>
        <button type="button" class="btn btn-sm" data-act="example-design" data-id="${escHtml(e.id)}">Design only</button>
        <a class="btn btn-sm" href="library/${escHtml(e.id)}.yaml" target="_blank" rel="noopener">YAML</a>
      </div>
    </div>`).join('')}</div></div>`;
}

export async function loadExamples() {
  if (examples) return examples;
  try {
    const res = await fetch('library/index.json', { cache: 'no-cache' });
    examples = await res.json();
  } catch { examples = []; }
  return examples;
}

export async function fetchExample(id) {
  const res = await fetch(`library/${encodeURIComponent(id)}.yaml`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Scale every .sheet-mini to its container width (the sheet is 210mm wide). */
export function scaleMinis() {
  document.querySelectorAll('.sheet-mini').forEach((el) => {
    const box = el.parentElement;
    const sheet = el.firstElementChild;
    if (!box || !sheet) return;
    const wmm = parseFloat(el.dataset.mini) || 210;
    const wpx = wmm * 96 / 25.4;
    const s = box.clientWidth / wpx;
    el.style.transform = `scale(${s})`;
    el.style.width = `${wpx}px`;
  });
}
