// The Spanish defaults, and the one rule that protects a person's own words:
// a title they typed is never rewritten when meta.lang changes.
//
// The detector this file exists for is "every section type has a Spanish
// title": a future section type cannot be added without deciding on one,
// because TYPE_IDS is checked against the table key by key.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
globalThis.jsyaml = require('js-yaml');

const { toYAML, fromYAML, toPlain } = await import('../js/serialize.js');
const { toMarkdown, fromMarkdown } = await import('../js/markdown.js');
const { normalizeResume, lintResume, newSection, TYPE_IDS, SECTION_TYPES } = await import('../js/schema.js');
const { LANGS, PRESENT, SECTION_TITLES, sectionTitle, pack, resolveLang } = await import('../js/i18n.js');

/** The pack keys are a closed list for this wave. A new one means a new English literal reached the sheet. */
const PACK_KEYS = ['levels', 'present', 'yourName', 'noGaming', 'recent', 'credentialId'];

const untitled = `resume:
  meta:
    lang: es
    title: Hoja de vida
  basics:
    name: Ana Soto
  sections:
    - type: text
    - type: experience
    - type: education
    - type: skills
      zone: aside
    - type: languages
      zone: aside
    - type: certifications
      zone: aside
    - type: projects
    - type: awards
    - type: volunteer
    - type: publications
    - type: contact
      zone: aside
    - type: references
    - type: tags
      zone: aside
`;

/* ───────────────────────── the table ───────────────────────── */

test('every section type has a title in every supported language', () => {
  for (const lang of LANGS) {
    assert.ok(SECTION_TITLES[lang], `${lang} has a title table`);
    const missing = TYPE_IDS.filter((t) => !(t in SECTION_TITLES[lang]));
    assert.deepEqual(missing, [], `${lang} is missing a title for: ${missing.join(', ')}`);
    for (const t of TYPE_IDS) assert.equal(typeof sectionTitle(lang, t), 'string', `${lang}/${t} is a string`);
  }
  // Every type that is a heading in English must be a heading in Spanish too.
  // "pagebreak" is deliberately not one: its empty title is load-bearing.
  const headings = TYPE_IDS.filter((t) => SECTION_TITLES.en[t] !== '');
  assert.ok(headings.length >= 16, 'most types are headings');
  for (const t of headings) assert.ok(SECTION_TITLES.es[t], `es title for ${t} is not empty`);
  assert.equal(sectionTitle('en', 'pagebreak'), '', 'pagebreak has no title in English');
  assert.equal(sectionTitle('es', 'pagebreak'), '', 'pagebreak has no title in Spanish either');
});

test('the English column of the i18n table matches SECTION_TYPES, so it cannot drift', () => {
  const drift = TYPE_IDS.filter((t) => SECTION_TITLES.en[t] !== SECTION_TYPES[t].title);
  assert.deepEqual(drift, [], `i18n.js and schema.js disagree on: ${drift.join(', ')}`);
});

test('sectionTitle never returns undefined and falls back to English', () => {
  assert.equal(sectionTitle('fr', 'experience'), 'Experience', 'unknown language falls back');
  assert.equal(sectionTitle('es', 'no-such-type'), '', 'unknown type is empty, never undefined');
  assert.equal(sectionTitle(undefined, 'skills'), 'Skills');
  assert.equal(sectionTitle('', 'skills'), 'Skills');
  assert.equal(sectionTitle('es-CL', 'skills'), 'Habilidades', 'a region subtag still resolves');
  assert.equal(sectionTitle('  ES  ', 'skills'), 'Habilidades', 'case and padding do not matter');
});

test('pack is a closed, frozen list of exactly the words the sheet prints', () => {
  for (const lang of LANGS) {
    const p = pack(lang);
    assert.deepEqual(Object.keys(p).sort(), [...PACK_KEYS].sort(), `${lang} pack keys`);
    assert.ok(Object.isFrozen(p), `${lang} pack is frozen`);
    assert.equal(p.levels.length, 6, `${lang} has six level words including the empty one`);
    assert.equal(p.levels[0], '', `${lang} level 0 is blank`);
    for (const k of PACK_KEYS) assert.ok(p[k] !== undefined && p[k] !== null, `${lang}.${k} is set`);
  }
  assert.equal(pack('es').present, 'Actualidad');
  assert.equal(pack('en').present, 'Present');
  assert.deepEqual(pack('klingon'), pack('en'), 'an unknown language gets the English pack');
  assert.deepEqual(pack('es-419'), pack('es'), 'a region subtag gets Spanish');
});

