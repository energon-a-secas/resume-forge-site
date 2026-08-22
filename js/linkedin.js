// LinkedIn import. LinkedIn has no public profile API, but every account can
// download its data (Settings > Data privacy > Get a copy of your data), which
// arrives as a ZIP of CSV files. This module turns those CSVs into a resume
// model. It is pure: the UI unzips (JSZip) and hands over {name, text} pairs.
//
// Headers are matched by normalised name with synonyms, so a column LinkedIn
// renames later degrades to "field left blank", not "import failed".

import { blankResume, newSection, blankItem, normalizeResume } from './schema.js';

/** RFC 4180 CSV: quoted fields, doubled quotes, newlines inside quotes, CRLF, BOM. */
export function parseCSV(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = ''; rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Rows as objects keyed by normalised header; the header row is the first row that names a known column. */
export function csvObjects(text, knownColumns = []) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const known = new Set(knownColumns.map(norm));
  let h = rows.findIndex((r) => r.some((c) => known.has(norm(c))));
  if (h === -1) h = 0;
  const headers = rows[h].map(norm);
  return rows.slice(h + 1).map((r) => {
    const o = {};
    headers.forEach((k, i) => { if (k) o[k] = (r[i] || '').trim(); });
    return o;
  });
}

const pick = (o, ...names) => { for (const n of names) { const v = o[norm(n)]; if (v) return v; } return ''; };

const FILE_KEYS = {
  profile: ['profile'], positions: ['positions'], education: ['education'], skills: ['skills'],
  languages: ['languages'], certifications: ['certifications'], projects: ['projects'], honors: ['honors', 'honours'],
  emails: ['emailaddresses', 'emails'], phones: ['phonenumbers', 'phones'], volunteering: ['volunteering'],
  publications: ['publications'], courses: ['courses'], organizations: ['organizations'],
};

export function classifyFile(name) {
  const base = norm(String(name || '').split('/').pop().replace(/\.csv$/i, ''));
  for (const [key, names] of Object.entries(FILE_KEYS)) if (names.includes(base)) return key;
  return '';
}

const splitDescription = (text) => {
  const lines = String(text || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const isBullet = (x) => /^[-*•✦▸◆→✓·]\s*/.test(x);
  return {
    summary: lines.filter((x) => !isBullet(x)).join(' '),
    highlights: lines.filter(isBullet).map((x) => x.replace(/^[-*•✦▸◆→✓·]\s*/, '')),
  };
};

const proficiencyScore = (w) => {
  const s = String(w || '').toLowerCase();
  if (/native|bilingual/.test(s)) return 5;
  if (/full professional/.test(s)) return 4;
  if (/professional working/.test(s)) return 3;
  if (/limited/.test(s)) return 2;
  if (/elementary/.test(s)) return 1;
  return 0;
};

/** Websites come as "[PERSONAL:https://a.com,PORTFOLIO:https://b.com]". */
export function parseWebsites(raw) {
  const s = String(raw || '').trim().replace(/^\[|\]$/g, '');
  if (!s) return [];
  return s.split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
    const m = /^([A-Z_ ]+):(.+)$/i.exec(x);
    const label = m ? m[1].trim().toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : '';
    return { label: label === 'Other' ? '' : label, url: m ? m[2].trim() : x };
  });
}

/**
 * @param {{name:string, text:string}[]} files  CSVs from the LinkedIn export
 * @returns {{model, warnings:string[], report:{file:string, rows:number}[]}}
 */
