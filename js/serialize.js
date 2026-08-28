// Every format the model travels in, both directions:
//   YAML (canonical, `resume:` root)  ·  JSON (same tree)
//   JSON Resume (jsonresume.org schema)  ·  Markdown (readable, llms.txt-style, round-trips)
// The YAML parser is js-yaml, loaded as a global (`jsyaml`) by index.html and
// by the node tests, so this module has no import of its own for it.

import { normalizeResume, SECTION_TYPES, newSection, blankItem, blankResume } from './schema.js';
import { detectIcon, iconTitle, hostOf } from './icons.js';
import { pack, PRESENT } from './i18n.js';

export function yamlLib() {
  const y = globalThis.jsyaml;
  if (!y) throw new Error('YAML library not loaded (js-yaml must be on globalThis.jsyaml)');
  return y;
}

/* ───────────────────────── canonical tree (YAML / JSON) ───────────────────────── */

const isEmpty = (v) => v === '' || v === null || v === undefined
  || (Array.isArray(v) && v.length === 0)
  || (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

function prune(obj, dropZero = []) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isEmpty(v)) continue;
    if (dropZero.includes(k) && v === 0) continue;
    out[k] = v;
  }
  return out;
}

/** The model as a plain ordered tree with empties removed and editor ids dropped. */
export function toPlain(model) {
  const m = model;
  const basics = prune({
    name: m.basics.name, title: m.basics.title, photo: m.basics.photo, email: m.basics.email,
    phone: m.basics.phone, location: m.basics.location, website: m.basics.website,
  });
  if (m.basics.links?.length) basics.links = m.basics.links.map((l) => prune(l));
  const sections = m.sections.map((s) => {
    const def = SECTION_TYPES[s.type] || SECTION_TYPES.text;
    const o = { type: s.type, title: s.title, zone: s.zone };
    if (s.style) o.style = s.style;
    if (s.source) o.source = s.source;
    if (s.columns && s.columns > 1) o.columns = s.columns;
    if (s.hidden) o.hidden = true;
    if (def.hasText || s.text) o.text = s.text;
    if (s.image) o.image = s.image;
    if (def.fields.length && s.source !== 'basics') {
      const zeroKeys = def.fields.filter((f) => f.kind === 'level').map((f) => f.key);
      o.items = s.items.map((it) => prune(it, zeroKeys));
    }
    if (def.hasData && s.data) {
      o.data = prune({ psn: prune(s.data.psn || {}), steam: prune(s.data.steam || {}) });
    }
    return o;
  });
  const d = m.design;
  const design = {
    template: d.template, palette: d.palette,
    ...(Object.keys(d.colors || {}).length ? { colors: { ...d.colors } } : {}),
    fonts: typeof d.fonts === 'string' ? d.fonts : prune(d.fonts),
    ...(d.fontScale && d.fontScale !== 1 ? { fontScale: d.fontScale } : {}),
    density: d.density, page: d.page, headings: d.headings, entries: d.entries, bullet: d.bullet,
    skills: d.skills, links: d.links, icons: d.icons,
    // Framing (x, y, zoom) is written only when it is not the default, the same
    // rule fontScale follows above. A resume nobody has reframed therefore
    // exports byte for byte as it did before the feature existed, and the
    // defaults come back from normalizeDesign on load either way.
    photo: {
      ...prune({ shape: d.photo.shape, size: d.photo.size, ring: d.photo.ring, ringColor: d.photo.ringColor }),
      ...(d.photo.x !== 50 ? { x: d.photo.x } : {}),
      ...(d.photo.y !== 50 ? { y: d.photo.y } : {}),
      ...(d.photo.zoom !== 100 ? { zoom: d.photo.zoom } : {}),
    },
    banner: prune({ shape: d.banner.shape, height: d.banner.height, pattern: d.banner.pattern === 'none' ? '' : d.banner.pattern, image: d.banner.image, dim: d.banner.image ? d.banner.dim : '' }),
    columns: { side: d.columns.side, width: d.columns.width },
  };
  if (design.photo.ring === true) design.photo.ring = true; // keep explicit, prune() dropped nothing here
  return { resume: { meta: prune({ title: m.meta.title, lang: m.meta.lang }), basics, sections, design } };
}

