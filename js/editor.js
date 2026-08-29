// The form editor: basics, links, and the ordered section list. Generated from
// the section registry (SECTION_TYPES[type].fields), so every input carries a
// data-path into the model and events.js needs no per-type code.
import { state } from './state.js';
import { escHtml, getPath } from './utils.js';
import { gamingError } from './gaming.js';
import { SECTION_TYPES, TYPE_IDS, LEVEL_WORDS } from './schema.js';
import { iconHtml, iconTitle, detectIcon } from './icons.js';
import { designControlsHtml } from './design-panel.js';
import { TEMPLATES } from './design.js';
import { LANGS, resolveLang } from './i18n.js';

const field = (path, f, value) => {
  const w = f.w === 'half' ? 'w-half' : 'w-full';
  const id = `f-${path.replace(/\./g, '-')}`;
  let ctl = '';
  switch (f.kind) {
    case 'textarea':
      ctl = `<textarea id="${id}" data-path="${path}" rows="3" placeholder="${escHtml(f.ph || '')}">${escHtml(value || '')}</textarea>`; break;
    case 'lines':
      ctl = `<textarea id="${id}" data-path="${path}" data-kind="lines" rows="4" placeholder="One per line">${escHtml((value || []).join('\n'))}</textarea>`; break;
    case 'level':
      ctl = `<div class="level-pick" role="radiogroup" aria-label="${escHtml(f.label)}">${[1, 2, 3, 4, 5].map((n) =>
        `<button type="button" class="${n <= (value | 0) ? 'on' : ''}" data-act="level-set" data-path="${path}" data-value="${n}" role="radio" aria-checked="${n === (value | 0)}" title="${escHtml(LEVEL_WORDS[n])}" aria-label="${n} of 5"></button>`).join('')}
        <button type="button" class="btn btn-sm btn-ghost" data-act="level-set" data-path="${path}" data-value="0" title="No level">×</button></div>`; break;
    case 'icon': {
      const urlPath = path.replace(/\.icon$/, '.url');
      ctl = iconField(path, urlPath, value, '');
      break;
    }
    case 'url':
      ctl = `<input id="${id}" type="url" data-path="${path}" value="${escHtml(value || '')}" placeholder="${escHtml(f.ph || 'https://')}">`; break;
    default:
      ctl = `<input id="${id}" type="text" data-path="${path}" value="${escHtml(value || '')}" placeholder="${escHtml(f.ph || '')}">`;
  }
  return `<div class="field ${w}"><label for="${id}">${escHtml(f.label)}</label>${ctl}</div>`;
};

export function iconField(path, urlPath, value, url) {
  const shown = value || detectIcon(url);
  const name = value ? (iconTitle(value) || (value.length > 24 ? 'image' : value)) : `auto${shown && shown !== 'link' ? `: ${iconTitle(shown) || shown}` : ''}`;
  return `<div class="icon-field">
    <span class="icon-preview" data-icon-preview="${path}">${iconHtml(value, url)}</span>
    <span class="icon-name">${escHtml(name)}</span>
    <button type="button" class="btn btn-sm" data-act="pick-icon" data-path="${path}" data-url-path="${urlPath}">Pick</button>
  </div>`;
}

function itemCard(secIdx, itemIdx, sec, def) {
  const it = sec.items[itemIdx];
  const base = `sections.${secIdx}.items.${itemIdx}`;
  const head = def.head ? def.head(it) : '';
  const n = sec.items.length;
  return `<div class="item-card" data-item="${itemIdx}" data-sec="${secIdx}">
    <div class="item-head">
      <span class="drag-handle" data-drag="item" data-sec="${secIdx}" data-idx="${itemIdx}" title="Drag to reorder" aria-label="Drag handle">⋮⋮</span>
      <span class="item-name" data-item-name="${base}">${escHtml(head || `Item ${itemIdx + 1}`)}</span>
      <button type="button" class="btn btn-ghost" data-act="move-item" data-sec="${secIdx}" data-idx="${itemIdx}" data-dir="-1" ${itemIdx === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
      <button type="button" class="btn btn-ghost" data-act="move-item" data-sec="${secIdx}" data-idx="${itemIdx}" data-dir="1" ${itemIdx === n - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
      <button type="button" class="btn btn-ghost" data-act="del-item" data-sec="${secIdx}" data-idx="${itemIdx}" aria-label="Remove item">✕</button>
    </div>
    <div class="grid-2">${def.fields.map((f) => f.kind === 'icon' ? `<div class="field w-half"><label>${escHtml(f.label)}</label>${iconField(`${base}.icon`, `${base}.url`, it.icon, it.url)}</div>` : field(`${base}.${f.key}`, f, it[f.key])).join('')}</div>
  </div>`;
}

