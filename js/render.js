// Render the resume model to the sheet's HTML. Pure string functions so the
// same code draws the live preview, every Catalog thumbnail, the standalone
// HTML export, and runs under node for tests. DOM attachment is mountSheet().

import { escHtml } from './utils.js';
import { iconHtml } from './icons.js';
import { SECTION_TYPES, LEVEL_WORDS } from './schema.js';
import { resolveColors, resolveFonts, TEMPLATES, PAGES } from './design.js';

const PHOTO_MM = { sm: 28, md: 38, lg: 50 };

/* ───────────────────────── helpers ───────────────────────── */

export function safeHref(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u)) return `https://${u}`;
  return '';
}

/** Minimal inline markdown over escaped text: **bold**, *italic*, [text](http url). */
export function inlineMd(text) {
  let s = escHtml(text);
  s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, (m, t, u) => `<a href="${u}">${t}</a>`);
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
  return s;
}

const paragraphs = (text) => String(text || '').trim().split(/\n{2,}/).filter(Boolean)
  .map((p) => `<p>${inlineMd(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');

const RANGE_SEP = ' \u2013 ';
const range = (start, end) => (start && end ? `${start}${RANGE_SEP}${end}` : start || end || '');
const sep = '<span class="r-sep">\u203a</span>';
const dot = '<span class="r-sep">\u00b7</span>';
const join = (parts, s = dot) => parts.filter(Boolean).join(s);
const linkOr = (url, inner) => { const h = safeHref(url); return h ? `<a href="${escHtml(h)}">${inner}</a>` : inner; };
const cap = (s) => String(s || '').replace(/^\w/, (c) => c.toUpperCase());

function levelMark(style, n) {
  const lvl = Math.max(0, Math.min(5, n | 0));
  if (!lvl) return '';
  if (style === 'bars') return `<span class="r-bar" style="--lvl:${lvl}"><i></i></span>`;
  if (style === 'dots') return `<span class="r-dots">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</span>`;
  if (style === 'hearts') return `<span class="r-hearts">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= lvl ? 'on' : ''}">\u2665</i>`).join('')}</span>`;
  return `<span class="r-lvl">${escHtml(LEVEL_WORDS[lvl] || '')}</span>`;
}

/* ───────────────────────── section renderers ───────────────────────── */

