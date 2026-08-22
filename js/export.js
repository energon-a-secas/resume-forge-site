// Export and import. Files are detected by content, not only by extension,
// because a JSON Resume is .json like our own JSON and a YAML may be .txt.
import { state } from './state.js';
import { toYAML, fromYAML, toJSON, fromJSON, toJsonResume } from './serialize.js';
import { toMarkdown, fromMarkdown } from './markdown.js';
import { importLinkedIn } from './linkedin.js';
import { renderResume, pageCss } from './render.js';
import { googleFontsUrl } from './design.js';
import { fontsReady } from './fonts.js';
import { downloadText, slugify, readAsText, showToast } from './utils.js';

const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const JSZIP_SRI = 'sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG';

const baseName = () => slugify(state.doc.basics.name || state.doc.meta.title || 'resume');

export async function exportAs(format) {
  const m = state.doc;
  const name = baseName();
  switch (format) {
    case 'yaml': downloadText(toYAML(m), `${name}.resume.yaml`, 'text/yaml'); break;
    case 'json': downloadText(toJSON(m), `${name}.resume.json`, 'application/json'); break;
    case 'jsonresume': downloadText(JSON.stringify(toJsonResume(m), null, 2) + '\n', `${name}.jsonresume.json`, 'application/json'); break;
    case 'md': downloadText(toMarkdown(m), `${name}.resume.md`, 'text/markdown'); break;
    case 'html': downloadText(await standaloneHtml(m), `${name}.resume.html`, 'text/html'); break;
    case 'pdf': await exportPDF(); break;
    default: showToast(`Unknown export: ${format}`);
  }
}

let resumeCssCache = '';
async function resumeCss() {
  if (resumeCssCache) return resumeCssCache;
  const res = await fetch('css/resume.css');
  resumeCssCache = await res.text();
  return resumeCssCache;
}

export async function standaloneHtml(m) {
  const css = await resumeCss();
  const fonts = googleFontsUrl(m.design.fonts);
  const title = (m.basics.name || 'Resume').replace(/</g, '');
  return `<!DOCTYPE html>
<html lang="${m.meta.lang || 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="generator" content="Resume Forge, https://resume.neorgon.com/">
${fonts ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${fonts}">` : ''}
<style>
${css}
${pageCss(m.design)}
html, body { margin: 0; background: #e9ecef; }
body { display: flex; justify-content: center; padding: 24px 12px; }
.sheet { box-shadow: 0 12px 40px rgba(0,0,0,.25); }
@media print { body { padding: 0; background: #fff; } .sheet { box-shadow: none; } }
</style>
</head>
<body>
${renderResume(m)}
</body>
</html>
`;
}

/** Print the sheet alone: vector text, links, real pagination. The user picks "Save as PDF". */
export async function exportPDF() {
  const root = document.getElementById('print-root');
  if (!root) return;
  let style = document.getElementById('r-page');
  if (!style) { style = document.createElement('style'); style.id = 'r-page'; document.head.appendChild(style); }
  style.textContent = pageCss(state.doc.design);
  root.innerHTML = renderResume(state.doc);
  const oldTitle = document.title;
  document.title = baseName();   // the print dialog proposes it as the file name
  await fontsReady();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const cleanup = () => { root.innerHTML = ''; document.title = oldTitle; window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  window.print();
  // Browsers without afterprint (and print-to-file cancellations) still get cleaned up.
  setTimeout(() => { if (root.innerHTML) cleanup(); }, 60000);
}

/* ───────────────────────── import ───────────────────────── */

function loadScript(src, integrity) {
  return new Promise((resolve, reject) => {
    if (window.JSZip) return resolve();
    const s = document.createElement('script');
    s.src = src; s.integrity = integrity; s.crossOrigin = 'anonymous';
    s.onload = resolve; s.onerror = () => reject(new Error('Could not load the ZIP library'));
    document.head.appendChild(s);
  });
}

/** Detect the text format and parse it. @returns {{model, warnings, error?, kind}} */
export function importText(text, hint = '') {
  const t = String(text || '').replace(/^﻿/, '').trim();
  if (!t) return { model: null, warnings: [], error: 'The file is empty', kind: '' };
  const ext = (hint.split('.').pop() || '').toLowerCase();
  if (t.startsWith('{') || t.startsWith('[') || ext === 'json') {
    const r = fromJSON(t);
    return { ...r, kind: 'json' };
  }
  const looksYaml = /^\s*(resume|basics|sections|design)\s*:/m.test(t);
  const looksMd = /^#\s+\S/m.test(t) && /^##\s+/m.test(t);
  if (looksYaml && !looksMd) return { ...fromYAML(t), kind: 'yaml' };
  if (looksMd && !looksYaml) return { ...fromMarkdown(t), kind: 'markdown' };
  if (ext === 'md' || ext === 'txt') return { ...fromMarkdown(t), kind: 'markdown' };
  const y = fromYAML(t);
  if (!y.error) return { ...y, kind: 'yaml' };
  const md = fromMarkdown(t);
  if (md.model && (md.model.basics.name || md.model.sections.length)) return { ...md, kind: 'markdown' };
  return { ...y, kind: 'yaml' };
}

/** Files from the picker or a drop: one resume file, or a LinkedIn ZIP, or several LinkedIn CSVs. */
export async function importFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return { model: null, warnings: [], error: 'No file', kind: '' };
  const zip = files.find((f) => /\.zip$/i.test(f.name) || f.type === 'application/zip');
  if (zip) {
    await loadScript(JSZIP_URL, JSZIP_SRI);
    const z = await window.JSZip.loadAsync(zip);
    const csvs = [];
    for (const [name, entry] of Object.entries(z.files)) {
      if (entry.dir || !/\.csv$/i.test(name)) continue;
      csvs.push({ name, text: await entry.async('string') });
    }
    if (!csvs.length) return { model: null, warnings: [], error: 'The ZIP holds no CSV files; expected a LinkedIn data export', kind: 'linkedin' };
    return { ...importLinkedIn(csvs), kind: 'linkedin' };
  }
  const csvFiles = files.filter((f) => /\.csv$/i.test(f.name));
  if (csvFiles.length) {
    const texts = await Promise.all(csvFiles.map(async (f) => ({ name: f.name, text: await readAsText(f) })));
    return { ...importLinkedIn(texts), kind: 'linkedin' };
  }
  const f = files[0];
  return importText(await readAsText(f), f.name);
}