test('PRESENT matches the open-ended words in both languages', () => {
  for (const w of ['Present', 'present', 'Current', 'now', 'Actualidad', 'presente']) assert.ok(PRESENT.test(w), w);
  for (const w of ['2024', 'Sep 2025', 'presentation', '']) assert.equal(PRESENT.test(w), false, w);
});

/* ───────────────────────── C4: the defaults ───────────────────────── */

test('a Spanish document with no title keys gets Spanish section titles', () => {
  const r = fromYAML(untitled);
  assert.equal(r.error, undefined, r.error);
  assert.deepEqual(r.warnings, []);
  const byType = Object.fromEntries(r.model.sections.map((s) => [s.type, s.title]));
  assert.deepEqual(byType, {
    text: 'Perfil',
    experience: 'Experiencia',
    education: 'Educacion',
    skills: 'Habilidades',
    languages: 'Idiomas',
    certifications: 'Certificaciones',
    projects: 'Proyectos',
    awards: 'Premios',
    volunteer: 'Voluntariado',
    publications: 'Publicaciones',
    contact: 'Contacto',
    references: 'Referencias',
    tags: 'Intereses',
  });
});

test('the same document in English gets English titles', () => {
  const r = fromYAML(untitled.replace('lang: es', 'lang: en'));
  const byType = Object.fromEntries(r.model.sections.map((s) => [s.type, s.title]));
  assert.equal(byType.experience, 'Experience');
  assert.equal(byType.education, 'Education');
  assert.equal(byType.tags, 'Interests');
});

test('YAML keys stay English at every meta.lang', () => {
  const y = toYAML(fromYAML(untitled).model);
  for (const key of ['resume:', 'meta:', 'lang: es', 'basics:', 'name:', 'sections:', 'type:', 'title:', 'zone:', 'design:', 'template:', 'palette:']) {
    assert.ok(y.includes(key), `the canonical key ${key} is still English`);
  }
  for (const forbidden of ['seccion', 'titulo', 'idioma:', 'plantilla', 'diseno']) {
    assert.ok(!y.includes(forbidden), `no localized key "${forbidden}" leaked into the YAML`);
  }
  // And it still loads, which is the point: one schema, any language.
  assert.equal(fromYAML(y).error, undefined);
  assert.equal(fromYAML(y).model.meta.lang, 'es');
});

/* ───────────────────────── C5: a typed title is never overwritten ───────────────────────── */

test('a title the person typed survives a language change, through YAML and Markdown', () => {
  const typed = untitled
    .replace('    - type: experience\n', '    - type: experience\n      title: Donde he trabajado\n')
    .replace('    - type: skills\n', '    - type: skills\n      title: Caja de herramientas\n');
  const a = fromYAML(typed).model;
  assert.equal(a.sections[1].title, 'Donde he trabajado');
  assert.equal(a.sections[3].title, 'Caja de herramientas');

  // Save, flip the language on the saved tree, load again.
  for (const lang of ['en', 'es', 'fr']) {
    const tree = toPlain(a);
    tree.resume.meta.lang = lang;
    const b = normalizeResume(tree).model;
    assert.equal(b.sections[1].title, 'Donde he trabajado', `experience title survives lang=${lang}`);
    assert.equal(b.sections[3].title, 'Caja de herramientas', `skills title survives lang=${lang}`);
  }

  // The same, through the two text formats a person actually edits.
  const viaYaml = fromYAML(toYAML(a).replace('lang: es', 'lang: en')).model;
  assert.equal(viaYaml.sections[1].title, 'Donde he trabajado');
  assert.equal(viaYaml.sections[3].title, 'Caja de herramientas');
  const viaMd = fromMarkdown(toMarkdown(a).replace('"lang":"es"', '"lang":"en"')).model;
  assert.equal(viaMd.meta.lang, 'en', 'the language really did change');
  assert.equal(viaMd.sections.find((s) => s.type === 'experience').title, 'Donde he trabajado');
  assert.equal(viaMd.sections.find((s) => s.type === 'skills').title, 'Caja de herramientas');
});