function renderEntries(s, kind, design) {
  const items = s.items.map((it) => {
    let head = '';
    let meta = [];
    let sub = [];
    if (kind === 'experience') {
      head = it.role || it.company;
      meta = [linkOr(it.url, escHtml(it.company)), escHtml(it.team)];
      const dates = range(it.start, it.end);
      const metaHtml = join(meta, ` ${sep} `) + (dates ? ` <span class="r-entry-dates">(${escHtml(dates)})</span>` : '');
      sub = [escHtml(it.location)];
      return entryHtml(head, metaHtml, sub, it.summary, it.highlights, design);
    }
    if (kind === 'education') {
      head = it.degree || it.school;
      const school = it.degree ? linkOr(it.url, escHtml(it.school)) : '';
      const metaHtml = join([school, escHtml(it.field), escHtml(range(it.start, it.end))]);
      sub = [escHtml(it.location), escHtml(it.score)];
      return entryHtml(head, metaHtml, sub, it.notes, [], design);
    }
    if (kind === 'projects') {
      head = it.name;
      const metaHtml = join([escHtml(it.role), escHtml(range(it.start, it.end)), it.url ? linkOr(it.url, escHtml(it.url.replace(/^https?:\/\//, ''))) : '']);
      return entryHtml(linkOr(it.url, escHtml(head)), metaHtml, [], it.summary, it.highlights, design, true);
    }
    // volunteer
    head = it.role || it.org;
    const metaHtml = join([linkOr(it.url, escHtml(it.org)), escHtml(range(it.start, it.end))]);
    return entryHtml(head, metaHtml, [escHtml(it.location)], it.summary, it.highlights, design);
  });
  return `<div class="r-entries">${items.join('')}</div>`;
}

function entryHtml(head, metaHtml, sub, summary, highlights, design, headIsHtml = false) {
  const subHtml = join(sub);
  return `<div class="r-entry">
<div class="r-entry-head">${headIsHtml ? head : escHtml(head)}</div>
${metaHtml ? `<div class="r-entry-meta">${metaHtml}</div>` : ''}
${subHtml ? `<div class="r-entry-sub">${subHtml}</div>` : ''}
${summary ? `<div class="r-entry-summary">${paragraphs(summary)}</div>` : ''}
${highlights?.length ? `<ul class="r-bullets">${highlights.map((h) => `<li>${inlineMd(h)}</li>`).join('')}</ul>` : ''}
</div>`;
}

function renderSkills(s, design) {
  const style = s.style || design.skills || 'tags';
  const groups = [];
  for (const it of s.items) {
    if (!it.name) continue;
    const g = it.group || '';
    let grp = groups.find((x) => x.name === g);
    if (!grp) { grp = { name: g, items: [] }; groups.push(grp); }
    grp.items.push(it);
  }
  const hasGroups = groups.some((g) => g.name);
  const list = (items) => {
    if (style === 'tags') return `<ul class="r-tags">${items.map((it) => `<li class="r-tag">${escHtml(it.name)}${it.level ? levelMark('word', it.level) : ''}</li>`).join('')}</ul>`;
    if (style === 'bars' || style === 'dots' || style === 'hearts') return `<ul class="r-levels">${items.map((it) => `<li><span class="r-lvl-name">${escHtml(it.name)}</span>${levelMark(style, it.level)}</li>`).join('')}</ul>`;
    if (style === 'grid') return `<ul class="r-grid2 r-plainlist">${items.map((it) => `<li>${escHtml(it.name)}${it.level ? ` ${levelMark('word', it.level)}` : ''}</li>`).join('')}</ul>`;
    return `<ul class="r-plainlist">${items.map((it) => `<li>${escHtml(it.name)}${it.level ? ` ${levelMark('word', it.level)}` : ''}</li>`).join('')}</ul>`;
  };
  if (!hasGroups) return list(s.items.filter((it) => it.name));
  return groups.map((g) => `<div class="r-group">${g.name ? `<div class="r-group-label">${escHtml(g.name)}</div>` : ''}${list(g.items)}</div>`).join('');
}

function renderLanguages(s) {
  const style = s.style || 'list';
  const items = s.items.filter((it) => it.name);
  if (style === 'tags') return `<ul class="r-tags">${items.map((it) => `<li class="r-tag">${escHtml(it.name)}${it.level ? `<span class="r-lvl">${escHtml(it.level)}</span>` : ''}</li>`).join('')}</ul>`;
  if (style === 'bars' || style === 'dots') return `<ul class="r-levels">${items.map((it) => `<li><span class="r-lvl-name">${escHtml(it.name)}${it.level ? ` <span class="r-lvl">${escHtml(it.level)}</span>` : ''}</span>${levelMark(style, it.score)}</li>`).join('')}</ul>`;
  return `<ul class="r-plainlist">${items.map((it) => `<li>${escHtml(it.name)}${it.level ? `: <span class="r-lvl">${escHtml(it.level)}</span>` : ''}</li>`).join('')}</ul>`;
}

function renderIconRow(s, design) {
  const style = s.style || design.icons || 'tiles';
  const items = s.items.filter((it) => it.label || it.icon || it.url);
  const tile = (it) => {
    const ico = iconHtml(it.icon, it.url);
    const title = escHtml(it.label || it.url || '');
    const inner = `<span class="r-tile" title="${title}" aria-label="${title}">${ico}</span>`;
    return linkOr(it.url, inner);
  };
  if (style === 'list') {
    return `<ul class="r-tiles is-list i-tiles">${items.map((it) => `<li>${tile(it)}<span>${escHtml(it.label || '')}</span>${it.url ? `<span class="r-url">${escHtml(it.url.replace(/^https?:\/\/(www\.)?/, ''))}</span>` : ''}</li>`).join('')}</ul>`;
  }
  return `<ul class="r-tiles i-${style}">${items.map((it) => `<li>${tile(it)}</li>`).join('')}</ul>`;
}

function renderList(s, design) {
  const style = s.style || 'bullets';
  const mark = style === 'check' ? '\u2713' : style === 'plain' ? '' : design.bullet || '\u2022';
  const lis = s.items.filter((it) => it.text).map((it) => {
    const ico = it.icon ? iconHtml(it.icon, '') : '';
    const m = ico || (mark ? `<span class="r-mark">${escHtml(mark)}</span>` : '');
    return `<li>${m}<span>${inlineMd(it.text)}</span></li>`;
  }).join('');
  const list = `<ul class="r-facts">${lis}</ul>`;
  const img = s.image ? `<figure class="r-list-img"><img src="${escHtml(s.image)}" alt=""></figure>` : '';
  if (s.zone === 'aside' && (s.style === 'card' || (design.template === 'banner' && s.image))) return `<div class="r-listcard">${img}${list}</div>`;
  if (img) return `<div class="r-list-img-side">${img}${list}</div>`;
  return list;
}

function renderContact(m, design) {
  const b = m.basics;
  const rows = [];
  if (b.email) rows.push(`<li>${iconHtml('mail')}<a href="mailto:${escHtml(b.email)}">${escHtml(b.email)}</a></li>`);
  if (b.phone) rows.push(`<li>${iconHtml('phone')}<span>${escHtml(b.phone)}</span></li>`);
  if (b.location) rows.push(`<li>${iconHtml('pin')}<span>${escHtml(b.location)}</span></li>`);
  if (b.website) rows.push(`<li>${iconHtml('globe')}${linkOr(b.website, escHtml(b.website.replace(/^https?:\/\//, '')))}</li>`);
  for (const l of b.links) rows.push(`<li>${iconHtml(l.icon, l.url)}${linkOr(l.url, escHtml(l.label || l.url.replace(/^https?:\/\/(www\.)?/, '')))}</li>`);
  return `<ul class="r-contact-list">${rows.join('')}</ul>`;
}

function renderRows(s) {
  const li = (head, meta, text, quote = false) => `<li>${head ? `<div class="r-row-head">${head}</div>` : ''}${meta ? `<div class="r-row-meta">${meta}</div>` : ''}${text ? `<div class="${quote ? 'r-quote' : 'r-row-text'}">${paragraphs(text)}</div>` : ''}</li>`;
  let rows = '';
  switch (s.type) {
    case 'certifications':
      rows = s.items.filter((it) => it.name).map((it) => li(linkOr(it.url, escHtml(it.name)), join([escHtml(it.issuer), escHtml(it.date), it.id ? `ID ${escHtml(it.id)}` : '']), '')).join('');
      break;
    case 'awards':
      rows = s.items.filter((it) => it.title).map((it) => li(escHtml(it.title), join([escHtml(it.issuer), escHtml(it.date)]), it.summary)).join('');
      break;
    case 'publications':
      rows = s.items.filter((it) => it.title).map((it) => li(linkOr(it.url, escHtml(it.title)), join([escHtml(it.publisher), escHtml(it.date)]), it.summary)).join('');
      break;
    case 'references':
      rows = s.items.filter((it) => it.name).map((it) => li(escHtml(it.name), join([escHtml(it.role), escHtml(it.contact)]), it.text ? `\u201c${it.text}\u201d` : '', true)).join('');
      break;
    default: break;
  }
  return `<ul class="r-rows">${rows}</ul>`;
}

function renderGaming(s) {
  const d = s.data || {};
  const out = [];
  const stat = (v, l) => `<div class="r-stat"><b>${escHtml(v)}</b><span>${escHtml(l)}</span></div>`;
  if (d.psn?.username) {
    const st = d.psn.stats || {};
    const t = st.trophies || {};
    out.push(`<div class="r-stats-label">PSN ${dot} ${escHtml(d.psn.username)}</div><div class="r-stats">${[
      st.level !== undefined ? stat(st.level, 'level') : '',
      st.games !== undefined ? stat(st.games, 'games') : '',
      t.platinum !== undefined ? stat(t.platinum, 'platinum') : '',
      t.gold !== undefined ? stat(t.gold, 'gold') : '',
      t.silver !== undefined ? stat(t.silver, 'silver') : '',
      t.bronze !== undefined ? stat(t.bronze, 'bronze') : '',
    ].join('')}</div>`);
  }
  if (d.steam?.id) {
    const st = d.steam.stats || {};
    out.push(`<div class="r-stats-label">Steam ${dot} ${escHtml(d.steam.id)}</div><div class="r-stats">${[
      st.games !== undefined ? stat(st.games, 'games') : '',
      st.playtime !== undefined ? stat(`${Math.round(st.playtime)}h`, 'playtime') : '',
    ].join('')}</div>${st.recentGames?.length ? `<div class="r-row-meta">Recent: ${escHtml(st.recentGames.slice(0, 3).map((g) => g.name).join(', '))}</div>` : ''}`);
  }
  return out.join('') || '<div class="r-row-meta">No gaming account set</div>';
}

function sectionBody(m, s, design) {
  switch (s.type) {
    case 'text': return `<div class="r-text-body ${s.style === 'quote' ? 'r-text-quote' : s.style === 'compact' ? 'r-text-compact' : ''}">${paragraphs(s.text)}</div>`;
    case 'experience': case 'education': case 'projects': case 'volunteer': return renderEntries(s, s.type, design);
    case 'skills': return renderSkills(s, design);
    case 'languages': return renderLanguages(s);
    case 'iconrow': return renderIconRow(s, design);
    case 'list': return renderList(s, design);
    case 'tags': return `<ul class="r-tags">${s.items.filter((it) => it.name).map((it) => `<li class="r-tag">${escHtml(it.name)}</li>`).join('')}</ul>`;
    case 'contact': return renderContact(m, design);
    case 'certifications': case 'awards': case 'publications': case 'references': return renderRows(s);
    case 'gaming': return renderGaming(s);
    default: return '';
  }
}

export function renderSection(m, s, design = m.design) {
  if (s.hidden) return '';
  const def = SECTION_TYPES[s.type] || SECTION_TYPES.text;
  const body = sectionBody(m, s, design);
  if (!body) return '';
  const cols = s.columns > 1 ? ` style="columns:${s.columns};column-gap:6mm"` : '';
  return `<section class="r-sec r-sec-${s.type}" data-sid="${escHtml(s.id)}">
${s.title ? `<h2 class="r-sec-title">${escHtml(s.title)}</h2>` : ''}
<div class="r-sec-body"${cols}>${body}</div>
</section>`;
}

/* ───────────────────────── header pieces ───────────────────────── */

function photoHtml(m, design) {
  if (!m.basics.photo || design.photo.shape === 'none') return '';
  return `<div class="r-photo-wrap"><div class="r-photo"><img src="${escHtml(m.basics.photo)}" alt=""></div></div>`;
}

function contactRow(m) {
  const b = m.basics;
  const parts = [];
  if (b.email) parts.push(`<a href="mailto:${escHtml(b.email)}">${iconHtml('mail')}${escHtml(b.email)}</a>`);
  if (b.phone) parts.push(`<span>${iconHtml('phone')}${escHtml(b.phone)}</span>`);
  if (b.location) parts.push(`<span>${iconHtml('pin')}${escHtml(b.location)}</span>`);
  if (b.website) parts.push(linkOr(b.website, `${iconHtml('globe')}${escHtml(b.website.replace(/^https?:\/\//, ''))}`).replace('<a ', '<a class="r-web" '));
  return parts.length ? `<div class="r-contact">${parts.join('')}</div>` : '';
}

function linksRow(m, design) {
  const links = m.basics.links.filter((l) => l.url || l.label);
  if (!links.length) return '';
  const style = design.links || 'icons';
  return `<div class="r-links l-${style}">${links.map((l) => {
    const label = escHtml(l.label || l.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
    return linkOr(l.url, `${iconHtml(l.icon, l.url)}<span class="r-lbl">${label}</span>`) || `<span>${iconHtml(l.icon, l.url)}<span class="r-lbl">${label}</span></span>`;
  }).join('')}</div>`;
}

function nameBlock(m) {
  return `<div class="r-name-block"><h1 class="r-name">${escHtml(m.basics.name || 'Your name')}</h1>${m.basics.title ? `<p class="r-title">${escHtml(m.basics.title)}</p>` : ''}</div>`;
}

/* ───────────────────────── sheet ───────────────────────── */

export function sheetClasses(design) {
  return [
    'sheet', `t-${design.template}`, `h-${design.headings}`, `e-${design.entries}`, `i-${design.icons}`, `d-${design.density}`,
    `side-${design.columns.side}`, `bs-${design.banner.shape}`, `bh-${design.banner.height}`, `bp-${design.banner.pattern}`,
    `ps-${design.photo.shape}`, `pz-${design.photo.size}`, design.photo.ring ? 'ring-on' : 'ring-off',
  ].join(' ');
}

export function sheetStyle(design) {
  const c = resolveColors(design);
  const f = resolveFonts(design.fonts);
  const page = PAGES[design.page] || PAGES.A4;
  const hasImg = !!design.banner.image;
  const ring = design.photo.ringColor || (design.template === 'split' || design.template === 'classic' || design.template === 'stripe' ? c.accent : c.page);
  const vars = {
    '--r-band': c.band, '--r-band-text': c.bandText, '--r-accent': c.accent, '--r-tile': c.tile, '--r-heading': c.heading,
    '--r-text': c.text, '--r-muted': c.muted, '--r-rule': c.rule, '--r-page': c.page, '--r-card': c.card, '--r-ring': ring,
    '--r-font-h': `'${f.heading.replace(/'/g, '')}'`, '--r-font-b': `'${f.body.replace(/'/g, '')}'`, '--r-scale': design.fontScale || 1,
    '--r-page-w': `${page.w}mm`, '--r-page-h': `${page.h}mm`, '--r-aside-w': `${design.columns.width}%`,
    '--r-photo': `${PHOTO_MM[design.photo.size] || 38}mm`,
    '--r-dim': hasImg ? (design.banner.dim / 100).toFixed(2) : '0',
    '--r-banner-img': hasImg ? `url("${design.banner.image.replace(/["\\]/g, '')}")` : 'none',
    '--r-bullet': `'${(design.bullet || '\u2022').replace(/['\\]/g, '')}'`,
  };
  return Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
}

/** The full sheet as an HTML string. */
export function renderResume(m) {
  const design = m.design;
  const tpl = TEMPLATES[design.template] || TEMPLATES.banner;
  const hasContactSection = m.sections.some((s) => s.type === 'contact' && !s.hidden);
  const aside = tpl.aside ? m.sections.filter((s) => s.zone === 'aside') : [];
  const main = tpl.aside ? m.sections.filter((s) => s.zone !== 'aside') : m.sections;
  const secs = (list) => list.map((s) => renderSection(m, s, design)).join('\n');
  const photo = photoHtml(m, design);
  const contact = hasContactSection ? '' : contactRow(m);
  const links = linksRow(m, design);
  const lang = escHtml(m.meta?.lang || 'en');
  let inner = '';
  if (design.template === 'banner') {
    inner = `<header class="r-banner"><div class="r-banner-bg"></div><div class="r-banner-inner">${nameBlock(m)}${contact}${links}</div></header>
<div class="r-body">
<aside class="r-aside${photo ? '' : ' no-photo'}">${photo}${secs(aside)}</aside>
<main class="r-main">${contact}${secs(main)}</main>
</div>`;
  } else if (design.template === 'sidebar') {
    inner = `<div class="r-body">
<aside class="r-aside">${photo}${secs(aside)}</aside>
<main class="r-main"><header class="r-head">${nameBlock(m)}${contact}${links}</header>${secs(main)}</main>
</div>`;
  } else if (design.template === 'classic') {
    inner = `<header class="r-head">${photo}${nameBlock(m)}${contact}${links}</header>
<div class="r-body r-body-single"><main class="r-main">${secs(main)}</main></div>`;
  } else {
    // split, stripe, cards: header row, then two columns
    const headInner = design.template === 'stripe'
      ? `<div>${nameBlock(m)}${contact}${links}</div>${photo}`
      : `${photo}<div>${nameBlock(m)}${contact}${links}</div>`;
    inner = `<header class="r-head">${headInner}</header>
<div class="r-body">
<aside class="r-aside">${secs(aside)}</aside>
<main class="r-main">${secs(main)}</main>
</div>`;
  }
  return `<article class="${sheetClasses(design)}" style="${sheetStyle(design)}" lang="${lang}">${inner}</article>`;
}

/** @page rule for the document's paper size; inject into <head> before printing. */
export function pageCss(design) {
  const page = PAGES[design.page] || PAGES.A4;
  return `@page { size: ${page.w}mm ${page.h}mm; margin: 0; }`;
}

/** Replace a container's content with the rendered sheet; returns the <article>. */
export function mountSheet(container, m) {
  container.innerHTML = renderResume(m);
  return container.firstElementChild;
}
