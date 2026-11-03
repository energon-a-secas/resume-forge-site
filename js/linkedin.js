// LinkedIn import. LinkedIn has no public profile API, but every account can
// download its data (Settings > Data privacy > Get a copy of your data), which
// arrives as a ZIP of CSV files. This module turns those CSVs into a resume
// model. It is pure: the UI unzips (JSZip) and hands over {name, text} pairs.
//
// Headers are matched by normalised name with synonyms, so a column LinkedIn
// renames later degrades to "field left blank", not "import failed", and the
// import report names the column it could not find (COLUMNS below), so the
// blank field is visible instead of silent.
//
// Provenance: the header names in COLUMNS were first written from memory. On
// 2026-11-02 they were checked against the header rows (header rows only, no
// data) of real exports published on GitHub: noahgoo/human-to-human
// DEMO/Basic_LinkedInDataExport_10-02-2026.zip (Profile, Positions, Education,
// Skills, Languages, Certifications, PhoneNumbers, Volunteering, Profile
// Summary), David-Fuq/PersonalPortfolio Basic_LinkedInDataExport_03-17-2026
// (Honors, Email Addresses), mcaliman/mcaliman.github.io linkedin/, committed
// 2026-04-19 (Projects, Courses, Organizations, Publications) and
// Ganesh2006646/Personal-Rag-LLM-Chatbot 20_linkdeln/, committed 2026-05-23
// (Projects, Email Addresses). Every first name in COLUMNS matched exactly and
// no header row began with a BOM. tests/linkedin.test.mjs keeps those header
// rows as REAL_HEADERS and fails when COLUMNS reads a name they do not carry.

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

/**
 * The header row and the rows under it as objects keyed by normalised header. The header row is
 * the first row that names a known column (Connections.csv opens with a "Notes:" preamble).
 */
export function csvTable(text, knownColumns = []) {
  const rows = parseCSV(text);
  if (!rows.length) return { headers: [], rows: [] };
  const known = new Set(knownColumns.map(norm));
  let h = rows.findIndex((r) => r.some((c) => known.has(norm(c))));
  if (h === -1) h = 0;
  const headers = rows[h].map(norm);
  return {
    headers,
    rows: rows.slice(h + 1).map((r) => {
      const o = {};
      headers.forEach((k, i) => { if (k) o[k] = (r[i] || '').trim(); });
      return o;
    }),
  };
}

/** Rows as objects keyed by normalised header. */
export function csvObjects(text, knownColumns = []) {
  return csvTable(text, knownColumns).rows;
}

const pick = (o, ...names) => { for (const n of names) { const v = o[norm(n)]; if (v) return v; } return ''; };

const FILE_KEYS = {
  profile: ['profile'], profileSummary: ['profilesummary'], positions: ['positions'], education: ['education'], skills: ['skills'],
  languages: ['languages'], certifications: ['certifications'], projects: ['projects'], honors: ['honors', 'honours'],
  emails: ['emailaddresses', 'emails'], phones: ['phonenumbers', 'phones'], volunteering: ['volunteering'],
  publications: ['publications'], courses: ['courses'], organizations: ['organizations'],
};

export function classifyFile(name) {
  const base = norm(String(name || '').split('/').pop().replace(/\.csv$/i, ''));
  for (const [key, names] of Object.entries(FILE_KEYS)) if (names.includes(base)) return key;
  return '';
}

/**
 * Every column the importer reads, per file: field -> accepted header names. The first name is
 * the header LinkedIn writes (checked 2026-11-02, see the top of this file); the rest are
 * synonyms. A field none of whose names is in the file's header row is reported as missing.
 */