test('even a title that arrived as a default is a value after one save, and is never retranslated', () => {
  // This is the property the whole design rests on: toPlain always writes
  // `title`, and normalizeSection only defaults when the key is absent.
  const a = fromYAML(untitled.replace('lang: es', 'lang: en')).model;
  assert.equal(a.sections[1].title, 'Experience', 'born English');
  const tree = toPlain(a);
  for (const s of tree.resume.sections) assert.ok('title' in s, `${s.type} carries an explicit title key`);
  tree.resume.meta.lang = 'es';
  const b = normalizeResume(tree).model;
  assert.equal(b.sections[1].title, 'Experience', 'still English: nothing rewrites a saved title');
  assert.equal(b.meta.lang, 'es');
});

test('lintResume reports the stale English titles once, as info, and changes nothing', () => {
  const a = fromYAML(untitled.replace('lang: es', 'lang: en')).model;
  const tree = toPlain(a);
  tree.resume.meta.lang = 'es';
  const b = normalizeResume(tree).model;
  const before = b.sections.map((s) => s.title);
  const notes = lintResume(b).filter((n) => /meta\.lang/.test(n.text));
  assert.equal(notes.length, 1, 'exactly one note, not one per section');
  assert.equal(notes[0].level, 'info', 'it is an info note, never a warning');
  assert.deepEqual(b.sections.map((s) => s.title), before, 'lintResume is pure and renamed nothing');
  // An English document says nothing at all.
  assert.deepEqual(lintResume(a).filter((n) => /meta\.lang/.test(n.text)), []);
  // Nor does a Spanish document whose titles are already Spanish.
  assert.deepEqual(lintResume(fromYAML(untitled).model).filter((n) => /meta\.lang/.test(n.text)), []);
});

test('an English document is never told to translate, whatever the tag looks like', () => {
  // The note keys off the resolved language, not off a string compare, so a
  // document written "EN" or "en-GB" stays quiet.
  for (const tag of ['en', 'EN', ' en ', 'en-GB', 'en_US', 'klingon']) {
    assert.equal(resolveLang(tag), 'en', tag);
    const m = fromYAML(untitled.replace('lang: es', `lang: "${tag}"`)).model;
    assert.deepEqual(lintResume(m).filter((n) => /meta\.lang/.test(n.text)), [], `lang: ${tag} says nothing`);
  }
  for (const tag of ['es', 'ES', 'es-CL', 'es_419']) assert.equal(resolveLang(tag), 'es', tag);
  // And the tag the person wrote is preserved, because it is what <html lang> gets.
  assert.equal(fromYAML(untitled.replace('lang: es', 'lang: es-CL')).model.meta.lang, 'es-CL');
  assert.equal(fromYAML(untitled.replace('lang: es', 'lang: es-CL')).model.sections[1].title, 'Experiencia', 'and it still picks Spanish defaults');
});

/* ───────────────────────── C7: a new section is born localized ───────────────────────── */

test('newSection takes a language and defaults to English', () => {
  assert.equal(newSection('experience', 'main').title, 'Experience', 'the default keeps every old call site working');
  assert.equal(newSection('experience', 'main', 'en').title, 'Experience');
  assert.equal(newSection('experience', 'main', 'es').title, 'Experiencia');
  assert.equal(newSection('tags', 'aside', 'es').title, 'Intereses');
  assert.equal(newSection('pagebreak', 'main', 'es').title, '', 'a page break has no title in any language');
  // Everything else about the section is language independent.
  const en = newSection('skills', 'aside', 'en');
  const es = newSection('skills', 'aside', 'es');
  assert.equal(es.type, en.type);
  assert.equal(es.zone, en.zone);
  assert.deepEqual(es.items, en.items);
});
