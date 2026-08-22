import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import yaml from 'js-yaml';

globalThis.jsyaml = yaml;
const { fromYAML } = await import('../js/serialize.js');
const { renderResume, renderSection, inlineMd, safeHref, pageCss } = await import('../js/render.js');
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
    assert.ok(html.includes('class="r-sec r-sec-' + type), `${type} renders a section`);
    assert.ok(!/undefined/.test(html), `${type} leaks undefined`);
  }
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
