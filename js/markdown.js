// Markdown, the readable twin of the YAML: what you paste into an LLM or a
// README, written so it round-trips. Section headings carry a small HTML
// comment marker (type, zone, style); hand-written files without markers are
// classified by heading words. See README "Formats" for the line shapes.

import { normalizeResume, SECTION_TYPES, newSection, blankItem, blankResume } from './schema.js';
import { toPlain, splitRange, fmtRange, PRESENT } from './serialize.js';

const stars = (n) => (n > 0 ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');
const segs = (...xs) => xs.map((x) => String(x || '').trim()).filter(Boolean).join(' · ');
const looksLikeDate = (s) => /\b(19|20)\d{2}\b/.test(s) || PRESENT.test(s.trim()) || /\b(present|current|ongoing)\b/i.test(s);
const looksLikeUrl = (s) => /^(https?:\/\/|www\.)\S+$/i.test(s.trim());
const iconTag = (icon) => (icon ? ` {${icon}}` : '');
const inlineLink = (label, url, icon) => `${url ? `[${label || url}](${url})` : (label || '')}${iconTag(icon)}`;

export function toMarkdown(model) {
  const m = model;
  const b = m.basics;
  const out = [];
  out.push(`# ${b.name || 'Untitled'}`);
  if (b.title) out.push(`**${b.title}**`);
  const contact = segs(b.location, b.email, b.phone, b.website);
  if (contact) out.push('', contact);
  if (b.links?.length) out.push('', `Links: ${b.links.map((l) => inlineLink(l.label, l.url, l.icon)).join(' · ')}`);
  for (const s of m.sections) {
    const def = SECTION_TYPES[s.type] || SECTION_TYPES.text;
    const marker = `<!-- ${s.type} ${s.zone}${s.style ? ` ${s.style}` : ''}${s.source === 'basics' ? ' from-basics' : ''}${s.hidden ? ' hidden' : ''} -->`;
    out.push('', `## ${s.title || def.title} ${marker}`);
    switch (s.type) {
      case 'text':
        if (s.text) out.push(s.text.trim());
        break;
      case 'experience':
        for (const it of s.items) {
          out.push(`### ${it.role || it.company}`);
          const meta = segs(it.team ? `${it.company} (${it.team})` : it.company, it.location, fmtRange(it.start, it.end), it.url);
          if (meta) out.push(meta);
          if (it.summary) out.push(it.summary.trim());
          for (const h of it.highlights) out.push(`- ${h}`);
          out.push('');
        }
        break;
      case 'education':
        for (const it of s.items) {
          out.push(`### ${it.degree || it.school}`);
          const meta = segs(it.field ? `${it.school} (${it.field})` : it.school, it.location, fmtRange(it.start, it.end), it.score, it.url);
          if (meta) out.push(meta);
          if (it.notes) out.push(it.notes.trim());
          out.push('');
        }
        break;
      case 'projects':
        for (const it of s.items) {
          out.push(`### ${it.name}`);
          const meta = segs(it.role, fmtRange(it.start, it.end), it.url);
          if (meta) out.push(meta);
          if (it.summary) out.push(it.summary.trim());
          for (const h of it.highlights) out.push(`- ${h}`);
          out.push('');
        }
        break;
      case 'volunteer':
        for (const it of s.items) {
          out.push(`### ${it.role || it.org}`);
          const meta = segs(it.org, it.location, fmtRange(it.start, it.end), it.url);
          if (meta) out.push(meta);
          if (it.summary) out.push(it.summary.trim());
          for (const h of it.highlights) out.push(`- ${h}`);
          out.push('');
        }
        break;
      case 'skills':
        for (const it of s.items) out.push(`- ${segs(`${it.name}${it.level ? ` ${stars(it.level)}` : ''}`, it.group)}`);
        break;
      case 'languages':
        for (const it of s.items) out.push(`- ${it.name}${it.level ? `: ${it.level}` : ''}${it.score ? ` ${stars(it.score)}` : ''}`);
        break;
      case 'certifications':
        for (const it of s.items) out.push(`- ${segs(it.name, it.issuer, it.date, it.url, it.id ? `ID ${it.id}` : '')}`);
        break;
      case 'awards':
        for (const it of s.items) { out.push(`- ${segs(it.title, it.issuer, it.date)}`); if (it.summary) out.push(`  ${it.summary.trim().replace(/\n+/g, ' ')}`); }
        break;
      case 'publications':
        for (const it of s.items) { out.push(`- ${segs(it.title, it.publisher, it.date, it.url)}`); if (it.summary) out.push(`  ${it.summary.trim().replace(/\n+/g, ' ')}`); }
        break;
      case 'iconrow':
        if (s.source === 'basics') out.push('(the links from Basics)');
        else for (const it of s.items) out.push(`- ${inlineLink(it.label, it.url, it.icon)}`);
        break;
      case 'list':
        for (const it of s.items) out.push(`- ${it.text}${iconTag(it.icon)}`);
        if (s.image) out.push('', `![](${s.image})`);
        break;
      case 'tags':
        if (s.items.length) out.push(s.items.map((it) => it.name).join(', '));
        break;
      case 'contact':
        if (contact) out.push(contact);
        break;
      case 'references':
        for (const it of s.items) { out.push(`- ${segs(it.name, it.role, it.contact)}`); if (it.text) out.push(`  ${it.text.trim().replace(/\n+/g, ' ')}`); }
        break;
      case 'gaming':
        if (s.data?.psn?.username) out.push(`- PSN: ${s.data.psn.username}`);
        if (s.data?.steam?.id) out.push(`- Steam: ${s.data.steam.id}`);
        break;
      case 'pagebreak':
        break; // no body: the heading marker is the whole round trip
      default: break;
    }
  }
  out.push('', `<!-- resume-forge design ${JSON.stringify(toPlain(m).resume.design)} -->`);
  out.push(`<!-- resume-forge meta ${JSON.stringify(toPlain(m).resume.meta)} -->`, '');
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

const TYPE_BY_HEADING = [
  [/experience|employment|work history|career|positions|trabajo|experiencia/i, 'experience'],
  [/education|studies|academic|educaci/i, 'education'],
  [/skill|stack|technolog|tools|competenc|habilidad/i, 'skills'],
  [/language|idioma/i, 'languages'],
  [/certif|licen|credential/i, 'certifications'],
  [/project|portfolio|side|proyecto/i, 'projects'],
  [/award|honou?r|achievement|recognition|premio/i, 'awards'],
  [/volunteer|community|voluntari/i, 'volunteer'],
  [/publication|talk|paper|article|publicaci/i, 'publications'],
  [/social|profiles|links|connect|find me|redes/i, 'iconrow'],
  [/interest|hobb|passion|intereses/i, 'tags'],
  [/contact|reach|contacto/i, 'contact'],
  [/reference|referencia/i, 'references'],
  [/gaming|games|psn|steam|juego/i, 'gaming'],
  [/trivia|fact|fun|dato|curiosidad/i, 'list'],
];

function classifySegments(line) {
  const parts = line.split(/\s+·\s+|\s+\|\s+/).map((x) => x.trim()).filter(Boolean);
  const out = { url: '', range: '', id: '', rest: [] };
  for (const p of parts) {
    if (!out.url && looksLikeUrl(p)) out.url = p;
    else if (!out.id && /^ID\s+\S+/.test(p)) out.id = p.replace(/^ID\s+/, '');
    else if (!out.range && looksLikeDate(p)) out.range = p;
    else out.rest.push(p);
  }
  return out;
}

const parenSplit = (s) => { const m = /^(.*?)\s*\((.+)\)\s*$/.exec(s || ''); return m ? [m[1].trim(), m[2].trim()] : [String(s || '').trim(), '']; };

function parseItemLine(line) {
  // "- [Label](url) {icon}" | "- Label {icon}" | "- text"
  const body = line.replace(/^\s*[-*•]\s+/, '');
  const m = /^(?:\[([^\]]*)\]\(([^)]*)\)|(.*?))\s*(?:\{([^}]*)\})?\s*$/.exec(body);
  if (!m) return { text: body, label: body, url: '', icon: '' };
  const label = (m[1] !== undefined ? m[1] : m[3] || '').trim();
  return { text: label, label, url: (m[2] || '').trim(), icon: (m[4] || '').trim() };
}