/**
 * One typed number. `data-kind="int"` is the whole-number kind added for this block:
 * the older `data-kind="number"` falls back to 1, which is right for the Columns select
 * and wrong for a trophy count of zero. `data-kind="num"` keeps one decimal, for hours.
 * An empty box is left empty rather than shown as 0, so "not filled in" and "zero" stay
 * different on screen; `stats` becomes an object the moment any one of these is typed.
 */
const statField = (path, label, kind = 'int', max = 999999) =>
  `<div class="field w-half"><label for="f-${path.replace(/\./g, '-')}">${escHtml(label)}</label>
    <input id="f-${path.replace(/\./g, '-')}" type="number" inputmode="numeric" min="0" max="${max}"${kind === 'num' ? ' step="0.1"' : ' step="1"'} data-path="${path}" data-kind="${kind}" value="${escHtml(getPath(state.doc, path) ?? '')}"></div>`;

/**
 * The gaming block: two accounts, each with a fetch that may never work and a set of
 * fields that always does.
 *
 * Manual entry is not the fallback here, it is the feature. PSN is retired at the worker
 * (410, no upstream call: the source blocks automated requests), and Steam needs a Web API
 * key this site may never hold, in which case the worker answers 501 for good. Only Steam
 * keeps a Fetch button, because a configured key does make it work; PSN has none, because
 * every outcome it has left is an error. Nothing below either account is behind a button:
 * every number is reachable by typing, without ever pressing Fetch (CONTRACTS.md C8).
 *
 * The error line shows the worker's own `message` and `hint`, which are written to be read
 * by a person, and it is read from the Map in `gaming.js` rather than from the model, so no
 * failed fetch can reach localStorage, the YAML or an export.
 */
function gamingBlock(sec, base) {
  const d = sec.data || { psn: {}, steam: {} };
  const err = gamingError(sec.id);
  // `fetchable: false` prints no Fetch button at all. PSN is retired at the worker and can
  // only ever answer 410, so an enabled control there is a dead end: its single possible
  // outcome is an error line. Removing it is the structure saying what the prose says, that
  // typing the numbers in is the path here and not the fallback (CONTRACTS.md C8).
  const account = (provider, label, keyPath, ph, note, fetchable = true) => `<div class="field w-full">
      <label for="f-${keyPath.replace(/\./g, '-')}">${escHtml(label)}</label>
      <div class="field-row">
        <input id="f-${keyPath.replace(/\./g, '-')}" type="text" data-path="${keyPath}" value="${escHtml(getPath(state.doc, keyPath) || '')}" placeholder="${escHtml(ph)}">
        ${fetchable ? `<button type="button" class="btn btn-sm" data-act="fetch-${provider}" data-sec="${base.split('.')[1]}">Fetch</button>` : ''}
      </div>
      <span class="empty-note">${escHtml(note)}</span>
    </div>`;
  const clear = (provider, has) => has
    ? `<div class="row-actions"><button type="button" class="btn btn-sm btn-ghost" data-act="gaming-clear" data-sec="${base.split('.')[1]}" data-provider="${provider}">Clear these numbers</button></div>`
    : '';
  return `<div class="gaming-block">
    ${err ? `<p class="field-error" role="alert">${escHtml(err.message)}${err.hint ? ` ${escHtml(err.hint)}` : ''}</p>` : ''}
    <div class="grid-2">
      ${account('psn', 'PSN username', `${base}.data.psn.username`, 'your-psn-id', 'Names the PSN block on the sheet. There is no fetch for PSN: it is retired, so the numbers below are typed in.', false)}
      ${statField(`${base}.data.psn.stats.level`, 'Level', 'int', 999)}
      ${statField(`${base}.data.psn.stats.games`, 'Games played', 'int')}
      ${statField(`${base}.data.psn.stats.trophies.platinum`, 'Platinum trophies')}
      ${statField(`${base}.data.psn.stats.trophies.gold`, 'Gold trophies')}
      ${statField(`${base}.data.psn.stats.trophies.silver`, 'Silver trophies')}
      ${statField(`${base}.data.psn.stats.trophies.bronze`, 'Bronze trophies')}
    </div>
    ${clear('psn', !!d.psn?.stats)}
    <div class="grid-2">
      ${account('steam', 'Steam ID (17 digits)', `${base}.data.steam.id`, '76561197960287930', 'Names the Steam block on the sheet. A profile URL under /profiles/ ends in the 17 digit ID.')}
      ${statField(`${base}.data.steam.stats.games`, 'Games owned', 'int')}
      ${statField(`${base}.data.steam.stats.playtime`, 'Hours played', 'num')}
    </div>
    ${clear('steam', !!d.steam?.stats)}
    <p class="empty-note">A block only appears on the sheet once its username or ID is filled in. Whatever is typed here is saved in the resume and exported with it.</p>
  </div>`;
}

