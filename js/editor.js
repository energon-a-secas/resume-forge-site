// The form editor: basics, links, and the ordered section list. Generated from
// the section registry (SECTION_TYPES[type].fields), so every input carries a
// data-path into the model and events.js needs no per-type code.
import { state } from './state.js';
import { escHtml } from './utils.js';
import { SECTION_TYPES, TYPE_IDS, LEVEL_WORDS } from './schema.js';
import { iconHtml, iconTitle, detectIcon } from './icons.js';
import { designControlsHtml } from './design-panel.js';

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
  return `<div class="item-card" data-item="${itemIdx}">
    <div class="item-head">
      <span class="item-name" data-item-name="${base}">${escHtml(head || `Item ${itemIdx + 1}`)}</span>
      <button type="button" class="btn btn-ghost" data-act="move-item" data-sec="${secIdx}" data-idx="${itemIdx}" data-dir="-1" ${itemIdx === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
      <button type="button" class="btn btn-ghost" data-act="move-item" data-sec="${secIdx}" data-idx="${itemIdx}" data-dir="1" ${itemIdx === n - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
      <button type="button" class="btn btn-ghost" data-act="del-item" data-sec="${secIdx}" data-idx="${itemIdx}" aria-label="Remove item">✕</button>
    </div>
    <div class="grid-2">${def.fields.map((f) => f.kind === 'icon' ? `<div class="field w-half"><label>${escHtml(f.label)}</label>${iconField(`${base}.icon`, `${base}.url`, it.icon, it.url)}</div>` : field(`${base}.${f.key}`, f, it[f.key])).join('')}</div>
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
  if (def.fields.length && sec.type !== 'iconrow') {
    opts.push(`<label>Columns <select data-path="${base}.columns" data-kind="number"><option value="1" ${!sec.columns || sec.columns === 1 ? 'selected' : ''}>1</option><option value="2" ${sec.columns === 2 ? 'selected' : ''}>2</option><option value="3" ${sec.columns === 3 ? 'selected' : ''}>3</option></select></label>`);
  }
  if (def.hasText) body += `<div class="field"><label>Text (blank line between paragraphs; **bold**, *italic*, [link](https://…))</label><textarea data-path="${base}.text" rows="6">${escHtml(sec.text)}</textarea></div>`;
  if (def.fields.length) {
    body += sec.items.map((_, j) => itemCard(i, j, sec, def)).join('');
    body += `<div class="row-actions"><button type="button" class="btn btn-sm" data-act="add-item" data-sec="${i}">+ Add ${escHtml(def.label.toLowerCase().replace(/s$/, '').replace('icon row', 'icon'))}</button></div>`;
  }
  if (def.hasImage) {
    body += `<div class="field"><label>Picture beside the list (optional)</label><div class="photo-field">${sec.image ? `<img class="photo-thumb" src="${escHtml(sec.image)}" alt="">` : ''}<label class="btn btn-sm btn-file">Upload…<input type="file" data-file="section-image" data-sec="${i}" accept="image/*" hidden></label>${sec.image ? `<button type="button" class="btn btn-sm" data-act="section-image-clear" data-sec="${i}">Remove</button>` : ''}</div></div>`;
  }
  if (def.fromBasics) body += `<p class="empty-note">Renders email, phone, location, website and the links from Basics. Edit them up there.</p>`;
  if (def.hasData) {
    const d = sec.data || { psn: {}, steam: {} };
    body += `<div class="grid-2">
      <div class="field"><label>PSN username</label><div class="field-row"><input type="text" data-path="${base}.data.psn.username" value="${escHtml(d.psn?.username || '')}"><button type="button" class="btn btn-sm" data-act="fetch-psn" data-sec="${i}">Fetch</button></div></div>
      <div class="field"><label>Steam ID (numeric)</label><div class="field-row"><input type="text" data-path="${base}.data.steam.id" value="${escHtml(d.steam?.id || '')}"><button type="button" class="btn btn-sm" data-act="fetch-steam" data-sec="${i}">Fetch</button></div></div>
    </div><p class="empty-note">${d.psn?.stats ? `PSN: level ${escHtml(d.psn.stats.level ?? '?')}, ${escHtml(d.psn.stats.games ?? '?')} games. ` : ''}${d.steam?.stats ? `Steam: ${escHtml(d.steam.stats.games ?? '?')} games, ${escHtml(Math.round(d.steam.stats.playtime || 0))}h.` : ''}${!d.psn?.stats && !d.steam?.stats ? 'Stats are fetched through the site worker and cached in the resume.' : ''}</p>`;
  }
  return `<details class="block ${sec.hidden ? 'is-hidden' : ''}" data-sid="${sec.id}"${open}>
    <summary>
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
    <div class="field w-half"><label for="f-name">Name</label><input id="f-name" type="text" data-path="basics.name" value="${escHtml(b.name)}" placeholder="Ada Reyes"></div>
    <div class="field w-half"><label for="f-title">Title or headline</label><input id="f-title" type="text" data-path="basics.title" value="${escHtml(b.title)}" placeholder="Cloud Architect"></div>
    <div class="field w-half"><label for="f-email">Email</label><input id="f-email" type="email" data-path="basics.email" value="${escHtml(b.email)}" placeholder="you@example.com"></div>
    <div class="field w-half"><label for="f-phone">Phone</label><input id="f-phone" type="text" data-path="basics.phone" value="${escHtml(b.phone)}" placeholder="+56 9 1234 5678"></div>
    <div class="field w-half"><label for="f-location">Location</label><input id="f-location" type="text" data-path="basics.location" value="${escHtml(b.location)}" placeholder="Santiago, Chile"></div>
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
  <div class="row-actions"><button type="button" class="btn btn-sm" data-act="add-link">+ Add link</button><span class="empty-note">Icons auto-detect from the URL (GitHub, LinkedIn, X, Mastodon …). Pick to override, upload one, or use the site's favicon.</span></div>

  <div class="panel-h2">Sections</div>
  <div class="section-add-row">
    <select id="add-section-type" class="select-sm" aria-label="Section type">${TYPE_IDS.map((t) => `<option value="${t}">${escHtml(SECTION_TYPES[t].label)}</option>`).join('')}</select>
    <select id="add-section-zone" class="select-sm" aria-label="Zone"><option value="main">main column</option><option value="aside">side column</option></select>
    <button type="button" class="btn btn-sm btn-primary" data-act="add-section">+ Add</button>
    <button type="button" class="btn btn-sm" data-act="catalog" data-tab="sections">Browse types…</button>
  </div>
  <div id="sections-list">${state.doc.sections.length ? state.doc.sections.map(sectionBlock).join('') : '<p class="empty-note">No sections yet. Add one above, or load an example from the Catalog.</p>'}</div>`;
  el.parentElement.scrollTop = scroll;
}

export function renderDesignPanel() {
  const el = document.getElementById('panel-design');
  if (!el) return;
  const scroll = el.parentElement.scrollTop;
  el.innerHTML = designControlsHtml(state.doc.design, { rich: false });
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