export const COLUMNS = {
  profile: {
    first: ['First Name'], last: ['Last Name'], headline: ['Headline'], location: ['Geo Location', 'Location', 'Address'],
    summary: ['Summary'], websites: ['Websites'], twitter: ['Twitter Handles'],
  },
  profileSummary: { text: ['Profile Summary'] },
  emails: { email: ['Email Address', 'Email'], primary: ['Primary'] },
  phones: { extension: ['Extension'], number: ['Number'] },
  positions: {
    company: ['Company Name', 'Company'], role: ['Title', 'Position'], description: ['Description'], location: ['Location'],
    start: ['Started On', 'Start Date'], end: ['Finished On', 'End Date'],
  },
  education: {
    school: ['School Name', 'School'], start: ['Start Date', 'Started On'], end: ['End Date', 'Finished On'], notes: ['Notes'],
    degree: ['Degree Name', 'Degree'], activities: ['Activities'],
  },
  skills: { name: ['Name', 'Skill', 'Skills'] },
  languages: { name: ['Name', 'Language'], proficiency: ['Proficiency'] },
  certifications: { name: ['Name'], url: ['Url'], authority: ['Authority', 'Issuer'], start: ['Started On', 'Issued On'], license: ['License Number'] },
  projects: { title: ['Title', 'Name'], description: ['Description'], url: ['Url'], start: ['Started On'], end: ['Finished On'] },
  honors: { title: ['Title'], description: ['Description'], issued: ['Issued On', 'Date'] },
  volunteering: {
    org: ['Company Name', 'Organization'], role: ['Role', 'Position'], cause: ['Cause'], start: ['Started On'], end: ['Finished On'],
    description: ['Description'],
  },
  publications: { name: ['Name', 'Title'], published: ['Published On', 'Date'], description: ['Description'], publisher: ['Publisher'], url: ['Url'] },
  courses: { name: ['Name'], number: ['Number'] },
  organizations: { name: ['Name'], position: ['Position'] },
};

/** The first name of each field in `cols` that the header row does not carry under any of its names. */
export function missingColumns(headers, cols) {
  const have = new Set(headers);
  return Object.values(cols).filter((names) => !names.some((n) => have.has(norm(n)))).map((names) => names[0]);
}

