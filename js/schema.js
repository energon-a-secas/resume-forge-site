// The resume model: what a YAML file maps to, what the editor edits, what the
// renderer reads. One registry of section types drives all three, so adding a
// kind of section is a data change here plus a renderer branch, not new UI.
//
// Shape (see template.yaml for the annotated YAML form):
//   { version, meta:{title,lang}, basics:{...}, sections:[...], design:{...} }
// A section: { id, type, title, zone:'main'|'aside', style, items:[...], text, image, columns, hidden }

import { defaultDesign, TEMPLATES, PALETTES, FONT_PAIRS, HEADING_STYLES, ENTRY_STYLES, ICON_STYLES,
  DENSITIES, SKILL_STYLES, LINK_STYLES, BANNER_SHAPES, BANNER_PATTERNS, BANNER_HEIGHTS,
  PHOTO_SHAPES, PHOTO_SIZES, PAGES } from './design.js';
import { pack, sectionTitle, resolveLang } from './i18n.js';

export const MODEL_VERSION = 2;

// Field kinds the editor knows how to draw:
//   text | textarea | lines (array of strings, one per line) | url | date | level (0-5)
//   | icon (icon picker) | image (file) | number
const F = (key, label, kind = 'text', extra = {}) => ({ key, label, kind, ...extra });

