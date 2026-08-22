#!/usr/bin/env node
// Validate Resume Forge files without opening the site.
//
// A thin CLI over the site's own js/schema.js and js/serialize.js, so the
// rules cannot fork: this script and the site disagree only if one is outdated.
//
// Usage:
//   node validate.mjs resume.yaml          # one file: YAML, JSON, JSON Resume or Markdown
//   node validate.mjs library              # every .yaml/.json/.md in a directory
//   node validate.mjs - < resume.yaml      # stdin
//   node validate.mjs --print md file      # convert: --print yaml | json | jsonresume | md
//
// Exit codes: 0 clean (info notes allowed) · 1 warnings · 2 unreadable.
// Needs js-yaml next to this file (npm i) or on NODE_PATH.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
try { globalThis.jsyaml = require('js-yaml'); } catch { console.error('js-yaml is not installed: run `npm install` in this folder'); process.exit(2); }

const { fromYAML, fromJSON, toYAML, toJSON, toJsonResume } = await import('./js/serialize.js');
const { fromMarkdown, toMarkdown } = await import('./js/markdown.js');
const { lintResume } = await import('./js/schema.js');

const args = process.argv.slice(2);
const printIdx = args.indexOf('--print');
const printFmt = printIdx >= 0 ? args[printIdx + 1] : '';
const skip = printIdx >= 0 ? printIdx + 1 : -1;
const targets = args.filter((a, i) => !a.startsWith('--') && i !== skip);
if (!targets.length) { console.error('usage: node validate.mjs <file|dir|-> [--print yaml|json|jsonresume|md]'); process.exit(2); }

function parse(text, name) {
  const ext = extname(name).toLowerCase();
  if (ext === '.json') return fromJSON(text);
  if (ext === '.md' || ext === '.txt') return fromMarkdown(text);
  return fromYAML(text);
}

function files(target) {
  if (target === '-') return [['stdin.yaml', readFileSync(0, 'utf8')]];
  if (statSync(target).isDirectory()) {
    return readdirSync(target).filter((f) => /\.(ya?ml|json|md)$/i.test(f) && f !== 'index.json').sort().map((f) => [join(target, f), readFileSync(join(target, f), 'utf8')]);
  }
  return [[target, readFileSync(target, 'utf8')]];
}

let worst = 0;
for (const target of targets) {
  for (const [name, text] of files(target)) {
    const r = parse(text, name);
    if (r.error || !r.model) { console.log(`✖ ${name}: ${r.error || 'unreadable'}`); worst = Math.max(worst, 2); continue; }
    if (printFmt) {
      const m = r.model;
      const out = printFmt === 'json' ? toJSON(m) : printFmt === 'jsonresume' ? JSON.stringify(toJsonResume(m), null, 2) + '\n' : printFmt === 'md' ? toMarkdown(m) : toYAML(m);
      process.stdout.write(out);
      continue;
    }
    const notes = lintResume(r.model);
    const warns = [...r.warnings.map((w) => ({ level: 'warn', text: w })), ...notes.filter((n) => n.level === 'warn')];
    const infos = notes.filter((n) => n.level === 'info');
    const m = r.model;
    const tag = warns.length ? '⚠' : '✓';
    console.log(`${tag} ${name}: ${m.basics.name || '(no name)'} · ${m.sections.length} sections · ${m.design.template}/${m.design.palette}`);
    for (const w of warns) console.log(`    warn: ${w.text}`);
    for (const n of infos) console.log(`    info: ${n.text}`);
    if (warns.length) worst = Math.max(worst, 1);
  }
}
process.exit(worst);
