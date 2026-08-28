import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import yaml from 'js-yaml';

globalThis.jsyaml = yaml;
const { fromYAML } = await import('../js/serialize.js');
const { renderResume, renderSection, inlineMd, safeHref, pageCss, sheetStyle } = await import('../js/render.js');
const { TEMPLATES } = await import('../js/design.js');
const { TYPE_IDS, newSection, normalizeResume } = await import('../js/schema.js');
const { SAMPLES, sampleSection } = await import('../js/catalog.js');

const libDir = new URL('../library/', import.meta.url);
const examples = readdirSync(libDir).filter((f) => f.endsWith('.yaml')).map((f) => [f, fromYAML(readFileSync(new URL(f, libDir), 'utf8')).model]);

test('every example renders in every template without leaking "undefined" and with every visible title', () => {
  for (const [name, m] of examples) {
    for (const t of Object.keys(TEMPLATES)) {
      const d = structuredClone(m);
      d.design.template = t;
      const html = renderResume(d);
      assert.ok(html.startsWith('<article class="sheet t-' + t), `${name}/${t} starts with the sheet`);
      assert.ok(!/undefined|\[object Object\]|NaN/.test(html), `${name}/${t} leaks a JS value`);
      for (const s of d.sections.filter((x) => !x.hidden && x.title)) assert.ok(html.includes(`>${s.title}</h2>`), `${name}/${t} shows "${s.title}"`);
      assert.ok(html.includes(d.basics.name), `${name}/${t} shows the name`);
    }
  }
});

test('every section type renders its sample', () => {
  const [, base] = examples[0];
  for (const type of TYPE_IDS) {
    assert.ok(SAMPLES[type] !== undefined, `sample for ${type}`);
    const sec = sampleSection(type, 'main');
    const html = renderSection({ ...base, sections: [sec] }, sec, base.design);
    assert.ok(!/undefined/.test(html), `${type} leaks undefined`);
    // A page break is a marker, not a section: it deliberately has no .r-sec
    // wrapper and no title, so the blanket assertion cannot apply to it.
    if (type === 'pagebreak') {
      assert.equal(html, '<div class="r-pagebreak" aria-hidden="true"></div>', 'pagebreak renders the marker');
      continue;
    }
    assert.ok(html.includes('class="r-sec r-sec-' + type), `${type} renders a section`);
  }
});

test('a page break is a bare marker, hides like any section, and never prints a title', () => {
  const [, base] = examples[0];
  const s = newSection('pagebreak', 'main');
  assert.equal(renderSection(base, s), '<div class="r-pagebreak" aria-hidden="true"></div>');
  s.hidden = true;
  assert.equal(renderSection(base, s), '');
  s.hidden = false;
  s.title = 'Should not print';
  const html = renderResume({ ...base, sections: [s] });
  assert.ok(html.includes('<div class="r-pagebreak" aria-hidden="true"></div>'), 'the marker reaches the sheet');
  assert.ok(!html.includes('Should not print'), 'no title, no r-sec wrapper');
});

test('photo framing reaches the sheet as three custom properties, zoom already divided', () => {
  const [, base] = examples[0];
  const d = structuredClone(base.design);
  assert.deepEqual([d.photo.x, d.photo.y, d.photo.zoom], [50, 50, 100], 'defaults are integer percents');
  d.photo = { ...d.photo, x: 30, y: 70, zoom: 160 };
  const css = sheetStyle(d);
  assert.ok(css.includes('--r-photo-x:30%'), 'x is a percent');
  assert.ok(css.includes('--r-photo-y:70%'), 'y is a percent');
  assert.ok(css.includes('--r-photo-zoom:1.60'), 'zoom is divided by 100 here, not in the CSS');
  assert.ok(!/calc\(/.test(readFileSync(new URL('../css/resume.css', import.meta.url), 'utf8').match(/\.r-photo img \{[^}]*\}/)[0]), 'no arithmetic in the photo rule');
});

test('"Present" is stored in English and printed in the document language', () => {
  const [, base] = examples[0];
  const withJob = (lang) => renderResume(normalizeResume({ resume: {
    basics: { name: 'Marina Costa' }, meta: { lang },
    sections: [{ type: 'experience', title: 'Experience', items: [{ role: 'Cloud Platform Engineer', company: 'Fabrikam Logistics', start: '2023', end: 'Present' }] }],
    design: base.design,
  } }).model);
  assert.ok(withJob('en').includes('2023 – Present'), 'English prints the stored word');
  const es = withJob('es');
  assert.ok(es.includes('2023 – Actualidad'), 'Spanish prints Actualidad');
  assert.ok(!es.includes('Present<') && !/– Present/.test(es), 'and never the English word');
});

test('hidden sections and empty sections render nothing', () => {
  const [, base] = examples[0];
  const s = newSection('skills', 'aside');
  s.items = [];
  assert.equal(renderSection(base, s), '<section class="r-sec r-sec-skills" data-sid="' + s.id + '">\n<h2 class="r-sec-title">Skills</h2>\n<div class="r-sec-body"><ul class="r-tags"></ul></div>\n</section>');
  s.hidden = true;
  assert.equal(renderSection(base, s), '');
});

test('user text is escaped and links are sanitised', () => {
  const m = normalizeResume({ resume: { basics: { name: '<img src=x onerror=alert(1)>', website: 'javascript:alert(1)', links: [{ label: 'x', url: 'javascript:alert(2)', icon: '' }] }, sections: [{ type: 'text', title: '"quoted" & <b>', text: '[click](javascript:alert(3)) **bold** <script>' }] } }).model;
  const html = renderResume(m);
  assert.ok(!html.includes('<img src=x'), 'name is escaped');
  assert.ok(!/href="javascript:/i.test(html), 'no javascript: hrefs');
  assert.ok(html.includes('&lt;script&gt;'), 'script tag escaped');
  assert.ok(html.includes('<strong>bold</strong>'), 'bold still works');
  assert.ok(html.includes('&quot;quoted&quot; &amp; &lt;b&gt;'), 'title escaped');
  assert.equal(safeHref('javascript:alert(1)'), '');
  assert.equal(safeHref('neorgon.com/x'), 'https://neorgon.com/x');
  assert.equal(inlineMd('a <b> *it* **bo** [t](https://x.y)'), 'a &lt;b&gt; <em>it</em> <strong>bo</strong> <a href="https://x.y">t</a>');
});

test('page css follows the paper size', () => {
  assert.equal(pageCss({ page: 'A4' }), '@page { size: 210mm 297mm; margin: 0; }');
  assert.equal(pageCss({ page: 'Letter' }), '@page { size: 215.9mm 279.4mm; margin: 0; }');
});

test('an icon row with source basics renders the basics links and nothing else', () => {
  const m = normalizeResume({ resume: { basics: { name: 'A', links: [{ label: 'GitHub', url: 'https://github.com/a' }, { label: 'Site', url: 'https://a.example', icon: 'globe' }] },
    sections: [{ type: 'iconrow', title: 'Socials', zone: 'aside', source: 'basics', items: [{ label: 'Ignored', icon: 'x' }] }], design: { links: 'none' } } }).model;
  const html = renderResume(m);
  assert.equal((html.match(/class="r-tile"/g) || []).length, 2, 'two tiles from basics');
  assert.ok(html.includes('href="https://github.com/a"'));
  assert.ok(!html.includes('Ignored'));
  assert.ok(!html.includes('class="r-links'), 'header links hidden with links: none');
});
