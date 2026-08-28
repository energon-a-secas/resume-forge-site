// Every word the *sheet* prints in a language other than English, in one table.
// No framework, no build step, no dependency: it is about forty strings.
//
// Three rules this module exists to hold:
//
//   1. Only the rendered sheet and the section-title defaults are localized.
//      The editor, the Catalog and the toolbar stay English, and so do the
//      YAML keys at every `meta.lang`. A localized key would fork the schema
//      and break every importer, every test and validate.mjs.
//   2. A title the person typed is never replaced. `sectionTitle` is read at
//      exactly two places, both of which apply it only where no title exists:
//      `newSection` (schema.js) and `normalizeSection` when `raw.title` is
//      undefined. Changing `meta.lang` on a saved document rewrites nothing.
//   3. `present` is applied at *render* time, never at import time. The model
//      keeps whatever the person wrote, so a document imported in one language
//      displays correctly in the other and switching back is lossless.
//
// Zero imports, deliberately. schema.js, serialize.js, markdown.js and
// render.js all read this file, so it has to sit underneath all of them.

export const LANGS = ['en', 'es'];

/**
 * Present-tense words in any supported language. Lives here rather than in
 * serialize.js (which re-exports it, so no existing importer breaks) because
 * both the date helpers and the renderer need it and neither should import
 * the other.
 */
export const PRESENT = /^(present|current|now|ongoing|today|actualidad|presente)$/i;

/**
 * The default title of each section type, per language. The English column is
 * a copy of `SECTION_TYPES[type].title` in schema.js, which cannot import this
 * file without a cycle; tests/i18n.test.mjs asserts the two agree, so a drift
 * fails the build rather than reaching a sheet.
 *
 * An empty string is a real value: `pagebreak` is a marker, not a heading, and
 * render.test.mjs relies on it having no title in any language.
 */
export const SECTION_TITLES = Object.freeze({
  en: Object.freeze({
    text: 'Profile',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    certifications: 'Certifications',
    projects: 'Projects',
    awards: 'Awards',
    volunteer: 'Volunteering',
    publications: 'Publications',
    iconrow: 'Socials',
    list: 'Trivia',
    tags: 'Interests',
    contact: 'Contact',
    references: 'References',
    gaming: 'Gaming',
    pagebreak: '',
  }),
  es: Object.freeze({
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
    iconrow: 'Redes',
    list: 'Curiosidades',
    tags: 'Intereses',
    contact: 'Contacto',
    references: 'Referencias',
    gaming: 'Juegos',
    pagebreak: '',
  }),
});

/**
 * Every string the renderer prints, resolved once per render. This list is
 * closed: a new entry means a new English literal reached the sheet, which is
 * the thing this table exists to prevent.
 */
const PACKS = Object.freeze({
  en: Object.freeze({
    levels: Object.freeze(['', 'Basic', 'Elementary', 'Intermediate', 'Advanced', 'Expert']),
    present: 'Present',
    yourName: 'Your name',
    noGaming: 'No gaming account set',
    recent: 'Recent',
    credentialId: 'ID',
  }),
  es: Object.freeze({
    levels: Object.freeze(['', 'Basico', 'Elemental', 'Intermedio', 'Avanzado', 'Experto']),
    present: 'Actualidad',
    yourName: 'Tu nombre',
    noGaming: 'Sin cuenta de juegos',
    recent: 'Recientes',
    credentialId: 'ID',
  }),
});

/**
 * Which of LANGS a document is written in, as far as this table is concerned.
 * "es-CL", "ES" and " es " all resolve to "es"; anything unrecognised resolves
 * to "en". The document keeps whatever tag the person wrote, because that tag
 * is what goes in <html lang> and "es-CL" is a better answer there than "es".
 * Exported so callers can ask "is this English?" without re-deriving the rule
 * and getting a different answer for "EN".
 */
export function resolveLang(lang) {
  const tag = String(lang || '').trim().toLowerCase().split(/[-_]/)[0];
  return LANGS.includes(tag) ? tag : 'en';
}

/**
 * The default title for a section type in a language. Falls back to the
 * English default for an unknown language or type, and returns '' rather than
 * undefined for a type nobody has a title for.
 */
export function sectionTitle(lang, type) {
  const en = SECTION_TITLES.en;
  const table = SECTION_TITLES[resolveLang(lang)] || en;
  const t = table[type] !== undefined ? table[type] : en[type];
  return t === undefined ? '' : t;
}

/** Every string the renderer prints, resolved once. Frozen; unknown lang gives English. */
export function pack(lang) {
  return PACKS[resolveLang(lang)] || PACKS.en;
}
