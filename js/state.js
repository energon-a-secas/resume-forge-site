// App state: the current resume, the saved library, UI prefs. Persistence goes
// through the vendored Persist Kit so private browsing and a full quota degrade
// to "not saved" instead of a blank page.
import { createStore, safeGet, safeRemove } from './neorgon-persist.js';
import { blankResume, normalizeResume, migrateV1, newId } from './schema.js';

const current = createStore({ key: 'resume-forge-v2:current', version: 1 });
const library = createStore({ key: 'resume-forge-v2:library', version: 1 });
const prefs = createStore({ key: 'resume-forge-v2:ui', version: 1 });
const V1_KEY = 'resume-forge-v1';

export const bus = new EventTarget();
export const emit = (type, detail = {}) => bus.dispatchEvent(new CustomEvent(type, { detail }));

export const state = {
  doc: blankResume(),
  docId: null,          // id inside the saved library, when this doc came from there
  dirty: false,
  firstRun: false,
  ui: { tab: 'content', zoom: 'fit', guides: true, open: {} },
};

/** Load what this browser had: a v2 document, else a migrated v1 one, else nothing (first run). */
export function loadInitial() {
  const saved = current.load(null);
  const ui = prefs.load(null);
  if (ui && typeof ui === 'object') Object.assign(state.ui, ui);
  if (saved && saved.doc) {
    state.doc = normalizeResume(saved.doc).model;
    state.docId = saved.docId || null;
    return 'v2';
  }
  const old = safeGet(V1_KEY, null);
  if (old) {
    try {
      const m = migrateV1(JSON.parse(old));
      if (m) { state.doc = m; state.dirty = true; persistCurrent(); return 'v1'; }
    } catch (e) { console.warn('v1 migration failed', e); }
  }
  state.firstRun = true;
  return 'none';
}

export function persistCurrent() {
  const ok = current.save({ doc: state.doc, docId: state.docId });
  if (!ok) emit('storage-failed');
  return ok;
}

export function savePrefs() { prefs.save(state.ui); }

/** Replace the document. `source` is for the toast and the brief of the change. */
export function setDoc(model, { source = 'edit', docId = undefined } = {}) {
  state.doc = model;
  if (docId !== undefined) state.docId = docId;
  state.dirty = true;
  persistCurrent();
  emit('doc', { source });
}

/** Mark an in-place mutation of state.doc: persist and notify. */
export function touch(what = 'edit') {
  state.dirty = true;
  persistCurrent();
  emit('doc', { source: what });
}

/* ── saved library ───────────────────────────────────────────── */

export function listSaved() {
  const lib = library.load([]);
  return Array.isArray(lib) ? lib.map(({ id, name, updated }) => ({ id, name, updated })).sort((a, b) => (b.updated || '').localeCompare(a.updated || '')) : [];
}

function writeLib(lib) {
  const ok = library.save(lib);
  if (!ok) emit('storage-failed');
  return ok;
}

export function saveCurrent(name) {
  const lib = library.load([]);
  const now = new Date().toISOString();
  const doc = structuredClone(state.doc);
  if (name) doc.meta.title = name;
  let entry = state.docId ? lib.find((x) => x.id === state.docId) : null;
  if (entry) { entry.doc = doc; entry.name = name || entry.name; entry.updated = now; }
  else { entry = { id: newId(), name: name || doc.meta.title || 'Untitled resume', updated: now, doc }; lib.push(entry); state.docId = entry.id; }
  state.doc.meta.title = entry.name;
  if (!writeLib(lib)) return null;
  state.dirty = false;
  persistCurrent();
  emit('library');
  return entry.id;
}

export function saveAsNew(name) {
  state.docId = null;
  return saveCurrent(name);
}

export function loadSaved(id) {
  const entry = library.load([]).find((x) => x.id === id);
  if (!entry) return false;
  state.doc = normalizeResume(entry.doc).model;
  state.docId = id;
  state.dirty = false;
  persistCurrent();
  emit('doc', { source: 'load' });
  emit('library');
  return true;
}

export function renameSaved(id, name) {
  const lib = library.load([]);
  const e = lib.find((x) => x.id === id);
  if (!e) return false;
  e.name = name; e.doc.meta.title = name; e.updated = new Date().toISOString();
  if (id === state.docId) state.doc.meta.title = name;
  writeLib(lib); emit('library'); return true;
}

export function duplicateSaved(id) {
  const lib = library.load([]);
  const e = lib.find((x) => x.id === id);
  if (!e) return null;
  const copy = { id: newId(), name: `${e.name} (copy)`, updated: new Date().toISOString(), doc: structuredClone(e.doc) };
  copy.doc.meta.title = copy.name;
  lib.push(copy); writeLib(lib); emit('library');
  return copy.id;
}

export function deleteSaved(id) {
  const lib = library.load([]).filter((x) => x.id !== id);
  writeLib(lib);
  if (state.docId === id) { state.docId = null; persistCurrent(); }
  emit('library');
}

export function resetAll() {
  current.clear(); library.clear(); prefs.clear(); safeRemove(V1_KEY);
  state.doc = blankResume(); state.docId = null; state.dirty = false;
  emit('doc', { source: 'reset' }); emit('library');
}