const YAML_HEAD = '# Resume Forge document. Edit freely: the site, validate.mjs and the importers all read this shape.\n# Reference for every key: https://resume.neorgon.com/template.yaml\n';

export function toYAML(model) {
  return YAML_HEAD + yamlLib().dump(toPlain(model), { lineWidth: 120, noRefs: true, sortKeys: false, quotingType: '"' });
}

/** @returns {{model, warnings, error?}} */
export function fromYAML(text) {
  let doc;
  try {
    doc = yamlLib().load(String(text || ''), { schema: yamlLib().CORE_SCHEMA });
  } catch (e) {
    return { model: null, warnings: [], error: `YAML: ${e.message}` };
  }
  if (!doc || typeof doc !== 'object') return { model: null, warnings: [], error: 'YAML: the document is empty or not a mapping' };
  if (!doc.resume && !doc.basics && !doc.sections) return { model: null, warnings: [], error: 'YAML: root key "resume:" not found' };
  return normalizeResume(doc);
}

export function toJSON(model) {
  return JSON.stringify(toPlain(model), null, 2) + '\n';
}

export function fromJSON(text) {
  let doc;
  try { doc = JSON.parse(String(text || '')); } catch (e) { return { model: null, warnings: [], error: `JSON: ${e.message}` }; }
  if (doc && typeof doc === 'object' && (doc.basics?.label !== undefined || Array.isArray(doc.work)) && !doc.resume) {
    return fromJsonResume(doc); // a JSON Resume file, recognised by its shape
  }
  return normalizeResume(doc);
}

/* ───────────────────────── dates ───────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Moved to i18n.js, where the renderer can read it without importing this
// module. Re-exported so every existing importer keeps working unchanged.
export { PRESENT };

/** "Sep 2025" -> "2025-09", "2020" -> "2020", "Present" -> "" (open range), unparseable -> raw. */
export function toIsoDate(s) {
  const v = String(s || '').trim();
  if (!v || PRESENT.test(v)) return '';
  let m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(v);
  if (m) return [m[1], m[2] && m[2].padStart(2, '0'), m[3] && m[3].padStart(2, '0')].filter(Boolean).join('-');
  m = /^([A-Za-z]{3,9})\.?\s+(\d{4})$/.exec(v);
  if (m) {
    const mi = MONTHS.findIndex((x) => m[1].toLowerCase().startsWith(x.toLowerCase()));
    if (mi >= 0) return `${m[2]}-${String(mi + 1).padStart(2, '0')}`;
  }
  m = /^(\d{1,2})[/.](\d{4})$/.exec(v);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  return v;
}

/** "2025-09-01" / "2025-09" -> "Sep 2025", "2020" -> "2020", anything else raw. */
export function fromIsoDate(s) {
  const v = String(s || '').trim();
  let m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(v);
  if (m) return `${MONTHS[parseInt(m[2], 10) - 1] || m[2]} ${m[1]}`;
  if (/^\d{4}$/.test(v)) return v;
  return v;
}

export function splitRange(s) {
  const v = String(s || '').trim();
  if (!v) return { start: '', end: '' };
  const parts = v.split(/\s+(?:-|–|—|to|→|hasta)\s+/i);
  if (parts.length >= 2) return { start: parts[0].trim(), end: parts.slice(1).join(' ').trim() };
  if (PRESENT.test(v)) return { start: '', end: v };
  return { start: v, end: '' };
}

export function fmtRange(start, end, sep = ' - ') {
  if (start && end) return `${start}${sep}${end}`;
  return start || end || '';
}

/* ───────────────────────── JSON Resume ───────────────────────── */

const levelWord = (n) => pack('en').levels[n] || undefined;
const wordLevel = (w) => {
  const s = String(w || '').toLowerCase();
  if (!s) return 0;
  if (/master|expert|native|fluent|bilingual/.test(s)) return 5;
  if (/advanced|full professional|proficient|senior/.test(s)) return 4;
  if (/intermediate|professional working|working/.test(s)) return 3;
  if (/elementary|limited|basic/.test(s)) return 2;
  if (/beginner|novice|starter/.test(s)) return 1;
  return 0;
};

