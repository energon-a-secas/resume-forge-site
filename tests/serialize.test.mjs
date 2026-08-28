import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import yaml from 'js-yaml';

globalThis.jsyaml = yaml;
const { toYAML, fromYAML, toJSON, fromJSON, toJsonResume, fromJsonResume, toIsoDate, fromIsoDate, splitRange, toPlain } = await import('../js/serialize.js');
const { toMarkdown, fromMarkdown } = await import('../js/markdown.js');
const { normalizeResume, migrateV1, lintResume, SECTION_TYPES } = await import('../js/schema.js');

const libDir = new URL('../library/', import.meta.url);
const examples = readdirSync(libDir).filter((f) => f.endsWith('.yaml')).map((f) => [f, readFileSync(new URL(f, libDir), 'utf8')]);

// Content that every format must carry. Editor ids are deliberately excluded.
const contentOf = (m) => ({
  basics: m.basics,
  sections: m.sections.map(({ id, ...s }) => s),
  design: m.design,
});

test('every library example parses without warnings and has a name', () => {
  assert.ok(examples.length >= 1, 'library has examples');
  for (const [name, text] of examples) {
    const r = fromYAML(text);
    assert.equal(r.error, undefined, `${name}: ${r.error}`);
    assert.deepEqual(r.warnings, [], `${name} warnings`);
    assert.ok(r.model.basics.name, `${name} has a name`);
    assert.ok(r.model.sections.length >= 3, `${name} has sections`);
  }
});

test('YAML round-trips: dump then load gives the same content', () => {
  for (const [name, text] of examples) {
    const a = fromYAML(text).model;
    const b = fromYAML(toYAML(a)).model;
    assert.deepEqual(contentOf(b), contentOf(a), name);
  }
});

test('JSON round-trips and matches the YAML tree', () => {
  for (const [name, text] of examples) {
    const a = fromYAML(text).model;
    const b = fromJSON(toJSON(a)).model;
    assert.deepEqual(contentOf(b), contentOf(a), name);
    assert.deepEqual(JSON.parse(toJSON(a)), toPlain(a));
  }
});

test('Markdown round-trips every library example', () => {
  for (const [name, text] of examples) {
    const a = fromYAML(text).model;
    const md = toMarkdown(a);
    const r = fromMarkdown(md);
    assert.equal(r.error, undefined);
    const b = r.model;
    assert.deepEqual(contentOf(b), contentOf(a), `${name}\n--- markdown ---\n${md.slice(0, 1500)}`);
  }
});

test('Markdown without markers is classified by heading words', () => {
  const md = `# Jane Doe
**Platform Engineer**

Berlin · jane@example.com · +49 30 1234567 · janedoe.dev

## Summary
Keeps clusters boring.

## Work experience
### SRE
Acme (Core) · Berlin · 2021 - Present · https://acme.example
Owned the on-call rotation.
- Cut MTTR by half
- Wrote the runbooks

## Skills
- Kubernetes ★★★★☆ · Platform
- Go

## Languages
- German: Native
- English: Fluent ★★★★★

## Interests
Climbing, Chess
`;
  const { model: m, warnings } = fromMarkdown(md);
  assert.deepEqual(warnings, []);
  assert.equal(m.basics.name, 'Jane Doe');
  assert.equal(m.basics.title, 'Platform Engineer');
  assert.equal(m.basics.email, 'jane@example.com');
  assert.equal(m.basics.phone, '+49 30 1234567');
  assert.equal(m.basics.website, 'janedoe.dev');
  assert.equal(m.basics.location, 'Berlin');
  assert.deepEqual(m.sections.map((s) => s.type), ['text', 'experience', 'skills', 'languages', 'tags']);
  const exp = m.sections[1].items[0];
  assert.equal(exp.role, 'SRE');
  assert.equal(exp.company, 'Acme');
  assert.equal(exp.team, 'Core');
  assert.equal(exp.location, 'Berlin');
  assert.equal(exp.start, '2021');
  assert.equal(exp.end, 'Present');
  assert.equal(exp.url, 'https://acme.example');
  assert.equal(exp.summary, 'Owned the on-call rotation.');
  assert.deepEqual(exp.highlights, ['Cut MTTR by half', 'Wrote the runbooks']);
  assert.deepEqual(m.sections[2].items[0], { name: 'Kubernetes', level: 4, group: 'Platform' });
  assert.deepEqual(m.sections[2].items[1], { name: 'Go', level: 0, group: '' });
  assert.deepEqual(m.sections[3].items[1], { name: 'English', level: 'Fluent', score: 5 });
  assert.deepEqual(m.sections[4].items.map((i) => i.name), ['Climbing', 'Chess']);
  assert.equal(m.sections[0].text, 'Keeps clusters boring.');
});

