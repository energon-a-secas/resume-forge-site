// Every listener. Routing is by data-act / data-path / data-file attributes on
// the editor's generated markup, so the per-type editor code lives in
// editor.js and this file never needs to know a section's fields.
import { state, bus, emit, touch, setDoc, savePrefs, listSaved, saveCurrent, saveAsNew, loadSaved, renameSaved,
  duplicateSaved, deleteSaved, resetAll } from './state.js';
import { renderContentPanel, renderDesignPanel, refreshItemName, iconField } from './editor.js';
import { renderPreview, layout } from './preview.js';
import { openCatalog, closeCatalog, isCatalogOpen, setCatalogTab, renderCatalog, scaleMinis, fetchExample } from './catalog.js';
import { exportAs, importFiles, importText } from './export.js';
import { toYAML, fromYAML } from './serialize.js';
import { newSection, blankItem, normalizeResume, blankResume, SECTION_TYPES } from './schema.js';
import { searchIcons, iconHtml, isImageSpec } from './icons.js';
import { imageToDataUrl } from './assets.js';
import { fetchPSNStats, fetchSteamStats } from './gaming.js';
import { escHtml, showToast, debounce, getPath, setPath, copyText } from './utils.js';

const $ = (id) => document.getElementById(id);
const move = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };

let yamlDirty = false;
let iconTarget = null;   // { path, urlPath }

/* ── dialogs ─────────────────────────────────────────────── */

export function confirmDialog({ title = 'Replace the current resume?', body = '', ok = 'Replace', cancel = 'Keep mine' } = {}) {
  return new Promise((resolve) => {
    const dlg = $('confirm-dialog');
    $('confirm-title').textContent = title;
    $('confirm-body').textContent = body;
    $('confirm-ok').textContent = ok;
    $('confirm-cancel').textContent = cancel;
    const done = (v) => { dlg.removeEventListener('close', onClose); resolve(v); };
    const onClose = () => done(dlg.returnValue === 'ok');
    dlg.addEventListener('close', onClose);
    $('confirm-ok').onclick = () => dlg.close('ok');
    $('confirm-cancel').onclick = () => dlg.close('cancel');
    dlg.showModal();
  });
}

export function promptDialog({ title = 'Name', value = '' } = {}) {
  return new Promise((resolve) => {
    const dlg = $('prompt-dialog');
    $('prompt-title').textContent = title;
    const input = $('prompt-input');
    input.value = value;
    const onClose = () => { dlg.removeEventListener('close', onClose); resolve(dlg.returnValue === 'ok' ? input.value.trim() : null); };
    dlg.addEventListener('close', onClose);
    $('prompt-cancel').onclick = () => dlg.close('cancel');
    dlg.showModal();
    input.focus(); input.select();
  });
}

function infoDialog(title, html) {
  $('info-title').textContent = title;
  $('info-body').innerHTML = html;
  $('info-dialog').showModal();
}

/* ── applying imports ────────────────────────────────────── */

const hasContent = (m) => !!(m.basics.name || m.sections.length);

async function applyImport(result, label) {
  if (!result || result.error || !result.model) {
    showToast(result?.error || (result?.warnings || []).join('; ') || `Could not import ${label}`, 4000);
    return false;
  }
  if (hasContent(state.doc) && state.dirty && !(await confirmDialog({ body: `Importing ${label} replaces the resume you are editing. Save it first if you want to keep it.` }))) return false;
  setDoc(result.model, { source: 'import', docId: null });
  const warn = result.warnings || [];
  if (result.kind === 'linkedin') {
    const rows = (result.report || []).map((r) => `<tr><td>${escHtml(r.file)}</td><td>${r.rows}</td></tr>`).join('');
    infoDialog('LinkedIn import', `<p>Imported <strong>${escHtml(result.model.basics.name || 'your profile')}</strong> from ${result.report?.length || 0} file(s). LinkedIn dates, headline and descriptions are kept as written; skills arrive without levels and render as tags.</p><table><tr><th>File</th><th>Rows</th></tr>${rows}</table>${warn.length ? `<p>${escHtml(warn.join(' · '))}</p>` : ''}`);
  } else if (warn.length) {
    infoDialog('Imported with notes', `<p>${escHtml(label)} loaded. The parser adjusted a few things:</p><ul>${warn.slice(0, 12).map((w) => `<li>${escHtml(w)}</li>`).join('')}</ul>`);
  } else showToast(`Loaded ${label}`);
  return true;
}