function firstText(m, re) {
  const s = m.sections.find((x) => x.type === 'text' && re.test(x.title || '')) || m.sections.find((x) => x.type === 'text');
  return s ? s.text : '';
}

export function toJsonResume(model) {
  const m = model;
  const b = m.basics;
  const out = { basics: prune({
    name: b.name, label: b.title, image: b.photo, email: b.email, phone: b.phone, url: b.website,
    summary: firstText(m, /profile|summary|about|resumen|perfil/i),
  }) };
  if (b.location) {
    const parts = b.location.split(',').map((x) => x.trim()).filter(Boolean);
    out.basics.location = prune({ city: parts[0], region: parts.slice(1).join(', ') });
  }
  if (b.links?.length) {
    out.basics.profiles = b.links.map((l) => prune({
      network: l.label || iconTitle(l.icon || detectIcon(l.url)) || hostOf(l.url),
      username: (() => { try { return decodeURIComponent(new URL(l.url).pathname.split('/').filter(Boolean).pop() || ''); } catch { return ''; } })(),
      url: l.url,
    }));
  }
  const push = (key, arr) => { if (arr.length) out[key] = (out[key] || []).concat(arr); };
  for (const s of m.sections) {
    if (s.hidden) continue;
    switch (s.type) {
      case 'experience':
        push('work', s.items.map((it) => prune({
          name: it.team ? `${it.company} (${it.team})` : it.company, position: it.role, location: it.location, url: it.url,
          startDate: toIsoDate(it.start), endDate: toIsoDate(it.end), summary: it.summary, highlights: it.highlights,
        })));
        break;
      case 'volunteer':
        push('volunteer', s.items.map((it) => prune({
          organization: it.org, position: it.role, url: it.url, startDate: toIsoDate(it.start), endDate: toIsoDate(it.end),
          summary: it.summary, highlights: it.highlights,
        })));
        break;
      case 'education':
        push('education', s.items.map((it) => prune({
          institution: it.school, url: it.url, area: it.field, studyType: it.degree,
          startDate: toIsoDate(it.start), endDate: toIsoDate(it.end), score: it.score, courses: it.notes ? [it.notes] : [],
        })));
        break;
      case 'awards':
        push('awards', s.items.map((it) => prune({ title: it.title, date: toIsoDate(it.date), awarder: it.issuer, summary: it.summary })));
        break;
      case 'certifications':
        push('certificates', s.items.map((it) => prune({ name: it.name, date: toIsoDate(it.date), issuer: it.issuer, url: it.url })));
        break;
      case 'publications':
        push('publications', s.items.map((it) => prune({ name: it.title, publisher: it.publisher, releaseDate: toIsoDate(it.date), url: it.url, summary: it.summary })));
        break;
      case 'skills': {
        const groups = new Map();
        const loose = [];
        for (const it of s.items) {
          if (it.group) { if (!groups.has(it.group)) groups.set(it.group, []); groups.get(it.group).push(it.name); }
          else loose.push(prune({ name: it.name, level: levelWord(it.level) }));
        }
        push('skills', [...[...groups].map(([name, keywords]) => ({ name, keywords })), ...loose]);
        break;
      }
      case 'languages':
        push('languages', s.items.map((it) => prune({ language: it.name, fluency: it.level || levelWord(it.score) })));
        break;
      case 'tags':
        push('interests', s.items.map((it) => ({ name: it.name })));
        break;
      case 'references':
        push('references', s.items.map((it) => prune({ name: it.name, reference: it.text || [it.role, it.contact].filter(Boolean).join(', ') })));
        break;
      case 'projects':
        push('projects', s.items.map((it) => prune({
          name: it.name, description: it.summary, highlights: it.highlights, url: it.url,
          startDate: toIsoDate(it.start), endDate: toIsoDate(it.end), roles: it.role ? [it.role] : [],
        })));
        break;
      default: break;
    }
  }
  return out;
}