export const SECTION_TYPES = {
  text: {
    label: 'Text', title: 'Profile', zone: 'main', hasText: true,
    styles: ['paragraphs', 'quote', 'compact'], fields: [],
    desc: 'Free paragraphs. Summary, side projects, a cover note. Supports **bold**, *italic* and [links](https://).',
  },
  experience: {
    label: 'Experience', title: 'Experience', zone: 'main',
    fields: [
      F('role', 'Role', 'text', { ph: 'Platform Engineering Lead', w: 'half' }),
      F('company', 'Company', 'text', { ph: 'Fabrikam Logistics', w: 'half' }),
      F('team', 'Team or unit', 'text', { ph: 'Developer Platform', w: 'half' }),
      F('location', 'Location', 'text', { ph: 'Lisbon, Portugal', w: 'half' }),
      F('start', 'Start', 'date', { ph: 'Jan 2024', w: 'half' }),
      F('end', 'End', 'date', { ph: 'Present', w: 'half' }),
      F('url', 'Link', 'url', { ph: 'https://' }),
      F('summary', 'Summary', 'textarea', { ph: 'One or two lines on the role' }),
      F('highlights', 'Highlights, one per line', 'lines'),
    ],
    head: (it) => it.role || it.company,
    desc: 'Roles in reverse order: role, company, team, dates, bullets.',
  },
  education: {
    label: 'Education', title: 'Education', zone: 'main',
    fields: [
      F('degree', 'Degree', 'text', { ph: 'B.S. Computer Science', w: 'half' }),
      F('school', 'School', 'text', { ph: 'University of Lisbon', w: 'half' }),
      F('field', 'Field', 'text', { ph: 'Computer Science', w: 'half' }),
      F('location', 'Location', 'text', { ph: 'Lisbon, Portugal', w: 'half' }),
      F('start', 'Start', 'date', { ph: '2014', w: 'half' }),
      F('end', 'End', 'date', { ph: '2018', w: 'half' }),
      F('score', 'Score', 'text', { ph: 'GPA 3.8', w: 'half' }),
      F('url', 'Link', 'url', { ph: 'https://', w: 'half' }),
      F('notes', 'Notes', 'textarea', { ph: 'Thesis, honours, relevant courses' }),
    ],
    head: (it) => it.degree || it.school,
    desc: 'Degrees and courses with school, field and dates.',
  },
  skills: {
    label: 'Skills', title: 'Skills', zone: 'aside', styles: SKILL_STYLES,
    fields: [
      F('name', 'Skill', 'text', { ph: 'Kubernetes', w: 'half' }),
      F('group', 'Group', 'text', { ph: 'Platform', w: 'half' }),
      F('level', 'Level (0 hides it)', 'level'),
    ],
    head: (it) => it.name,
    desc: 'Tags, bars, dots, hearts or a plain list; optional groups and levels.',
  },
  languages: {
    label: 'Languages', title: 'Languages', zone: 'aside', styles: ['list', 'bars', 'dots', 'tags'],
    fields: [
      F('name', 'Language', 'text', { ph: 'Spanish', w: 'half' }),
      F('level', 'Level', 'text', { ph: 'Native', w: 'half' }),
      F('score', 'Score (0 hides it)', 'level'),
    ],
    head: (it) => it.name,
    desc: 'Language and proficiency, optionally as a 0 to 5 score.',
  },
  certifications: {
    label: 'Certifications', title: 'Certifications', zone: 'aside',
    fields: [
      F('name', 'Name', 'text', { ph: 'AWS Solutions Architect' }),
      F('issuer', 'Issuer', 'text', { ph: 'Amazon', w: 'half' }),
      F('date', 'Date', 'date', { ph: '2023', w: 'half' }),
      F('url', 'Link', 'url', { ph: 'https://', w: 'half' }),
      F('id', 'Credential ID', 'text', { ph: 'ABC-123', w: 'half' }),
    ],
    head: (it) => it.name,
    desc: 'Name, issuer, date, verification link.',
  },
  projects: {
    label: 'Projects', title: 'Projects', zone: 'main',
    fields: [
      F('name', 'Project', 'text', { ph: 'Route planner', w: 'half' }),
      F('role', 'Role', 'text', { ph: 'Maintainer', w: 'half' }),
      F('start', 'Start', 'date', { ph: '2023', w: 'half' }),
      F('end', 'End', 'date', { ph: 'Present', w: 'half' }),
      F('url', 'Link', 'url', { ph: 'https://' }),
      F('summary', 'Summary', 'textarea', { ph: 'What it is and why it exists' }),
      F('highlights', 'Highlights, one per line', 'lines'),
    ],
    head: (it) => it.name,
    desc: 'Side projects, open source, talks: name, role, link, bullets.',
  },
  awards: {
    label: 'Awards', title: 'Awards', zone: 'main',
    fields: [
      F('title', 'Title', 'text', { ph: 'Engineer of the year' }),
      F('issuer', 'Issuer', 'text', { ph: 'Company', w: 'half' }),
      F('date', 'Date', 'date', { ph: '2024', w: 'half' }),
      F('summary', 'Summary', 'textarea', { ph: 'What it was for' }),
    ],
    head: (it) => it.title,
    desc: 'Honours and recognitions with issuer and date.',
  },
  volunteer: {
    label: 'Volunteering', title: 'Volunteering', zone: 'main',
    fields: [
      F('role', 'Role', 'text', { ph: 'Mentor', w: 'half' }),
      F('org', 'Organisation', 'text', { ph: 'Code Club', w: 'half' }),
      F('location', 'Location', 'text', { ph: 'Remote', w: 'half' }),
      F('start', 'Start', 'date', { ph: '2022', w: 'half' }),
      F('end', 'End', 'date', { ph: 'Present', w: 'half' }),
      F('url', 'Link', 'url', { ph: 'https://', w: 'half' }),
      F('summary', 'Summary', 'textarea'),
      F('highlights', 'Highlights, one per line', 'lines'),
    ],
    head: (it) => it.role || it.org,
    desc: 'Unpaid roles, same shape as experience.',
  },
  publications: {
    label: 'Publications', title: 'Publications', zone: 'main',
    fields: [
      F('title', 'Title', 'text', { ph: 'Paper or post title' }),
      F('publisher', 'Publisher', 'text', { ph: 'Medium', w: 'half' }),
      F('date', 'Date', 'date', { ph: 'Mar 2025', w: 'half' }),
      F('url', 'Link', 'url', { ph: 'https://' }),
      F('summary', 'Summary', 'textarea'),
    ],
    head: (it) => it.title,
    desc: 'Articles, papers, talks: title, publisher, date, link.',
  },
  iconrow: {
    label: 'Icon row', title: 'Socials', zone: 'aside', styles: ICON_STYLES.concat(['list']),
    fields: [
      F('label', 'Label', 'text', { ph: 'GitHub', w: 'half' }),
      F('icon', 'Icon', 'icon', { w: 'half' }),
      F('url', 'Link (optional)', 'url', { ph: 'https://github.com/you' }),
    ],
    head: (it) => it.label,
    desc: 'A row of icon tiles: socials, profiles, hobbies, tools. Links are optional. Can mirror the links typed in Basics.',
  },
  list: {
    label: 'List', title: 'Trivia', zone: 'aside', styles: ['bullets', 'check', 'plain', 'card'], hasImage: true,
    fields: [
      F('text', 'Text', 'text', { ph: 'Based in Lisbon, works remotely' }),
      F('icon', 'Icon (optional)', 'icon', { w: 'half' }),
    ],
    head: (it) => it.text,
    desc: 'Short bullet facts, optionally with a small image beside them.',
  },
  tags: {
    label: 'Tags', title: 'Interests', zone: 'aside',
    fields: [F('name', 'Tag', 'text', { ph: 'Photography' })],
    head: (it) => it.name,
    desc: 'Chips: interests, tools, keywords for the parser.',
  },
  contact: {
    label: 'Contact', title: 'Contact', zone: 'aside', fields: [], fromBasics: true,
    desc: 'Email, phone, location, website and links from the basics block, as a list.',
  },
  references: {
    label: 'References', title: 'References', zone: 'main',
    fields: [
      F('name', 'Name', 'text', { ph: 'Jane Smith', w: 'half' }),
      F('role', 'Role', 'text', { ph: 'Engineering Manager, Acme', w: 'half' }),
      F('contact', 'Contact', 'text', { ph: 'jane@acme.com' }),
      F('text', 'Quote', 'textarea', { ph: 'Optional short reference' }),
    ],
    head: (it) => it.name,
    desc: 'People who will vouch, or "available on request".',
  },
  gaming: {
    label: 'Gaming stats', title: 'Gaming', zone: 'aside', fields: [], hasData: true,
    desc: 'A PSN and a Steam block: level, trophy counts and hours played, typed in by hand.',
  },
  // Not a heading: the empty title is load-bearing. The renderer emits a bare
  // marker for it and the printed sheet shows nothing at all.
  pagebreak: {
    label: 'Page break', title: '', zone: 'main', fields: [],
    desc: 'Forces the next section onto a new page when printing. Shown as a marker in the preview only.',
  },
};