export function importLinkedIn(files) {
  const m = blankResume();
  const report = [];
  const warnings = [];
  const byKey = {};
  for (const f of files || []) {
    const key = classifyFile(f.name);
    if (!key) continue;
    byKey[key] = f;
  }
  if (!Object.keys(byKey).length) {
    return { model: null, warnings: ['No recognised LinkedIn CSV found (expected Profile.csv, Positions.csv, Education.csv, Skills.csv ...)'], report };
  }
  const rowsOf = (key, cols) => {
    const f = byKey[key];
    if (!f) return [];
    const rows = csvObjects(f.text, cols);
    report.push({ file: f.name.split('/').pop(), rows: rows.length });
    return rows;
  };

  const prof = rowsOf('profile', ['First Name', 'Headline'])[0];
  let summary = '';
  if (prof) {
    m.basics.name = [pick(prof, 'First Name'), pick(prof, 'Last Name')].filter(Boolean).join(' ');
    m.basics.title = pick(prof, 'Headline');
    m.basics.location = pick(prof, 'Geo Location', 'Location', 'Address');
    summary = pick(prof, 'Summary');
    const sites = parseWebsites(pick(prof, 'Websites'));
    if (sites.length) {
      m.basics.website = sites[0].url;
      for (const s of sites.slice(1)) m.basics.links.push({ label: s.label, url: s.url, icon: '' });
    }
    const tw = pick(prof, 'Twitter Handles');
    if (tw) m.basics.links.push({ label: 'X', url: `https://x.com/${tw.replace(/^@/, '').split(',')[0].trim()}`, icon: 'x' });
  }
  const emails = rowsOf('emails', ['Email Address']);
  if (emails.length) {
    const primary = emails.find((e) => /yes|true/i.test(pick(e, 'Primary'))) || emails[0];
    m.basics.email = pick(primary, 'Email Address', 'Email');
  }
  const phones = rowsOf('phones', ['Number']);
  if (phones.length) m.basics.phone = [pick(phones[0], 'Extension'), pick(phones[0], 'Number')].filter(Boolean).join(' ');

  const add = (type, zone, title, items, style = '') => {
    if (!items.length) return;
    const s = newSection(type, zone);
    s.title = title; s.style = style;
    s.items = items.map((it) => ({ ...blankItem(type), ...it }));
    m.sections.push(s);
  };
  if (summary) { const s = newSection('text', 'main'); s.title = 'Profile'; s.text = summary; m.sections.push(s); }

  add('experience', 'main', 'Experience', rowsOf('positions', ['Company Name', 'Title']).map((r) => {
    const d = splitDescription(pick(r, 'Description'));
    const start = pick(r, 'Started On', 'Start Date');
    return { role: pick(r, 'Title', 'Position'), company: pick(r, 'Company Name', 'Company'), location: pick(r, 'Location'), start, end: pick(r, 'Finished On', 'End Date') || (start ? 'Present' : ''), summary: d.summary, highlights: d.highlights };
  }));
  add('education', 'main', 'Education', rowsOf('education', ['School Name', 'Degree Name']).map((r) => ({
    school: pick(r, 'School Name', 'School'), degree: pick(r, 'Degree Name', 'Degree'), start: pick(r, 'Start Date', 'Started On'), end: pick(r, 'End Date', 'Finished On'),
    notes: [pick(r, 'Notes'), pick(r, 'Activities')].filter(Boolean).join(' '),
  })));
  add('projects', 'main', 'Projects', rowsOf('projects', ['Title', 'Url']).map((r) => {
    const d = splitDescription(pick(r, 'Description'));
    return { name: pick(r, 'Title', 'Name'), url: pick(r, 'Url'), start: pick(r, 'Started On'), end: pick(r, 'Finished On'), summary: d.summary, highlights: d.highlights };
  }));
  add('skills', 'aside', 'Skills', rowsOf('skills', ['Name']).map((r) => ({ name: pick(r, 'Name', 'Skill'), level: 0, group: '' })), 'tags');
  add('languages', 'aside', 'Languages', rowsOf('languages', ['Name', 'Proficiency']).map((r) => ({ name: pick(r, 'Name', 'Language'), level: pick(r, 'Proficiency'), score: proficiencyScore(pick(r, 'Proficiency')) })));
  add('certifications', 'aside', 'Certifications', rowsOf('certifications', ['Name', 'Authority']).map((r) => ({ name: pick(r, 'Name'), issuer: pick(r, 'Authority', 'Issuer'), date: pick(r, 'Started On', 'Issued On'), url: pick(r, 'Url'), id: pick(r, 'License Number') })));
  add('awards', 'main', 'Honors and awards', rowsOf('honors', ['Title', 'Issued On']).map((r) => ({ title: pick(r, 'Title'), date: pick(r, 'Issued On', 'Date'), summary: pick(r, 'Description') })));
  add('volunteer', 'main', 'Volunteering', rowsOf('volunteering', ['Company Name', 'Role']).map((r) => {
    const d = splitDescription(pick(r, 'Description'));
    const cause = pick(r, 'Cause');
    return { role: pick(r, 'Role', 'Position'), org: pick(r, 'Company Name', 'Organization'), start: pick(r, 'Started On'), end: pick(r, 'Finished On'), summary: [cause, d.summary].filter(Boolean).join(': '), highlights: d.highlights };
  }));
  add('publications', 'main', 'Publications', rowsOf('publications', ['Name', 'Publisher']).map((r) => ({ title: pick(r, 'Name', 'Title'), publisher: pick(r, 'Publisher'), date: pick(r, 'Published On', 'Date'), url: pick(r, 'Url'), summary: pick(r, 'Description') })));
  add('list', 'aside', 'Courses', rowsOf('courses', ['Name']).map((r) => ({ text: [pick(r, 'Name'), pick(r, 'Number')].filter(Boolean).join(' '), icon: '' })));
  add('list', 'main', 'Organizations', rowsOf('organizations', ['Name', 'Position']).map((r) => ({ text: [pick(r, 'Name'), pick(r, 'Position')].filter(Boolean).join(', '), icon: '' })));

  if (!m.basics.name && !m.sections.length) warnings.push('The files were recognised but held no rows');
  m.meta.title = m.basics.name ? `${m.basics.name} (LinkedIn import)` : 'LinkedIn import';
  const out = normalizeResume(m);
  return { model: out.model, warnings: [...warnings, ...out.warnings], report };
}