const quoteList = (names) => names.map((n) => `"${n}"`).join(names.length > 2 ? ', ' : ' or ').replace(/, ("[^"]*")$/, ', or $1');

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
 * @returns {{model, warnings:string[], report:{file:string, rows:number, missing:string[]}[]}}
 *   `missing` names the columns (by COLUMNS' first name) the file's header row did not carry.
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
  // Each row comes back as a getter over that file's COLUMNS entry: get('start') reads
  // "Started On" or its synonym. `anchors` find the header row; they are not the column list.
  const rowsOf = (key, anchors) => {
    const f = byKey[key];
    if (!f) return [];
    const cols = COLUMNS[key];
    const file = f.name.split('/').pop();
    const { headers, rows } = csvTable(f.text, anchors);
    const missing = headers.length ? missingColumns(headers, cols) : [];
    report.push({ file, rows: rows.length, missing });
    if (missing.length) {
      const one = missing.length === 1;
      warnings.push(`${file} has no ${quoteList(missing)} column, so ${one ? 'that field was' : 'those fields were'} left blank. LinkedIn may have renamed ${one ? 'it' : 'them'}.`);
    }
    return rows.map((r) => (field) => pick(r, ...cols[field]));
  };

  const prof = rowsOf('profile', ['First Name', 'Headline'])[0];
  let summary = '';
  if (prof) {
    m.basics.name = [prof('first'), prof('last')].filter(Boolean).join(' ');
    m.basics.title = prof('headline');
    m.basics.location = prof('location');
    summary = prof('summary');
    const sites = parseWebsites(prof('websites'));
    if (sites.length) {
      m.basics.website = sites[0].url;
      for (const s of sites.slice(1)) m.basics.links.push({ label: s.label, url: s.url, icon: '' });
    }
    const tw = prof('twitter');
    if (tw) m.basics.links.push({ label: 'X', url: `https://x.com/${tw.replace(/^@/, '').split(',')[0].trim()}`, icon: 'x' });
  }
  // Newer exports also carry a one-column Profile Summary.csv. Profile.csv's Summary still holds
  // the text in the exports checked, so this file is read only when that column is empty.
  const about = rowsOf('profileSummary', ['Profile Summary']).map((get) => get('text')).filter(Boolean).join('\n');
  if (!summary && about) summary = about;
  const emails = rowsOf('emails', ['Email Address']);
  if (emails.length) {
    const primary = emails.find((get) => /yes|true/i.test(get('primary'))) || emails[0];
    m.basics.email = primary('email');
  } else if (prof && !byKey.emails) {
    warnings.push('No Email Addresses.csv among the files, so the email is blank; add it in the editor.');
  }
  const phones = rowsOf('phones', ['Number']);
  if (phones.length) m.basics.phone = [phones[0]('extension'), phones[0]('number')].filter(Boolean).join(' ');

  const add = (type, zone, title, items, style = '') => {
    if (!items.length) return;
    const s = newSection(type, zone);
    s.title = title; s.style = style;
    s.items = items.map((it) => ({ ...blankItem(type), ...it }));
    m.sections.push(s);
  };
  if (summary) { const s = newSection('text', 'main'); s.title = 'Profile'; s.text = summary; m.sections.push(s); }

  add('experience', 'main', 'Experience', rowsOf('positions', ['Company Name', 'Title']).map((get) => {
    const d = splitDescription(get('description'));
    const start = get('start');
    return { role: get('role'), company: get('company'), location: get('location'), start, end: get('end') || (start ? 'Present' : ''), summary: d.summary, highlights: d.highlights };
  }));
  add('education', 'main', 'Education', rowsOf('education', ['School Name', 'Degree Name']).map((get) => ({
    school: get('school'), degree: get('degree'), start: get('start'), end: get('end'),
    notes: [get('notes'), get('activities')].filter(Boolean).join(' '),
  })));
  add('projects', 'main', 'Projects', rowsOf('projects', ['Title', 'Url']).map((get) => {
    const d = splitDescription(get('description'));
    return { name: get('title'), url: get('url'), start: get('start'), end: get('end'), summary: d.summary, highlights: d.highlights };
  }));
  add('skills', 'aside', 'Skills', rowsOf('skills', ['Name', 'Skills']).map((get) => ({ name: get('name'), level: 0, group: '' })), 'tags');
  add('languages', 'aside', 'Languages', rowsOf('languages', ['Name', 'Proficiency']).map((get) => ({ name: get('name'), level: get('proficiency'), score: proficiencyScore(get('proficiency')) })));
  add('certifications', 'aside', 'Certifications', rowsOf('certifications', ['Name', 'Authority']).map((get) => ({ name: get('name'), issuer: get('authority'), date: get('start'), url: get('url'), id: get('license') })));
  add('awards', 'main', 'Honors and awards', rowsOf('honors', ['Title', 'Issued On']).map((get) => ({ title: get('title'), date: get('issued'), summary: get('description') })));
  add('volunteer', 'main', 'Volunteering', rowsOf('volunteering', ['Company Name', 'Role']).map((get) => {
    const d = splitDescription(get('description'));
    const cause = get('cause');
    return { role: get('role'), org: get('org'), start: get('start'), end: get('end'), summary: [cause, d.summary].filter(Boolean).join(': '), highlights: d.highlights };
  }));
  add('publications', 'main', 'Publications', rowsOf('publications', ['Name', 'Publisher']).map((get) => ({ title: get('name'), publisher: get('publisher'), date: get('published'), url: get('url'), summary: get('description') })));
  add('list', 'aside', 'Courses', rowsOf('courses', ['Name']).map((get) => ({ text: [get('name'), get('number')].filter(Boolean).join(' '), icon: '' })));
  add('list', 'main', 'Organizations', rowsOf('organizations', ['Name', 'Position']).map((get) => ({ text: [get('name'), get('position')].filter(Boolean).join(', '), icon: '' })));

  if (!m.basics.name && !m.sections.length) warnings.push('The files were recognised but held no rows');
  m.meta.title = m.basics.name ? `${m.basics.name} (LinkedIn import)` : 'LinkedIn import';
  const out = normalizeResume(m);
  return { model: out.model, warnings: [...warnings, ...out.warnings], report };
}