/** Parse the Markdown this module writes (and a reasonable hand-written subset). */
export function fromMarkdown(text) {
  const warnings = [];
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const m = blankResume();
  let design = null;
  let meta = null;
  const body = [];
  for (const ln of lines) {
    let mm = /^<!--\s*resume-forge design\s+(\{.*\})\s*-->\s*$/.exec(ln);
    if (mm) { try { design = JSON.parse(mm[1]); } catch { warnings.push('design comment is not valid JSON; ignored'); } continue; }
    mm = /^<!--\s*resume-forge meta\s+(\{.*\})\s*-->\s*$/.exec(ln);
    if (mm) { try { meta = JSON.parse(mm[1]); } catch { /* ignore */ } continue; }
    body.push(ln);
  }
  // Header: everything before the first "## "
  const firstSec = body.findIndex((l) => /^##\s/.test(l));
  const head = firstSec === -1 ? body : body.slice(0, firstSec);
  const rest = firstSec === -1 ? [] : body.slice(firstSec);
  for (const ln of head) {
    const t = ln.trim();
    if (!t) continue;
    if (/^#\s+/.test(t) && !m.basics.name) { m.basics.name = t.replace(/^#\s+/, '').trim(); continue; }
    if (/^\*\*.+\*\*$/.test(t) && !m.basics.title) { m.basics.title = t.replace(/^\*\*|\*\*$/g, '').trim(); continue; }
    if (/^links?:/i.test(t)) {
      for (const piece of t.replace(/^links?:\s*/i, '').split(/\s+·\s+/)) {
        const it = parseItemLine(`- ${piece}`);
        if (it.url || it.label) m.basics.links.push({ label: it.label === it.url ? '' : it.label, url: it.url, icon: it.icon });
      }
      continue;
    }
    for (const p of t.split(/\s+·\s+|\s+\|\s+/)) {
      const v = p.trim();
      if (!v) continue;
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) m.basics.email = m.basics.email || v;
      else if (/^\+?[\d(][\d\s().-]{5,}$/.test(v)) m.basics.phone = m.basics.phone || v;
      else if (looksLikeUrl(v) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) m.basics.website = m.basics.website || v;
      else m.basics.location = m.basics.location || v;
    }
  }
  // Sections
  let cur = null;
  const flush = () => { if (cur) { m.sections.push(cur.sec); cur = null; } };
  const finishEntry = () => {
    if (!cur?.entry) return;
    const e = cur.entry;
    cur.sec.items.push({ ...blankItem(cur.sec.type), ...e.fields, summary: e.prose.join('\n').trim(), notes: e.prose.join('\n').trim(), highlights: e.bullets });
    cur.entry = null;
  };
  for (const ln of rest) {
    const hm = /^##\s+(.*?)\s*(?:<!--\s*([\w-]+)\s+(main|aside)((?:\s+[\w-]+)*)\s*-->)?\s*$/.exec(ln);
    if (hm && !/^###/.test(ln)) {
      finishEntry(); flush();
      const title = hm[1].trim();
      let type = hm[2];
      if (!type || !SECTION_TYPES[type]) {
        type = (TYPE_BY_HEADING.find(([re]) => re.test(title)) || [null, 'text'])[1];
        if (hm[2]) warnings.push(`section type "${hm[2]}" is unknown; inferred ${type}`);
      }
      const sec = newSection(type, hm[3] || undefined);
      const tokens = (hm[4] || '').trim().split(/\s+/).filter(Boolean);
      sec.title = title; sec.items = [];
      sec.hidden = tokens.includes('hidden');
      sec.source = tokens.includes('from-basics') ? 'basics' : '';
      sec.style = tokens.find((t) => t !== 'hidden' && t !== 'from-basics') || '';
      cur = { sec, entry: null, textLines: [] };
      continue;
    }
    if (!cur) continue;
    const t = ln.trim();
    const sec = cur.sec;
    const entryTypes = ['experience', 'education', 'projects', 'volunteer'];
    if (entryTypes.includes(sec.type)) {
      if (/^###\s+/.test(t)) { finishEntry(); cur.entry = { head: t.replace(/^###\s+/, ''), metaDone: false, fields: {}, prose: [], bullets: [] }; continue; }
      if (!cur.entry) { if (t) cur.textLines.push(t); continue; }
      const e = cur.entry;
      if (!t) continue;
      if (/^[-*•]\s+/.test(t)) { e.bullets.push(t.replace(/^[-*•]\s+/, '')); continue; }
      if (!e.metaDone) {
        e.metaDone = true;
        const c = classifySegments(t);
        const r = splitRange(c.range);
        const f = e.fields;
        if (sec.type === 'experience') { const [company, team] = parenSplit(c.rest[0]); Object.assign(f, { role: e.head, company, team, location: c.rest[1] || '', start: r.start, end: r.end, url: c.url }); }
        else if (sec.type === 'education') {
          const [school, field] = parenSplit(c.rest[0]);
          // "school · location · dates · score": with one trailing segment, a grade-looking token is the score.
          let location = c.rest[1] || '';
          let score = c.rest[2] || '';
          if (c.rest.length === 2 && /^(gpa|grade|score|nota|promedio|\d)/i.test(location)) { score = location; location = ''; }
          Object.assign(f, { degree: e.head, school, field, location, score, start: r.start, end: r.end, url: c.url });
        }
        else if (sec.type === 'projects') Object.assign(f, { name: e.head, role: c.rest[0] || '', start: r.start, end: r.end, url: c.url });
        else Object.assign(f, { role: e.head, org: c.rest[0] || '', location: c.rest[1] || '', start: r.start, end: r.end, url: c.url });
        // A meta line with no recognisable parts is prose after all.
        if (!c.url && !c.range && !c.rest.length) e.prose.push(t);
        continue;
      }
      e.prose.push(t);
      continue;
    }
    if (sec.type === 'text' || sec.type === 'contact') { cur.textLines.push(ln); continue; }
    if (!t) continue;
    if (sec.type === 'list' && /^!\[[^\]]*\]\(([^)]+)\)/.test(t)) { sec.image = /^!\[[^\]]*\]\(([^)]+)\)/.exec(t)[1]; continue; }
    if (/^[-*•]\s+/.test(t)) {
      const it = parseItemLine(t);
      switch (sec.type) {
        case 'skills': {
          const sm = /^(.*?)\s*([★☆]{1,5})?\s*(?:·\s*(.*))?$/.exec(it.text);
          sec.items.push({ name: (sm[1] || '').trim(), level: (sm[2] || '').split('★').length - 1, group: (sm[3] || '').trim() });
          break;
        }
        case 'languages': {
          const lm = /^(.*?)(?::\s*(.*?))?\s*([★☆]{1,5})?$/.exec(it.text);
          sec.items.push({ name: (lm[1] || '').trim(), level: (lm[2] || '').trim(), score: (lm[3] || '').split('★').length - 1 });
          break;
        }
        case 'certifications': { const c = classifySegments(it.text); sec.items.push({ ...blankItem('certifications'), name: c.rest[0] || '', issuer: c.rest[1] || '', date: c.range, url: c.url, id: c.id }); break; }
        case 'awards': { const c = classifySegments(it.text); sec.items.push({ ...blankItem('awards'), title: c.rest[0] || '', issuer: c.rest[1] || '', date: c.range }); break; }
        case 'publications': { const c = classifySegments(it.text); sec.items.push({ ...blankItem('publications'), title: c.rest[0] || '', publisher: c.rest[1] || '', date: c.range, url: c.url }); break; }
        case 'references': { const c = classifySegments(it.text); sec.items.push({ ...blankItem('references'), name: c.rest[0] || '', role: c.rest[1] || '', contact: c.rest[2] || c.url || '' }); break; }
        case 'iconrow': sec.items.push({ label: it.label === it.url ? '' : it.label, icon: it.icon, url: it.url }); break;
        case 'list': sec.items.push({ text: it.text, icon: it.icon }); break;
        case 'tags': sec.items.push({ name: it.text }); break;
        case 'gaming': {
          const gm = /^(psn|steam)\s*:\s*(.+)$/i.exec(it.text);
          if (gm) { if (gm[1].toLowerCase() === 'psn') sec.data.psn.username = gm[2].trim(); else sec.data.steam.id = gm[2].trim(); }
          break;
        }
        default: sec.items.push({ ...blankItem(sec.type), [SECTION_TYPES[sec.type].fields[0]?.key || 'text']: it.text });
      }
      continue;
    }
    // Continuation line (indented summary) for the last list item, or tags on one line.
    if (sec.type === 'tags') { for (const name of t.split(/\s*,\s*/).filter(Boolean)) sec.items.push({ name }); continue; }
    const last = sec.items[sec.items.length - 1];
    if (last && /^\s{2,}/.test(ln)) {
      const key = sec.type === 'references' ? 'text' : 'summary';
      if (key in last) last[key] = [last[key], t].filter(Boolean).join(' ');
    }
  }
  finishEntry(); flush();
  for (const s of m.sections) {
    // text sections collected their lines; entry sections may have loose prose (ignored with a warning).
  }
  // Assign text bodies. (Done here because cur is closed over above.)
  return normalizeFromMarkdown(m, body, design, meta, warnings);
}

function normalizeFromMarkdown(m, body, design, meta, warnings) {
  // Re-walk text sections to capture their paragraphs verbatim.
  let i = 0;
  const sections = [];
  for (let li = 0; li < body.length; li++) {
    const hm = /^##\s+(.*?)\s*(?:<!--[^>]*-->)?\s*$/.exec(body[li]);
    if (hm && !/^###/.test(body[li])) sections.push({ start: li + 1, idx: sections.length });
  }
  for (let k = 0; k < sections.length && k < m.sections.length; k++) {
    const sec = m.sections[k];
    if (sec.type !== 'text') continue;
    const end = k + 1 < sections.length ? sections[k + 1].start - 1 : body.length;
    sec.text = body.slice(sections[k].start, end).join('\n').trim();
  }
  i = 0;
  if (design && typeof design === 'object') m.design = design;
  if (meta && typeof meta === 'object') m.meta = { ...m.meta, ...meta };
  if (!m.meta.title || m.meta.title === 'Untitled resume') m.meta.title = m.basics.name || 'Imported Markdown';
  const out = normalizeResume(m);
  out.warnings.unshift(...warnings);
  return out;
}