test('section source and hidden survive YAML and Markdown', () => {
  const m = normalizeResume({ resume: { basics: { name: 'A', links: [{ label: 'GitHub', url: 'https://github.com/a' }] },
    sections: [{ type: 'iconrow', title: 'Socials', zone: 'aside', style: 'circles', source: 'basics' }, { type: 'tags', title: 'Old', zone: 'main', hidden: true, items: ['x'] }] } }).model;
  const y = fromYAML(toYAML(m)).model;
  assert.equal(y.sections[0].source, 'basics');
  assert.equal(y.sections[0].style, 'circles');
  assert.equal(y.sections[1].hidden, true);
  const md = toMarkdown(m);
  assert.ok(md.includes('<!-- iconrow aside circles from-basics -->'), md);
  assert.ok(md.includes('<!-- tags main hidden -->'));
  const back = fromMarkdown(md).model;
  assert.equal(back.sections[0].source, 'basics');
  assert.equal(back.sections[0].style, 'circles');
  assert.deepEqual(back.sections[0].items, []);
  assert.equal(back.sections[1].hidden, true);
  assert.deepEqual(back.sections[1].items, [{ name: 'x' }]);
});

test('JSON Resume export has the official field names and imports back', () => {
  const a = fromYAML(examples[0][1]).model;
  const jr = toJsonResume(a);
  assert.equal(jr.basics.name, a.basics.name);
  assert.equal(jr.basics.label, a.basics.title);
  assert.ok(Array.isArray(jr.work) && jr.work.length >= 1);
  const w = jr.work[0];
  for (const k of ['name', 'position', 'startDate', 'highlights']) assert.ok(k in w, `work.${k}`);
  assert.match(w.startDate, /^\d{4}(-\d{2})?$/);
  assert.equal(w.endDate, undefined, 'open-ended role has no endDate');
  assert.ok(jr.basics.profiles.every((p) => p.network && p.url));
  const back = fromJsonResume(jr).model;
  assert.equal(back.basics.name, a.basics.name);
  const exp = back.sections.find((s) => s.type === 'experience');
  assert.equal(exp.items[0].role, a.sections.find((s) => s.type === 'experience').items[0].role);
  assert.equal(exp.items[0].team, 'Developer Platform', 'team survives via "Company (Team)"');
  assert.equal(exp.items[0].end, 'Present');
  // A JSON Resume file pasted into the JSON importer is recognised by shape.
  const viaJson = fromJSON(JSON.stringify(jr)).model;
  assert.equal(viaJson.basics.name, a.basics.name);
});

test('date helpers', () => {
  assert.equal(toIsoDate('Sep 2025'), '2025-09');
  assert.equal(toIsoDate('September 2025'), '2025-09');
  assert.equal(toIsoDate('2020'), '2020');
  assert.equal(toIsoDate('2020-8'), '2020-08');
  assert.equal(toIsoDate('09/2025'), '2025-09');
  assert.equal(toIsoDate('Present'), '');
  assert.equal(toIsoDate('someday'), 'someday');
  assert.equal(fromIsoDate('2025-09-01'), 'Sep 2025');
  assert.equal(fromIsoDate('2025-09'), 'Sep 2025');
  assert.equal(fromIsoDate('2020'), '2020');
  assert.deepEqual(splitRange('Sep 2025 - Present'), { start: 'Sep 2025', end: 'Present' });
  assert.deepEqual(splitRange('2014 – 2018'), { start: '2014', end: '2018' });
  assert.deepEqual(splitRange('2014 to 2018'), { start: '2014', end: '2018' });
  assert.deepEqual(splitRange('Present'), { start: '', end: 'Present' });
  assert.deepEqual(splitRange('2023'), { start: '2023', end: '' });
});

test('normalize tolerates junk and reports it', () => {
  const r = normalizeResume({ resume: { basics: { name: 'X' }, sections: [{ type: 'nope' }, { type: 'skills', items: ['A', { name: 'B', level: '9' }] }], design: { palette: 'lilac', template: 'poster' } } });
  assert.equal(r.model.sections[0].type, 'text');
  assert.deepEqual(r.model.sections[1].items, [{ name: 'A', group: '', level: 0 }, { name: 'B', group: '', level: 5 }]);
  assert.equal(r.model.design.palette, 'navy');
  assert.equal(r.model.design.template, 'banner');
  assert.equal(r.warnings.length, 3);
  assert.ok(Object.keys(SECTION_TYPES).length >= 16);
});