export function fromJsonResume(jr) {
  const src = jr && typeof jr === 'object' ? jr : {};
  const m = blankResume();
  const b = src.basics || {};
  m.basics.name = String(b.name || '');
  m.basics.title = String(b.label || '');
  m.basics.photo = String(b.image || '');
  m.basics.email = String(b.email || '');
  m.basics.phone = String(b.phone || '');
  m.basics.website = String(b.url || '');
  if (b.location && typeof b.location === 'object') {
    m.basics.location = [b.location.city, b.location.region, b.location.countryCode].filter(Boolean).join(', ');
  }
  m.basics.links = (b.profiles || []).filter((p) => p && (p.url || p.network)).map((p) => ({ label: String(p.network || ''), url: String(p.url || ''), icon: '' }));
  const sec = (type, zone, title, items) => {
    if (!items.length) return;
    const s = newSection(type, zone);
    if (title) s.title = title;
    s.items = items.map((it) => ({ ...blankItem(type), ...it }));
    m.sections.push(s);
  };
  if (b.summary) { const s = newSection('text', 'main'); s.title = 'Profile'; s.text = String(b.summary); m.sections.push(s); }
  sec('experience', 'main', 'Experience', (src.work || []).map((w) => {
    const name = String(w.name || w.company || '');
    const mt = /^(.*?)\s*\((.+)\)\s*$/.exec(name);
    return { role: w.position, company: mt ? mt[1] : name, team: mt ? mt[2] : '', location: w.location, start: fromIsoDate(w.startDate), end: w.endDate ? fromIsoDate(w.endDate) : (w.startDate ? 'Present' : ''), url: w.url, summary: w.summary, highlights: w.highlights || [] };
  }));
  sec('projects', 'main', 'Projects', (src.projects || []).map((p) => ({ name: p.name, role: (p.roles || [])[0] || '', start: fromIsoDate(p.startDate), end: fromIsoDate(p.endDate), url: p.url, summary: p.description, highlights: p.highlights || [] })));
  sec('education', 'main', 'Education', (src.education || []).map((e) => ({ school: e.institution, degree: e.studyType, field: e.area, start: fromIsoDate(e.startDate), end: fromIsoDate(e.endDate), score: e.score, url: e.url, notes: (e.courses || []).join(', ') })));
  sec('volunteer', 'main', 'Volunteering', (src.volunteer || []).map((v) => ({ role: v.position, org: v.organization, start: fromIsoDate(v.startDate), end: fromIsoDate(v.endDate), url: v.url, summary: v.summary, highlights: v.highlights || [] })));
  sec('awards', 'main', 'Awards', (src.awards || []).map((a) => ({ title: a.title, issuer: a.awarder, date: fromIsoDate(a.date), summary: a.summary })));
  sec('publications', 'main', 'Publications', (src.publications || []).map((p) => ({ title: p.name, publisher: p.publisher, date: fromIsoDate(p.releaseDate), url: p.url, summary: p.summary })));
  const skills = [];
  for (const sk of src.skills || []) {
    if (Array.isArray(sk.keywords) && sk.keywords.length) for (const k of sk.keywords) skills.push({ name: String(k), group: String(sk.name || ''), level: 0 });
    else skills.push({ name: String(sk.name || ''), group: '', level: wordLevel(sk.level) });
  }
  sec('skills', 'aside', 'Skills', skills);
  sec('languages', 'aside', 'Languages', (src.languages || []).map((l) => ({ name: l.language, level: l.fluency, score: 0 })));
  sec('certifications', 'aside', 'Certifications', (src.certificates || []).map((c) => ({ name: c.name, issuer: c.issuer, date: fromIsoDate(c.date), url: c.url })));
  sec('tags', 'aside', 'Interests', (src.interests || []).flatMap((i) => [i.name, ...(i.keywords || [])].filter(Boolean).map((name) => ({ name: String(name) }))));
  sec('references', 'main', 'References', (src.references || []).map((r) => ({ name: r.name, text: r.reference })));
  m.meta.title = m.basics.name || 'Imported JSON Resume';
  return normalizeResume(m);
}