/* ── YAML panel ──────────────────────────────────────────── */

export function refreshYaml(force = false) {
  const ta = $('yaml-input');
  if (!ta) return;
  if (yamlDirty && !force) return;
  ta.value = toYAML(state.doc);
  yamlDirty = false;
  setYamlStatus('in sync with the form', 'ok');
}

function setYamlStatus(text, cls = '') {
  const el = $('yaml-status');
  el.textContent = text;
  el.className = `yaml-status ${cls ? `is-${cls}` : ''}`;
}

function applyYaml() {
  const text = $('yaml-input').value;
  const r = importText(text, 'resume.yaml');
  if (r.error || !r.model) { setYamlStatus(r.error || 'Could not parse', 'bad'); return; }
  setDoc(r.model, { source: 'yaml' });
  yamlDirty = false;
  setYamlStatus(r.warnings.length ? `applied with ${r.warnings.length} note(s): ${r.warnings.slice(0, 2).join('; ')}` : 'applied', r.warnings.length ? '' : 'ok');
  if (r.kind !== 'yaml') refreshYaml(true);
}

/* ── saved library UI ────────────────────────────────────── */

export function refreshSavedSelect() {
  const sel = $('saved-select');
  const items = listSaved();
  sel.innerHTML = `<option value="">${items.length ? 'Working copy (unsaved)' : 'Nothing saved yet'}</option>` +
    items.map((s) => `<option value="${escHtml(s.id)}">${escHtml(s.name)}</option>`).join('');
  sel.value = state.docId && items.some((s) => s.id === state.docId) ? state.docId : '';
}

async function onSave() {
  if (state.docId) { saveCurrent(); showToast('Saved'); return; }
  const name = await promptDialog({ title: 'Save as', value: state.doc.meta.title || state.doc.basics.name || 'My resume' });
  if (name === null) return;
  if (saveCurrent(name)) showToast(`Saved "${name}" in this browser`);
}

/* ── icon picker ─────────────────────────────────────────── */

function openIconPicker(path, urlPath) {
  iconTarget = { path, urlPath };
  $('icon-search').value = '';
  $('icon-url').value = isImageSpec(getPath(state.doc, path)) && /^https?:/i.test(getPath(state.doc, path)) ? getPath(state.doc, path) : '';
  renderIconGrid('');
  $('icon-dialog').showModal();
  $('icon-search').focus();
}

function renderIconGrid(q) {
  const url = iconTarget ? getPath(state.doc, iconTarget.urlPath) : '';
  $('icon-grid').innerHTML = searchIcons(q, 140).map((x) =>
    `<button type="button" class="icon-cell" data-act="icon-set" data-icon="${x.id}" title="${escHtml(x.title)}">${iconHtml(x.id, url)}<span>${escHtml(x.title)}</span></button>`).join('') || '<p class="empty-note">No icon matches. Upload one or use the favicon.</p>';
}

function setIcon(value) {
  if (!iconTarget) return;
  setPath(state.doc, iconTarget.path, value);
  const url = getPath(state.doc, iconTarget.urlPath);
  const preview = document.querySelector(`[data-icon-preview="${iconTarget.path}"]`)?.closest('.icon-field');
  if (preview) preview.outerHTML = iconField(iconTarget.path, iconTarget.urlPath, value, url);
  touch('icon');
  $('icon-dialog').close();
  iconTarget = null;
}

/* ── the one click handler ───────────────────────────────── */