function sectionBlock(sec, i) {
  const def = SECTION_TYPES[sec.type] || SECTION_TYPES.text;
  const open = state.ui.open[sec.id] ? ' open' : '';
  const n = state.doc.sections.length;
  const base = `sections.${i}`;
  let body = '';
  const opts = [];
  if (def.styles?.length) {
    opts.push(`<label>Style <select data-path="${base}.style"><option value="">default</option>${def.styles.map((s) => `<option value="${s}" ${sec.style === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>`);
  }
  if (sec.type === 'iconrow') {
    opts.push(`<label title="Mirror the links typed in Basics, so socials are written once"><input type="checkbox" data-path="${base}.source" data-kind="flag" data-on="basics" ${sec.source === 'basics' ? 'checked' : ''}> use the links from Basics</label>`);
  }
  if (def.fields.length && sec.type !== 'iconrow') {
    opts.push(`<label>Columns <select data-path="${base}.columns" data-kind="number"><option value="1" ${!sec.columns || sec.columns === 1 ? 'selected' : ''}>1</option><option value="2" ${sec.columns === 2 ? 'selected' : ''}>2</option><option value="3" ${sec.columns === 3 ? 'selected' : ''}>3</option></select></label>`);
  }
  if (def.hasText) body += `<div class="field"><label>Text (blank line between paragraphs; **bold**, *italic*, [link](https://…))</label><textarea data-path="${base}.text" rows="6">${escHtml(sec.text)}</textarea></div>`;
  if (sec.source === 'basics') {
    body += `<p class="empty-note">Shows the ${state.doc.basics.links.length} link${state.doc.basics.links.length === 1 ? '' : 's'} from Basics as tiles. Edit them up there; icons, labels and order follow. Hide the copy beside the name in Design › Header links if you want them only here.</p>`;
  } else if (def.fields.length) {
    body += sec.items.map((_, j) => itemCard(i, j, sec, def)).join('');
    body += `<div class="row-actions"><button type="button" class="btn btn-sm" data-act="add-item" data-sec="${i}">+ Add ${escHtml(def.label.toLowerCase().replace(/s$/, '').replace('icon row', 'icon'))}</button></div>`;
  }
  if (def.hasImage) {
    body += `<div class="field"><label>Picture beside the list (optional)</label><div class="photo-field">${sec.image ? `<img class="photo-thumb" src="${escHtml(sec.image)}" alt="">` : ''}<label class="btn btn-sm btn-file">Upload…<input type="file" data-file="section-image" data-sec="${i}" accept="image/*" hidden></label>${sec.image ? `<button type="button" class="btn btn-sm" data-act="section-image-clear" data-sec="${i}">Remove</button>` : ''}</div></div>`;
  }
  if (def.fromBasics) body += `<p class="empty-note">Renders email, phone, location, website and the links from Basics. Edit them up there.</p>`;
  if (def.hasData) body += gamingBlock(sec, base);
  return `<details class="block ${sec.hidden ? 'is-hidden' : ''}" data-sid="${sec.id}" data-sec-idx="${i}"${open}>
    <summary>
      <span class="drag-handle" data-drag="sec" data-sec="${i}" title="Drag to reorder or to the other column" aria-label="Drag handle">⋮⋮</span>
      <input class="block-title-input" type="text" data-path="${base}.title" value="${escHtml(sec.title)}" placeholder="${escHtml(def.title)}" aria-label="Section title">
      <button type="button" class="block-kind ${sec.zone === 'aside' ? 'is-aside' : ''}" data-act="zone-toggle" data-sec="${i}" title="Move to the ${sec.zone === 'aside' ? 'main' : 'side'} column">${escHtml(def.label)} · ${sec.zone === 'aside' ? 'side' : 'main'}</button>
      <span class="block-tools">
        <button type="button" class="btn btn-ghost" data-act="move-section" data-sec="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up" title="Move up">↑</button>
        <button type="button" class="btn btn-ghost" data-act="move-section" data-sec="${i}" data-dir="1" ${i === n - 1 ? 'disabled' : ''} aria-label="Move down" title="Move down">↓</button>
        <button type="button" class="btn btn-ghost" data-act="hide-toggle" data-sec="${i}" title="${sec.hidden ? 'Show' : 'Hide'} on the sheet">${sec.hidden ? '◌' : '◉'}</button>
        <button type="button" class="btn btn-ghost" data-act="del-section" data-sec="${i}" aria-label="Delete section" title="Delete section">✕</button>
      </span>
    </summary>
    <div class="block-body">
      ${opts.length ? `<div class="inline-opts">${opts.join('')}</div>` : ''}
      ${body}
    </div>
  </details>`;
}

export function renderContentPanel() {
  const el = document.getElementById('panel-content');
  if (!el) return;
  const b = state.doc.basics;
  const scroll = el.parentElement.scrollTop;
  el.innerHTML = `
  <div class="basics-head"><h2>Basics</h2></div>
  <div class="grid-2">
    <div class="field w-half"><label for="f-name">Name</label><input id="f-name" type="text" data-path="basics.name" value="${escHtml(b.name)}" placeholder="Marina Costa"></div>
    <div class="field w-half"><label for="f-title">Title or headline</label><input id="f-title" type="text" data-path="basics.title" value="${escHtml(b.title)}" placeholder="Cloud Platform Engineer"></div>
    <div class="field w-half"><label for="f-email">Email</label><input id="f-email" type="email" data-path="basics.email" value="${escHtml(b.email)}" placeholder="you@example.com"></div>
    <div class="field w-half"><label for="f-phone">Phone</label><input id="f-phone" type="text" data-path="basics.phone" value="${escHtml(b.phone)}" placeholder="+351 912 345 678"></div>
    <div class="field w-half"><label for="f-location">Location</label><input id="f-location" type="text" data-path="basics.location" value="${escHtml(b.location)}" placeholder="Lisbon, Portugal"></div>
    <div class="field w-half"><label for="f-website">Website</label><input id="f-website" type="url" data-path="basics.website" value="${escHtml(b.website)}" placeholder="https://you.example"></div>
    <div class="field w-full"><label>Photo</label><div class="photo-field">
      ${b.photo ? `<img class="photo-thumb" src="${escHtml(b.photo)}" alt="">` : '<span class="photo-thumb" aria-hidden="true"></span>'}
      <label class="btn btn-sm btn-file">Upload photo…<input type="file" data-file="photo" accept="image/*" hidden></label>
      ${b.photo ? '<button type="button" class="btn btn-sm" data-act="clear-photo">Remove</button>' : ''}
      <span class="empty-note">Resized to 800px and stored inside the resume.</span>
    </div></div>
  </div>
  <div class="panel-h2">Links and socials</div>
  <div id="links-list">${b.links.map((l, i) => `<div class="item-card">
      <div class="item-head"><span class="item-name">${escHtml(l.label || l.url || `Link ${i + 1}`)}</span>
        <button type="button" class="btn btn-ghost" data-act="move-link" data-idx="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
        <button type="button" class="btn btn-ghost" data-act="move-link" data-idx="${i}" data-dir="1" ${i === b.links.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
        <button type="button" class="btn btn-ghost" data-act="del-link" data-idx="${i}" aria-label="Remove link">✕</button></div>
      <div class="grid-2">
        <div class="field w-half"><label>Label</label><input type="text" data-path="basics.links.${i}.label" value="${escHtml(l.label)}" placeholder="LinkedIn"></div>
        <div class="field w-half"><label>URL</label><input type="url" data-path="basics.links.${i}.url" value="${escHtml(l.url)}" placeholder="https://linkedin.com/in/you"></div>
        <div class="field w-full"><label>Icon</label>${iconField(`basics.links.${i}.icon`, `basics.links.${i}.url`, l.icon, l.url)}</div>
      </div></div>`).join('')}</div>
  <div class="row-actions">
    <button type="button" class="btn btn-sm" data-act="add-link">+ Add link</button>
    <button type="button" class="btn btn-sm" data-act="links-to-aside" title="Add an icon row in the side column that mirrors these links">⇥ Show as tiles in the side column</button>
    <span class="empty-note">Icons auto-detect from the URL (GitHub, LinkedIn, X, Mastodon …). Pick to override, upload one, or use the site's favicon.</span>
  </div>

  <div class="panel-h2">Sections</div>
  <div class="section-add-row">
    <select id="add-section-type" class="select-sm" aria-label="Section type">${TYPE_IDS.map((t) => `<option value="${t}">${escHtml(SECTION_TYPES[t].label)}</option>`).join('')}</select>
    <select id="add-section-zone" class="select-sm" aria-label="Zone"><option value="main">main column</option><option value="aside">side column</option></select>
    <button type="button" class="btn btn-sm btn-primary" data-act="add-section">+ Add</button>
    <button type="button" class="btn btn-sm" data-act="catalog" data-tab="sections">Browse types…</button>
  </div>
  ${sectionsListHtml()}`;
  el.parentElement.scrollTop = scroll;
}

function sectionsListHtml() {
  const secs = state.doc.sections;
  if (!secs.length) return '<div id="sections-list" class="zone-group" data-zone="main"><p class="empty-note">No sections yet. Add one above, or load an example from the Catalog.</p></div>';
  const hasAside = TEMPLATES[state.doc.design.template]?.aside;
  if (!hasAside) {
    return `<div id="sections-list" class="zone-group" data-zone="main"><p class="zone-note">The ${escHtml(state.doc.design.template)} template has one column; everything renders in this order. Side-column tags are kept for when you switch template.</p>${secs.map((s, i) => sectionBlock(s, i)).join('')}</div>`;
  }
  const main = secs.map((s, i) => [s, i]).filter(([s]) => s.zone !== 'aside');
  const aside = secs.map((s, i) => [s, i]).filter(([s]) => s.zone === 'aside');
  const group = (zone, label, list) => `<div class="zone-group" data-zone="${zone}">
    <div class="zone-head">${label} <span class="zone-count">${list.length}</span></div>
    ${list.map(([s, i]) => sectionBlock(s, i)).join('') || `<p class="zone-empty">Drop a section here, or use a block's column button.</p>`}
  </div>`;
  return `<div id="sections-list">${group('main', 'Main column', main)}${group('aside', `Side column (${state.doc.design.columns.side})`, aside)}</div>`;
}

// Document language, not a design token: designControlsHtml only receives the
// design object (and is shared with the Catalog), so the group is built here.
// The select shows the resolved language but writes only on an explicit change,
// so a regional tag like es-CL survives until the visitor actually switches.
const LANG_NAMES = { en: 'English', es: 'Español' };
function langGroupHtml(lang) {
  const cur = resolveLang(lang);
  const opts = LANGS.map(l => `<option value="${l}"${cur === l ? ' selected' : ''}>${escHtml(LANG_NAMES[l] || l)}</option>`).join('');
  return `<div class="ctl-group"><label class="ctl-label" for="f-meta-lang">Language</label>
    <select id="f-meta-lang" class="select-sm" data-path="meta.lang">${opts}</select>
    <p class="panel-hint" style="margin:6px 0 0">Changes the words the sheet prints and the default title of new sections; titles you typed stay as written.</p></div>`;
}

export function renderDesignPanel() {
  const el = document.getElementById('panel-design');
  if (!el) return;
  const scroll = el.parentElement.scrollTop;
  el.innerHTML = langGroupHtml(state.doc.meta.lang) + designControlsHtml(state.doc.design, { rich: false });
  el.parentElement.scrollTop = scroll;
}

/** Cheap refresh of one item's header label after typing, without re-rendering the panel. */
export function refreshItemName(path) {
  const m = /^(sections\.(\d+)\.items\.(\d+))\./.exec(path);
  if (!m) return;
  const sec = state.doc.sections[+m[2]];
  const it = sec?.items[+m[3]];
  const def = sec && SECTION_TYPES[sec.type];
  const el = document.querySelector(`[data-item-name="${m[1]}"]`);
  if (el && def?.head) el.textContent = def.head(it) || `Item ${+m[3] + 1}`;
  const lm = /^basics\.links\.(\d+)\./.exec(path);
  if (lm) {
    const l = state.doc.basics.links[+lm[1]];
    const card = document.querySelectorAll('#links-list .item-name')[+lm[1]];
    if (card && l) card.textContent = l.label || l.url || `Link ${+lm[1] + 1}`;
  }
}