export const TYPE_IDS = Object.keys(SECTION_TYPES);
export const ZONES = ['main', 'aside'];

// The English level words, still exported because the editor's level picker and
// the JSON Resume writer are English by definition. The other languages live
// beside these in i18n.js, so a column cannot drift from this one.
export const LEVEL_WORDS = pack('en').levels;

let counter = 0;
export function newId() {
  counter += 1;
  return (Date.now().toString(36).slice(-4) + counter.toString(36) + Math.random().toString(36).slice(2, 5)).toLowerCase();
}

export function blankBasics() {
  return { name: '', title: '', photo: '', email: '', phone: '', location: '', website: '', links: [] };
}

export function blankResume() {
  return {
    version: MODEL_VERSION,
    meta: { title: 'Untitled resume', lang: 'en' },
    basics: blankBasics(),
    sections: [],
    design: normalizeDesign(),
  };
}

/** An empty item for a section type, every declared field present. */
export function blankItem(type) {
  const def = SECTION_TYPES[type];
  const it = {};
  for (const f of def?.fields || []) it[f.key] = f.kind === 'lines' ? [] : f.kind === 'level' ? 0 : '';
  return it;
}

/**
 * A new section of `type`, ready for the editor (one blank item, no text).
 * `lang` decides the default title of a section being born and nothing else:
 * no code path revisits the title of a section that already exists.
 */