async function onAction(btn, e) {
  const act = btn.dataset.act;
  const doc = state.doc;
  const secAt = (b) => doc.sections[+b.dataset.sec];
  switch (act) {
    case 'catalog': openCatalog(btn.dataset.tab || 'templates'); break;
    case 'catalog-close': closeCatalog(); break;
    case 'menu': {
      const menu = $(btn.dataset.menu);
      const open = menu.hidden;
      closeMenus();
      if (open) { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
      e.stopPropagation();
      break;
    }
    case 'export': closeMenus(); await exportAs(btn.dataset.format); break;
    case 'save': await onSave(); break;
    case 'save-as': { closeMenus(); const name = await promptDialog({ title: 'Save a copy as', value: `${doc.meta.title || 'My resume'} (copy)` }); if (name) { saveAsNew(name); showToast(`Saved "${name}"`); } break; }
    case 'rename-saved': { closeMenus(); if (!state.docId) { showToast('Save it first, then rename'); break; } const name = await promptDialog({ title: 'Rename', value: doc.meta.title }); if (name) { renameSaved(state.docId, name); touch('rename'); } break; }
    case 'duplicate-saved': { closeMenus(); if (!state.docId) { showToast('Save it first, then duplicate'); break; } const id = duplicateSaved(state.docId); if (id) { loadSaved(id); showToast('Duplicated'); } break; }
    case 'delete-saved': { closeMenus(); if (!state.docId) { showToast('This working copy is not in the saved list'); break; } if (await confirmDialog({ title: 'Delete this saved resume?', body: `"${doc.meta.title}" is removed from this browser's saved list. The working copy stays open.`, ok: 'Delete', cancel: 'Keep' })) { deleteSaved(state.docId); showToast('Deleted'); } break; }
    case 'new-doc': { closeMenus(); if (!hasContent(doc) || !state.dirty || await confirmDialog({ title: 'Start a blank resume?', body: 'Unsaved edits to the current one are lost unless you save first.', ok: 'Start blank' })) { const m = blankResume(); m.sections.push(newSection('experience', 'main')); setDoc(m, { source: 'new', docId: null }); } break; }
    case 'reset-all': { closeMenus(); if (await confirmDialog({ title: 'Forget everything saved here?', body: 'Every saved resume, the working copy and your preferences in this browser are deleted. Export YAML first if in doubt.', ok: 'Forget all', cancel: 'Cancel' })) { resetAll(); showToast('Storage cleared'); } break; }
    case 'yaml-apply': applyYaml(); break;
    case 'yaml-refresh': refreshYaml(true); break;
    case 'yaml-copy': showToast((await copyText($('yaml-input').value)) ? 'YAML copied' : 'Copy failed; select the text and copy'); break;
    case 'help': $('help-dialog').showModal(); break;
    case 'dialog-close': btn.closest('dialog')?.close(); break;

    case 'add-link': doc.basics.links.push({ label: '', url: '', icon: '' }); touch('links'); renderContentPanel(); $(`f-basics-links-${doc.basics.links.length - 1}-label`)?.focus(); focusPath(`basics.links.${doc.basics.links.length - 1}.label`); break;
    case 'del-link': doc.basics.links.splice(+btn.dataset.idx, 1); touch('links'); renderContentPanel(); break;
    case 'move-link': if (move(doc.basics.links, +btn.dataset.idx, +btn.dataset.dir)) { touch('links'); renderContentPanel(); } break;
    case 'clear-photo': doc.basics.photo = ''; touch('photo'); renderContentPanel(); break;

    case 'add-section': {
      const type = $('add-section-type').value;
      const zone = $('add-section-zone').value;
      const s = newSection(type, zone);
      doc.sections.push(s); state.ui.open[s.id] = true; savePrefs();
      touch('sections'); renderContentPanel();
      document.querySelector(`details[data-sid="${s.id}"]`)?.scrollIntoView({ block: 'center' });
      break;
    }
    case 'section-add': {
      const s = newSection(btn.dataset.type, btn.dataset.zone);
      doc.sections.push(s); state.ui.open[s.id] = true; savePrefs();
      touch('sections'); renderContentPanel(); closeCatalog();
      switchTab('content');
      document.querySelector(`details[data-sid="${s.id}"]`)?.scrollIntoView({ block: 'center' });
      showToast(`Added ${SECTION_TYPES[s.type]?.label || s.type} to the ${s.zone === 'aside' ? 'side' : 'main'} column`);
      break;
    }
    case 'del-section': {
      const s = secAt(btn);
      if (!s) break;
      const big = s.items.length > 1 || (s.text || '').length > 40;
      if (big && !(await confirmDialog({ title: `Delete "${s.title || s.type}"?`, body: 'Its content is removed from this resume.', ok: 'Delete', cancel: 'Keep' }))) break;
      doc.sections.splice(+btn.dataset.sec, 1); touch('sections'); renderContentPanel();
      break;
    }
    case 'move-section': if (move(doc.sections, +btn.dataset.sec, +btn.dataset.dir)) { touch('sections'); renderContentPanel(); } break;
    case 'zone-toggle': { const s = secAt(btn); s.zone = s.zone === 'aside' ? 'main' : 'aside'; touch('sections'); renderContentPanel(); break; }
    case 'hide-toggle': { const s = secAt(btn); s.hidden = !s.hidden; touch('sections'); renderContentPanel(); break; }
    case 'add-item': { const s = secAt(btn); s.items.push(blankItem(s.type)); touch('items'); renderContentPanel(); focusPath(`sections.${btn.dataset.sec}.items.${s.items.length - 1}.${SECTION_TYPES[s.type].fields[0].key}`); break; }
    case 'del-item': { const s = secAt(btn); s.items.splice(+btn.dataset.idx, 1); touch('items'); renderContentPanel(); break; }
    case 'move-item': { const s = secAt(btn); if (move(s.items, +btn.dataset.idx, +btn.dataset.dir)) { touch('items'); renderContentPanel(); } break; }
    case 'level-set': {
      setPath(doc, btn.dataset.path, +btn.dataset.value);
      const pick = btn.closest('.level-pick');
      pick?.querySelectorAll('button[data-value]').forEach((b) => { const n = +b.dataset.value; if (n) { b.classList.toggle('on', n <= +btn.dataset.value); b.setAttribute('aria-checked', n === +btn.dataset.value); } });
      touch('level');
      break;
    }
    case 'section-image-clear': { const s = secAt(btn); s.image = ''; touch('image'); renderContentPanel(); break; }
    case 'pick-icon': openIconPicker(btn.dataset.path, btn.dataset.urlPath); break;
    case 'icon-set': setIcon(btn.dataset.icon || ''); break;
    case 'icon-url': { const u = $('icon-url').value.trim(); if (/^https?:\/\/\S+/i.test(u)) setIcon(u); else showToast('Paste a full https:// image URL'); break; }

    case 'design-set': {
      const path = btn.dataset.path;
      let value = btn.dataset.value;
      if (path === 'design.fonts') value = value; // pairing id
      setPath(doc, path, value);
      doc.design = normalizeResume(doc).model.design;
      touch('design'); renderDesignPanel();
      if (isCatalogOpen()) renderCatalog();
      break;
    }
    case 'design-colors-reset': doc.design.colors = {}; touch('design'); renderDesignPanel(); if (isCatalogOpen()) renderCatalog(); break;

    case 'fetch-psn': { const s = secAt(btn); const stats = await fetchPSNStats(s.data.psn.username); if (stats) { s.data.psn.stats = stats; touch('gaming'); renderContentPanel(); } break; }
    case 'fetch-steam': { const s = secAt(btn); const stats = await fetchSteamStats(s.data.steam.id); if (stats) { s.data.steam.stats = stats; touch('gaming'); renderContentPanel(); } break; }

    case 'example-load': {
      try {
        const text = await fetchExample(btn.dataset.id);
        const ok = await applyImport({ ...fromYAML(text), kind: 'yaml' }, `the "${btn.dataset.id}" example`);
        if (ok) closeCatalog();
      } catch (err) { showToast(`Could not load the example: ${err.message}`); }
      break;
    }
    case 'example-design': {
      try {
        const r = fromYAML(await fetchExample(btn.dataset.id));
        if (r.model) { doc.design = r.model.design; touch('design'); renderDesignPanel(); renderCatalog(); showToast('Design applied; your content is untouched'); }
      } catch (err) { showToast(`Could not load the example: ${err.message}`); }
      break;
    }
    default: break;
  }
}

function focusPath(path) {
  const el = document.querySelector(`[data-path="${path}"]`);
  if (el) { el.focus(); }
}

function closeMenus() {
  document.querySelectorAll('.menu').forEach((m) => { m.hidden = true; });
  document.querySelectorAll('[data-act="menu"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}

/* ── inputs ──────────────────────────────────────────────── */

const designRerender = debounce(() => { renderDesignPanel(); if (isCatalogOpen()) renderCatalog(); }, 400);

function onInput(el) {
  const doc = state.doc;
  if (el.dataset.path) {
    let v = el.value;
    if (el.dataset.kind === 'lines') v = v.split('\n').map((x) => x.replace(/^\s*[-*•✦▸◆→✓]\s*/, '').trim()).filter(Boolean);
    else if (el.dataset.kind === 'number') v = parseInt(v, 10) || 1;
    setPath(doc, el.dataset.path, v);
    refreshItemName(el.dataset.path);
    touch('edit');
    return;
  }
  if (el.dataset.design) {
    const path = el.dataset.design;
    let v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? parseFloat(el.value) : el.value;
    if (path.startsWith('design.fonts.')) {
      const f = typeof doc.design.fonts === 'string' ? { ...resolveFontsFor(doc.design.fonts) } : { ...doc.design.fonts };
      f[path.split('.').pop()] = v;
      doc.design.fonts = f;
    } else if (path.startsWith('design.colors.')) {
      doc.design.colors[path.split('.').pop()] = v;
    } else setPath(doc, path, v);
    doc.design = normalizeResume(doc).model.design;
    const label = el.closest('.range-row')?.querySelector('span');
    if (label && el.type === 'range') label.textContent = path.endsWith('fontScale') ? `${Math.round(v * 100)}%` : path.endsWith('dim') ? `dim ${v}%` : `${v}%`;
    touch('design');
    if (el.type !== 'range' && el.type !== 'color' && el.type !== 'text') designRerender();
  }
}

import { resolveFonts as resolveFontsFor } from './design.js';

async function onFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  const kind = input.dataset.file;
  const doc = state.doc;
  try {
    if (kind === 'photo') { doc.basics.photo = await imageToDataUrl(file, { max: 800, keepSvg: false }); touch('photo'); renderContentPanel(); }
    else if (kind === 'banner') { doc.design.banner.image = await imageToDataUrl(file, { max: 1600, keepSvg: false }); touch('design'); renderDesignPanel(); if (isCatalogOpen()) renderCatalog(); }
    else if (kind === 'section-image') { const s = doc.sections[+input.dataset.sec]; s.image = await imageToDataUrl(file, { max: 600 }); touch('image'); renderContentPanel(); }
  } catch (err) { showToast(err.message || 'Could not read the image'); }
  input.value = '';
}

/* ── tabs, keys, drops ───────────────────────────────────── */

export function switchTab(tab) {
  state.ui.tab = tab; savePrefs();
  document.querySelectorAll('.editor-tab').forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  ['content', 'design', 'yaml'].forEach((t) => { $(`panel-${t}`).hidden = t !== tab; });
  if (tab === 'yaml') refreshYaml();
}

const isTyping = () => { const t = document.activeElement?.tagName; return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || document.activeElement?.isContentEditable; };

function onKey(e) {
  if (e.key === 'Escape') {
    if (isCatalogOpen()) { closeCatalog(); e.preventDefault(); return; }
    closeMenus();
    return;
  }
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key === 'Enter' && document.activeElement === $('yaml-input')) { e.preventDefault(); applyYaml(); return; }
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); onSave(); return; }
  if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); exportAs('pdf'); return; }
  if (mod || e.altKey || isTyping()) return;
  switch (e.key.toLowerCase()) {
    case 't': openCatalog('templates'); break;
    case 'd': openCatalog('design'); break;
    case 'p': exportAs('pdf'); break;
    case 's': onSave(); break;
    default: return;
  }
  e.preventDefault();
}