test('v1 localStorage shape migrates with nothing dropped', () => {
  const v1 = {
    name: 'John Doe', title: 'Senior Software Engineer', location: 'San Francisco, CA', email: 'john@example.com', phone: '+1 555',
    linkedin: 'linkedin.com/in/johndoe', github: 'github.com/johndoe', website: 'johndoe.dev', linktree: '', twitter: 'twitter.com/johndoe',
    summary: 'Passionate engineer.',
    experience: [{ company: 'Tech Corp', role: 'Senior', dates: '2020 - Present', location: 'SF', description: 'Led things.\n• Designed APIs\n• Mentored 5 devs' }],
    skills: [{ name: 'JavaScript', hearts: 5, category: 'technical' }],
    education: [{ school: 'Uni', degree: 'B.S.', dates: '2014 - 2018', location: 'Boston' }],
    languages: [{ name: 'English', level: 'Native' }],
    gaming: { enabled: true, psnUsername: 'johnny', psnStats: { level: 300 }, steamId: '', steamStats: null },
    layout: { columnSide: 'right', columnWidth: 30, columnColor: '#2d5016', columnOpacity: 100, bgDim: 20, template: 'big-header', spacing: 'tight' },
    sidebarSections: [{ id: 'skills', enabled: true, title: 'SKILLS' }, { id: 'education', enabled: false, title: 'EDUCATION' }],
    assets: { profilePhoto: 'data:image/png;base64,AAAA', bgImage: '', photoShape: 'rounded', photoBorder: true, borderColor: '#8b5cf6', borderWidth: 4 },
    fonts: { heading: 'Permanent Marker', body: 'Inter' },
  };
  const m = migrateV1(v1);
  assert.equal(m.basics.name, 'John Doe');
  assert.equal(m.basics.links.length, 3);
  assert.equal(m.basics.links[0].url, 'https://linkedin.com/in/johndoe');
  assert.equal(m.basics.photo, 'data:image/png;base64,AAAA');
  const exp = m.sections.find((s) => s.type === 'experience').items[0];
  assert.equal(exp.start, '2020'); assert.equal(exp.end, 'Present');
  assert.equal(exp.summary, 'Led things.');
  assert.deepEqual(exp.highlights, ['Designed APIs', 'Mentored 5 devs']);
  assert.equal(m.sections.find((s) => s.type === 'skills').items[0].level, 5);
  assert.equal(m.sections.find((s) => s.type === 'education').hidden, true, 'disabled sidebar section stays, hidden');
  assert.equal(m.sections.find((s) => s.type === 'gaming').data.psn.username, 'johnny');
  assert.equal(m.design.template, 'banner');
  assert.equal(m.design.columns.side, 'right');
  assert.equal(m.design.colors.band, '#2d5016');
  assert.equal(m.design.photo.shape, 'rounded');
  assert.equal(m.design.density, 'compact');
  assert.deepEqual(m.design.fonts, { heading: 'Permanent Marker', body: 'Inter' });
  assert.ok(Array.isArray(lintResume(m)));
});

test('a colon inside an unquoted YAML line becomes text, not [object Object]', () => {
  const r = fromYAML(`resume:\n  basics: { name: X }\n  sections:\n    - type: experience\n      items:\n        - role: A\n          highlights:\n            - Built the practice: 120 interviews\n            - plain\n`);
  assert.equal(r.error, undefined, r.error);
  const it = r.model.sections[0].items[0];
  assert.deepEqual(it.highlights, ['Built the practice: 120 interviews', 'plain']);
});