export function newSection(type, zone, lang = 'en') {
  const def = SECTION_TYPES[type] || SECTION_TYPES.text;
  const kind = def === SECTION_TYPES.text && type !== 'text' ? 'text' : type;
  const s = {
    id: newId(), type: kind,
    title: sectionTitle(lang, kind), zone: zone || def.zone, style: '', source: '', items: [], text: '', image: '', hidden: false,
  };
  if (def.fields && def.fields.length) s.items.push(blankItem(s.type));
  if (def.hasData) s.data = { psn: { username: '', stats: null }, steam: { id: '', stats: null } };
  return s;
}

// YAML turns "Built the practice: 120 interviews" into a one-key mapping; a date
// like 2020-08 can arrive as a Date from another loader. Both become text here.
const str = (v) => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(', ');
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}: ${str(x)}`).join(', ').trim();
  return String(v).trim();
};
const stripBullet = (x) => x.replace(/^\s*[-*•✦▸◆→✓]\s*/, '').trim();
const asLines = (v) => (Array.isArray(v) ? v.map(str) : str(v).split('\n')).map(stripBullet).filter(Boolean);
const int = (v, lo, hi, dflt = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };
const oneOf = (v, list, dflt, warnings, what) => {
  if (v === undefined || v === null || v === '') return dflt;
  if (list.includes(v)) return v;
  warnings?.push(`${what} "${v}" is not one of ${list.join(', ')}; using ${dflt}`);
  return dflt;
};

function normalizeItem(type, raw) {
  const def = SECTION_TYPES[type];
  const src = raw && typeof raw === 'object' ? raw : { [def.fields[0]?.key || 'text']: raw };
  const it = {};
  for (const f of def.fields) {
    const v = src[f.key];
    if (f.kind === 'lines') it[f.key] = asLines(v);
    else if (f.kind === 'level') it[f.key] = int(v, 0, 5, 0);
    else it[f.key] = str(v);
  }
  return it;
}

/**
 * The gaming numbers, coerced to numbers (CONTRACTS.md C8).
 *
 * These are the one part of the model a person can type by hand *and* a fetch can
 * write, so a YAML carrying `games: "412"` is ordinary rather than malformed. A
 * string that looks like a number is still a string, and `st.games + 1` on it is
 * "4121", so every numeric field goes through the same `int` as the rest of the file.
 *
 * A field nobody filled in stays *absent*, it does not become 0: `render.js` tests
 * `!== undefined` to decide whether to draw a stat, and "no trophies recorded" and
 * "zero trophies" are different claims to make on a resume.
 */
const given = (v) => v !== undefined && v !== null && v !== '';
const intoInt = (src, out, key, hi) => { if (given(src[key])) out[key] = int(src[key], 0, hi, 0); };

function normalizeStats(raw, provider) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  if (provider === 'psn') {
    intoInt(raw, out, 'level', 999);
    intoInt(raw, out, 'games', 999999);
    if (raw.trophies && typeof raw.trophies === 'object') {
      const t = {};
      for (const k of ['platinum', 'gold', 'silver', 'bronze']) intoInt(raw.trophies, t, k, 999999);
      if (Object.keys(t).length) out.trophies = t;
    }
  } else {
    intoInt(raw, out, 'games', 999999);
    // Hours keep one decimal: half an hour is a real amount of playtime.
    if (given(raw.playtime)) {
      const n = parseFloat(raw.playtime);
      out.playtime = Number.isFinite(n) ? Math.round(Math.max(0, n) * 10) / 10 : 0;
    }
    if (Array.isArray(raw.recentGames)) {
      const g = raw.recentGames.map((x) => ({ name: str(typeof x === 'string' ? x : x?.name) })).filter((x) => x.name);
      if (g.length) out.recentGames = g;
    }
  }
  return out;
}

function normalizeLink(raw) {
  if (typeof raw === 'string') return { label: '', url: raw.trim(), icon: '' };
  if (!raw || typeof raw !== 'object') return null;
  return { label: str(raw.label), url: str(raw.url), icon: str(raw.icon) };
}

export function normalizeBasics(raw = {}) {
  const b = blankBasics();
  for (const k of ['name', 'title', 'photo', 'email', 'phone', 'location', 'website']) b[k] = str(raw[k]);
  b.links = (Array.isArray(raw.links) ? raw.links : []).map(normalizeLink).filter((l) => l && (l.url || l.label));
  return b;
}

export function normalizeSection(raw, warnings = [], lang = 'en') {
  if (!raw || typeof raw !== 'object') return null;
  let type = str(raw.type) || 'text';
  if (!SECTION_TYPES[type]) {
    warnings.push(`section type "${type}" is unknown; kept as text`);
    type = 'text';
  }
  const def = SECTION_TYPES[type];
  const s = {
    id: str(raw.id) || newId(),
    type,
    // The only place a default title is applied on load, and only when the key
    // is absent. toPlain always writes `title`, so a title that has survived one
    // save is a value, not a default: changing meta.lang cannot rewrite it.
    title: raw.title === undefined ? sectionTitle(lang, type) : str(raw.title),
    zone: oneOf(str(raw.zone), ZONES, def.zone, warnings, `zone of "${raw.title || type}"`),
    style: str(raw.style),
    source: raw.source === 'basics' ? 'basics' : '',
    items: [],
    text: '',
    image: '',
    hidden: !!raw.hidden,
  };
  if (s.style && def.styles && !def.styles.includes(s.style)) {
    warnings.push(`style "${s.style}" is not one of ${def.styles.join(', ')} for ${type}; ignored`);
    s.style = '';
  }
  if (def.fields.length) s.items = (Array.isArray(raw.items) ? raw.items : []).map((it) => normalizeItem(type, it));
  if (def.hasText || raw.text) s.text = Array.isArray(raw.text) ? raw.text.map(str).join('\n\n') : str(raw.text);
  if (def.hasImage || raw.image) s.image = str(raw.image);
  if (raw.columns !== undefined) s.columns = int(raw.columns, 1, 3, 1);
  if (def.hasData) {
    const d = raw.data && typeof raw.data === 'object' ? raw.data : {};
    s.data = {
      psn: { username: str(d.psn?.username), stats: normalizeStats(d.psn?.stats, 'psn') },
      steam: { id: str(d.steam?.id), stats: normalizeStats(d.steam?.stats, 'steam') },
    };
  }
  return s;
}

export function normalizeDesign(raw = {}, warnings = []) {
  const d = defaultDesign();
  const r = raw && typeof raw === 'object' ? raw : {};
  d.template = oneOf(str(r.template), Object.keys(TEMPLATES), d.template, warnings, 'template');
  d.palette = oneOf(str(r.palette), Object.keys(PALETTES), d.palette, warnings, 'palette');
  d.colors = {};
  if (r.colors && typeof r.colors === 'object') {
    for (const [k, v] of Object.entries(r.colors)) {
      if (!(k in PALETTES.navy) || k === 'label') { warnings.push(`colors.${k} is not a colour token`); continue; }
      const hex = str(v);
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) d.colors[k] = hex.toLowerCase();
      else if (hex) warnings.push(`colors.${k} "${hex}" is not a hex colour`);
    }
  }
  if (typeof r.fonts === 'string') d.fonts = oneOf(r.fonts, Object.keys(FONT_PAIRS), d.fonts, warnings, 'fonts');
  else if (r.fonts && typeof r.fonts === 'object') d.fonts = { heading: str(r.fonts.heading), body: str(r.fonts.body) };
  d.fontScale = Math.min(1.2, Math.max(0.8, parseFloat(r.fontScale) || 1));
  d.density = oneOf(str(r.density), DENSITIES, d.density, warnings, 'density');
  d.page = oneOf(str(r.page), Object.keys(PAGES), d.page, warnings, 'page');
  d.headings = oneOf(str(r.headings), HEADING_STYLES, d.headings, warnings, 'headings');
  d.entries = oneOf(str(r.entries), ENTRY_STYLES, d.entries, warnings, 'entries');
  d.bullet = str(r.bullet) ? str(r.bullet).slice(0, 2) : d.bullet;
  d.skills = oneOf(str(r.skills), SKILL_STYLES, d.skills, warnings, 'skills');
  d.links = oneOf(str(r.links), LINK_STYLES, d.links, warnings, 'links');
  d.icons = oneOf(str(r.icons), ICON_STYLES, d.icons, warnings, 'icons');
  const p = r.photo && typeof r.photo === 'object' ? r.photo : {};
  d.photo = {
    shape: oneOf(str(p.shape), PHOTO_SHAPES, d.photo.shape, warnings, 'photo.shape'),
    size: oneOf(str(p.size), PHOTO_SIZES, d.photo.size, warnings, 'photo.size'),
    ring: p.ring === undefined ? d.photo.ring : !!p.ring,
    ringColor: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(str(p.ringColor)) ? str(p.ringColor).toLowerCase() : '',
    // Framing. All three are integer percentages, which is what lets the design
    // panel label them with a plain "%". Clamped against the literal defaults
    // rather than against defaultDesign() so this file is correct whichever of
    // the two lands first. Out of range clamps silently; junk falls back.
    x: int(p.x, 0, 100, 50),
    y: int(p.y, 0, 100, 50),
    zoom: int(p.zoom, 100, 300, 100),
  };
  const b = r.banner && typeof r.banner === 'object' ? r.banner : {};
  d.banner = {
    shape: oneOf(str(b.shape), BANNER_SHAPES, d.banner.shape, warnings, 'banner.shape'),
    height: oneOf(str(b.height), BANNER_HEIGHTS, d.banner.height, warnings, 'banner.height'),
    image: str(b.image),
    dim: int(b.dim, 0, 90, d.banner.dim),
    pattern: oneOf(str(b.pattern), BANNER_PATTERNS, d.banner.pattern, warnings, 'banner.pattern'),
  };
  const c = r.columns && typeof r.columns === 'object' ? r.columns : {};
  d.columns = {
    side: oneOf(str(c.side), ['left', 'right'], d.columns.side, warnings, 'columns.side'),
    width: int(c.width, 24, 45, d.columns.width),
  };
  return d;
}

/**
 * Bring any input (parsed YAML/JSON, a {resume:{...}} wrapper, an old save) to
 * the current shape. Never throws on bad data; returns warnings instead.
 */
export function normalizeResume(raw) {
  const warnings = [];
  let src = raw && typeof raw === 'object' ? raw : {};
  if (src.resume && typeof src.resume === 'object') src = src.resume;
  const m = blankResume();
  m.meta = {
    title: str(src.meta?.title) || str(src.basics?.name) || m.meta.title,
    lang: str(src.meta?.lang) || 'en',
  };
  m.basics = normalizeBasics(src.basics || {});
  const seen = new Set();
  m.sections = (Array.isArray(src.sections) ? src.sections : []).map((s) => normalizeSection(s, warnings, m.meta.lang)).filter(Boolean);
  for (const s of m.sections) { while (seen.has(s.id)) s.id = newId(); seen.add(s.id); }
  m.design = normalizeDesign(src.design || {}, warnings);
  if (!m.basics.name) warnings.push('basics.name is empty');
  return { model: m, warnings };
}

/** Validation beyond shape: things a person would want to know before exporting. */
export function lintResume(m) {
  const notes = [];
  if (!m.basics.name) notes.push({ level: 'warn', text: 'No name in basics' });
  if (!m.basics.title) notes.push({ level: 'info', text: 'No title or headline in basics' });
  if (!m.sections.length) notes.push({ level: 'warn', text: 'No sections yet' });
  const hasAside = TEMPLATES[m.design.template]?.aside;
  const asideCount = m.sections.filter((s) => s.zone === 'aside' && !s.hidden && s.type !== 'pagebreak').length;
  if (hasAside && asideCount === 0) notes.push({ level: 'info', text: `Template "${m.design.template}" has a side column but no section is placed in it` });
  if (!hasAside && asideCount > 0) notes.push({ level: 'info', text: `Template "${m.design.template}" has no side column; aside sections render in the main flow` });
  const breaks = m.sections.filter((s) => s.type === 'pagebreak' && !s.hidden);
  if (breaks.length) {
    const visible = m.sections.filter((s) => !s.hidden);
    if (visible[visible.length - 1]?.type === 'pagebreak') notes.push({ level: 'info', text: 'The last visible section is a page break, so it has nothing left to push onto a new page' });
    if (breaks.some((s) => s.zone === 'aside')) notes.push({ level: 'info', text: 'A page break in the side column does nothing; move it to the main column' });
  }
  // Switching meta.lang never rewrites a title. State the fact once, in one
  // note, and leave the decision with the person who typed them.
  const lang = str(m.meta?.lang) || 'en';
  // resolveLang, not `lang !== 'en'`: "EN" and "en-GB" are English documents and
  // must not be told to translate anything.
  if (resolveLang(lang) !== 'en') {
    const stillEnglish = m.sections.filter((s) => !s.hidden && s.title && s.title === sectionTitle('en', s.type)).map((s) => s.title);
    if (stillEnglish.length) {
      notes.push({ level: 'info', text: `meta.lang is "${lang}" but ${stillEnglish.length} section title${stillEnglish.length > 1 ? 's are' : ' is'} still the English default (${stillEnglish.join(', ')}). Nothing is renamed for you: retitle the ones you want translated.` });
    }
  }
  for (const s of m.sections) {
    if (s.source === 'basics') {
      if (!m.basics.links.length) notes.push({ level: 'info', text: `"${s.title || s.type}" mirrors Basics > Links, which is empty` });
      continue;
    }
    if (!s.hidden && SECTION_TYPES[s.type].fields.length && !s.items.length) notes.push({ level: 'info', text: `"${s.title || s.type}" has no items` });
    if (s.type === 'experience') {
      for (const it of s.items) {
        if (!it.role && !it.company) notes.push({ level: 'warn', text: `An experience entry has neither role nor company` });
        if (it.highlights.length > 6) notes.push({ level: 'info', text: `"${it.role || it.company}" has ${it.highlights.length} bullets; 3 to 5 read best` });
      }
    }
  }
  for (const l of m.basics.links) {
    if (l.url && !/^(https?:|mailto:|tel:)/i.test(l.url)) notes.push({ level: 'warn', text: `Link "${l.label || l.url}" is not an http(s), mailto or tel URL and will not be clickable` });
  }
  return notes;
}

/**
 * Migrate a v1 save (localStorage 'resume-forge-v1', the canvas-era shape)
 * into the current model. Every v1 field that existed has a home here.
 */
export function migrateV1(old) {
  if (!old || typeof old !== 'object') return null;
  const m = blankResume();
  m.basics.name = str(old.name);
  m.basics.title = str(old.title);
  m.basics.location = str(old.location);
  m.basics.email = str(old.email);
  m.basics.phone = str(old.phone);
  m.basics.website = str(old.website);
  m.basics.photo = str(old.assets?.profilePhoto);
  const link = (label, url, icon) => { if (str(url)) m.basics.links.push({ label, url: /^https?:/i.test(url) ? url : `https://${url}`, icon }); };
  link('LinkedIn', old.linkedin, 'linkedin');
  link('GitHub', old.github, 'github');
  link('Linktree', old.linktree, 'linktree');
  link('X', old.twitter, 'x');
  const main = [];
  const aside = [];
  if (str(old.summary)) main.push({ ...newSection('text', 'main'), title: 'Profile', text: str(old.summary) });
  if (Array.isArray(old.experience) && old.experience.length) {
    const s = newSection('experience', 'main');
    s.items = old.experience.map((e) => {
      const lines = str(e.description).split('\n').map((x) => x.trim()).filter(Boolean);
      const bullets = lines.filter((x) => /^[-*•✦▸◆→✓]/.test(x));
      const prose = lines.filter((x) => !/^[-*•✦▸◆→✓]/.test(x));
      const [start = '', end = ''] = str(e.dates).split(/\s*(?:-|–|to)\s*/);
      return { ...blankItem('experience'), role: str(e.role), company: str(e.company), location: str(e.location), start, end, summary: prose.join(' '), highlights: asLines(bullets) };
    });
    main.push(s);
  }
  if (Array.isArray(old.skills) && old.skills.length) {
    const s = newSection('skills', 'aside');
    s.style = 'hearts';
    s.items = old.skills.map((k) => ({ name: str(k.name), group: str(k.category), level: int(k.hearts, 0, 5, 0) }));
    aside.push(s);
  }
  if (Array.isArray(old.education) && old.education.length) {
    const s = newSection('education', 'aside');
    s.items = old.education.map((e) => {
      const [start = '', end = ''] = str(e.dates).split(/\s*(?:-|–|to)\s*/);
      return { ...blankItem('education'), school: str(e.school), degree: str(e.degree), location: str(e.location), start, end };
    });
    aside.push(s);
  }
  if (Array.isArray(old.languages) && old.languages.length) {
    const s = newSection('languages', 'aside');
    s.items = old.languages.map((l) => ({ name: str(l.name), level: str(l.level), score: 0 }));
    aside.push(s);
  }
  if (Array.isArray(old.certifications) && old.certifications.length) {
    const s = newSection('certifications', 'aside');
    s.items = old.certifications.map((c) => ({ ...blankItem('certifications'), name: str(c.name), issuer: str(c.issuer), date: str(c.date || c.year), url: str(c.url) }));
    aside.push(s);
  }
  if (old.gaming?.enabled || old.gaming?.psnUsername || old.gaming?.steamId) {
    const s = newSection('gaming', 'aside');
    s.data = {
      psn: { username: str(old.gaming.psnUsername), stats: old.gaming.psnStats || null },
      steam: { id: str(old.gaming.steamId), stats: old.gaming.steamStats || null },
    };
    s.hidden = !old.gaming.enabled;
    aside.push(s);
  }
  // v1 sidebar order, when present, decides the aside order.
  if (Array.isArray(old.sidebarSections)) {
    const order = old.sidebarSections.map((x) => x.id);
    aside.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
    for (const x of old.sidebarSections) {
      const sec = aside.find((a) => a.type === x.id);
      if (sec && x.enabled === false) sec.hidden = true;
      if (sec && str(x.title)) sec.title = str(x.title).replace(/^\w/, (c) => c.toUpperCase()).toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
    }
  }
  m.sections = [...main, ...aside];
  const d = m.design;
  d.template = old.layout?.template === 'big-header' ? 'banner' : 'sidebar';
  d.fonts = { heading: str(old.fonts?.heading) || 'Permanent Marker', body: str(old.fonts?.body) || 'Inter' };
  d.columns = { side: old.layout?.columnSide === 'right' ? 'right' : 'left', width: int(old.layout?.columnWidth, 24, 45, 34) };
  const spacing = str(old.layout?.spacing);
  d.density = spacing === 'tight' ? 'compact' : oneOf(spacing, DENSITIES, 'normal');
  if (/^#[0-9a-f]{6}$/i.test(str(old.layout?.columnColor))) d.colors.band = str(old.layout.columnColor).toLowerCase();
  d.photo = {
    shape: oneOf(str(old.assets?.photoShape), PHOTO_SHAPES, 'circle'),
    size: 'md',
    ring: old.assets?.photoBorder !== false,
    ringColor: /^#[0-9a-f]{6}$/i.test(str(old.assets?.borderColor)) ? str(old.assets.borderColor).toLowerCase() : '',
  };
  d.banner.image = str(old.assets?.bgImage);
  d.banner.dim = int(old.layout?.bgDim, 0, 90, 45);
  d.skills = 'hearts';
  m.meta.title = m.basics.name ? `${m.basics.name} (imported from v1)` : 'Imported from v1';
  return normalizeResume(m).model;
}