/* ── wiring ──────────────────────────────────────────────── */

export function initEvents() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (btn) {
      if (btn.closest('summary')) e.preventDefault();
      onAction(btn, e);
      return;
    }
    if (e.target.closest('summary') && e.target.matches('input')) { e.preventDefault(); return; }
    const catTab = e.target.closest('[data-cat-tab]');
    if (catTab) { setCatalogTab(catTab.dataset.catTab); return; }
    const tab = e.target.closest('.editor-tab');
    if (tab) { switchTab(tab.dataset.tab); return; }
    if (!e.target.closest('.menu-wrap')) closeMenus();
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'yaml-input') { yamlDirty = true; setYamlStatus('edited; Apply to use it (Ctrl/Cmd+Enter)'); return; }
    if (el.id === 'icon-search') { renderIconGrid(el.value); return; }
    if (el.dataset.path || el.dataset.design) onInput(el);
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.file) { onFile(el); return; }
    if (el.id === 'file-import') { importFiles(el.files).then((r) => applyImport(r, el.files[0]?.name || 'file')).catch((err) => showToast(err.message)); el.value = ''; return; }
    if (el.id === 'icon-upload') {
      const f = el.files?.[0];
      if (f) imageToDataUrl(f, { max: 256, keepSvg: true }).then(setIcon).catch((err) => showToast(err.message));
      el.value = '';
      return;
    }
    if (el.id === 'saved-select') {
      const id = el.value;
      if (!id) return;
      if (id === state.docId) return;
      const go = () => { if (!loadSaved(id)) showToast('That saved resume is gone'); };
      if (state.dirty && hasContent(state.doc) && !state.docId) confirmDialog({ title: 'Switch resume?', body: 'The working copy has unsaved edits; they are lost unless you save it first.', ok: 'Switch' }).then((ok) => { if (ok) go(); else refreshSavedSelect(); });
      else go();
      return;
    }
    if (el.id === 'zoom-select') { state.ui.zoom = el.value; savePrefs(); layout(); return; }
    if (el.id === 'guides-toggle') { state.ui.guides = el.checked; savePrefs(); layout(); return; }
    if (el.tagName === 'SELECT' && (el.dataset.path || el.dataset.design)) onInput(el);
  });
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.matches?.('details.block') && d.dataset.sid) { state.ui.open[d.dataset.sid] = d.open; savePrefs(); }
  }, true);
  document.addEventListener('keydown', onKey);
  $('btn-help').addEventListener('click', () => $('help-dialog').showModal());

  // drag and drop a file anywhere
  let dragDepth = 0;
  document.addEventListener('dragenter', (e) => { if (e.dataTransfer?.types?.includes('Files')) { dragDepth++; document.body.classList.add('is-dragging'); } });
  document.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) document.body.classList.remove('is-dragging'); });
  document.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    dragDepth = 0; document.body.classList.remove('is-dragging');
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    importFiles(e.dataTransfer.files).then((r) => applyImport(r, e.dataTransfer.files[0].name)).catch((err) => showToast(err.message));
  });

  window.addEventListener('resize', debounce(() => { layout(); if (isCatalogOpen()) scaleMinis(); }, 120));

  // state → views
  const yamlSync = debounce(() => { if (state.ui.tab === 'yaml') refreshYaml(); }, 400);
  bus.addEventListener('doc', (e) => {
    renderPreview();
    const src = e.detail?.source;
    if (src !== 'edit' && src !== 'level' && src !== 'icon' && src !== 'design') { renderContentPanel(); renderDesignPanel(); if (src !== 'yaml') refreshYaml(true); }
    else yamlSync();
    refreshSavedSelect();
  });
  bus.addEventListener('library', refreshSavedSelect);
  bus.addEventListener('storage-failed', () => showToast('Storage is full or unavailable: this change was not saved. Remove an image or export the YAML.', 5000));
}