test('a page break normalizes, and round-trips through YAML, JSON and Markdown', () => {
  const src = { resume: { basics: { name: 'A' }, sections: [
    { type: 'text', title: 'Profile', text: 'Hi' },
    { type: 'pagebreak' },
    { type: 'experience', title: 'Experience', items: [{ role: 'R', company: 'C' }] },
  ] } };
  const r = normalizeResume(src);
  assert.deepEqual(r.warnings, [], 'a page break is a known type, not a warning');
  const pb = r.model.sections[1];
  assert.equal(pb.type, 'pagebreak');
  assert.equal(pb.title, '', 'no title, in any language: the renderer emits a bare marker');
  assert.equal(pb.zone, 'main');
  assert.deepEqual(pb.items, [], 'it has no fields, so it has no items');
  assert.equal(pb.hidden, false);

  const content = (m) => m.sections.map(({ id, ...s }) => s);
  const a = r.model;
  assert.deepEqual(content(fromYAML(toYAML(a)).model), content(a), 'YAML');
  assert.deepEqual(content(fromJSON(toJSON(a)).model), content(a), 'JSON');
  const md = toMarkdown(a);
  const back = fromMarkdown(md);
  assert.equal(back.error, undefined);
  assert.deepEqual(back.warnings, []);
  assert.deepEqual(content(back.model), content(a), `Markdown\n${md}`);

  // The marker is the whole of it: a heading comment and no body.
  assert.ok(toYAML(a).includes('type: pagebreak'), 'the YAML names the type');
  assert.ok(md.includes('<!-- pagebreak main -->'), md);
  assert.equal(md.split('\n').filter((l) => /pagebreak/.test(l)).length, 1, 'exactly one line mentions it');

  // Hidden, and in the side column, both survive a save.
  const odd = normalizeResume({ resume: { basics: { name: 'A' }, sections: [{ type: 'pagebreak', zone: 'aside', hidden: true }, { type: 'text', text: 'x' }] } }).model;
  const oddBack = fromYAML(toYAML(odd)).model;
  assert.equal(oddBack.sections[0].hidden, true);
  assert.equal(oddBack.sections[0].zone, 'aside');
  assert.ok(lintResume(odd).every((n) => n.level !== 'warn'), 'an odd page break is an info note, never a warning');
});

test('photo framing clamps to integer percents and only exports when it is not the default', () => {
  const framed = (photo) => normalizeResume({ resume: { basics: { name: 'A' }, design: { photo } } }).model.design.photo;
  const xyz = (photo) => { const p = framed(photo); return [p.x, p.y, p.zoom]; };

  assert.deepEqual(xyz({}), [50, 50, 100], 'the defaults, frozen in the contract');
  assert.deepEqual(xyz(undefined), [50, 50, 100], 'no photo block at all');
  assert.deepEqual(xyz({ x: 0, y: 100, zoom: 300 }), [0, 100, 300], 'the ends of both ranges are legal');
  assert.deepEqual(xyz({ x: -40, y: 999, zoom: 5 }), [0, 100, 100], 'out of range clamps, silently');
  assert.deepEqual(xyz({ x: 'left', y: null, zoom: {} }), [50, 50, 100], 'junk falls back to the default');
  assert.deepEqual(xyz({ x: 33.7, y: '61.2', zoom: '150.9' }), [33, 61, 150], 'all three are integers');
  assert.deepEqual(normalizeResume({ resume: { basics: { name: 'A' }, design: { photo: { x: 1 } } } }).warnings, [], 'framing never adds a warning');
  // The other photo keys are untouched by the new ones.
  const p = framed({ shape: 'square', size: 'lg', ring: false, x: 10 });
  assert.equal(p.shape, 'square'); assert.equal(p.size, 'lg'); assert.equal(p.ring, false);

  const exported = (photo) => toPlain(normalizeResume({ resume: { basics: { name: 'A' }, design: { photo } } }).model).resume.design.photo;
  for (const k of ['x', 'y', 'zoom']) assert.ok(!(k in exported({})), `an unframed photo does not write ${k}`);
  assert.deepEqual(exported({ x: 0, y: 20, zoom: 220 }), { shape: 'circle', size: 'md', ring: true, x: 0, y: 20, zoom: 220 }, 'x: 0 is a value, not an absence');
  assert.deepEqual(exported({ zoom: 180 }), { shape: 'circle', size: 'md', ring: true, zoom: 180 }, 'only what moved is written');

  // And it survives the trip back out and in.
  const a = normalizeResume({ resume: { basics: { name: 'A' }, design: { photo: { x: 0, y: 88, zoom: 275 } } } }).model;
  assert.deepEqual(fromYAML(toYAML(a)).model.design.photo, a.design.photo, 'YAML');
  assert.deepEqual(fromJSON(toJSON(a)).model.design.photo, a.design.photo, 'JSON');
  assert.deepEqual(fromMarkdown(toMarkdown(a)).model.design.photo, a.design.photo, 'Markdown carries design as JSON');
});
