// The share link, exercised end to end in node.
//
// js/share.js imports nothing and touches no DOM, so the same code that runs in
// the browser runs here: CompressionStream, Blob, Response, btoa and atob are all
// node globals from 24 on. What this file cannot prove is that view.html renders
// the result, which is why the workstream was also driven in a real browser.
//
// The library examples are the fixtures on purpose. They are real resumes of real
// length, so the measurements below are the ones a person would get.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import yaml from 'js-yaml';

globalThis.jsyaml = yaml;
const { fromYAML, toPlain } = await import('../js/serialize.js');
const {
  encodeShare, decodeShare, buildShareLink, shareUrl,
  stripImages, countImages, payloadFromUrl, MAX_LINK, SAFE_LINK,
  putHandoff, takeHandoff, HANDOFF_KEY,
} = await import('../js/share.js');

// The handoff is the one browser-facing pair in share.js. Node has no session
// storage, so the smallest possible stand-in stands in; the point of the test is
// the protocol between view.html and the builder, not the storage engine.
const fakeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    get size() { return m.size; },
  };
};

const libDir = new URL('../library/', import.meta.url);
const examples = readdirSync(libDir)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => [f, toPlain(fromYAML(readFileSync(new URL(f, libDir), 'utf8')).model)]);

// A share link is built from wherever the site is served; the tests fix the base
// so a length is a property of the resume and not of a local path.
const BASE = 'https://resume.neorgon.com/';

// A real 54 KB JPEG, the repo's own OG image. Nothing about a person is in it,
// and it is the size a phone photo lands at after js/assets.js resizes it.
const photoDataUri = () => {
  const bytes = readFileSync(new URL('../og-preview.jpg', import.meta.url));
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
};

test('C9: every library example survives encode then decode unchanged', async () => {
  assert.ok(examples.length >= 6, 'library has examples');
  for (const [name, tree] of examples) {
    const back = await decodeShare(await encodeShare(tree));
    assert.deepEqual(back, tree, name);
  }
});

test('C9: the payload is the JSON tree, so view.html needs no YAML parser', async () => {
  const [, tree] = examples.find(([n]) => n === 'cloud-architect.yaml');
  const back = await decodeShare(await encodeShare(tree));
  // Round-tripping through JSON.parse of the canonical tree is the whole format.
  assert.deepEqual(back, JSON.parse(JSON.stringify(tree)));
  assert.equal(back.resume.basics.name, 'Marina Costa');
});

test('C9: a library link is far under the Safari ceiling', async () => {
  for (const [name, tree] of examples) {
    const r = await buildShareLink(tree, { base: BASE });
    assert.equal(r.tooLong, false, name);
    // Measured Aug 2026: 1,501 (gamer) to 2,430 (cloud-architect) characters.
    // The bound is deliberately loose; the point is the order of magnitude.
    assert.ok(r.length < MAX_LINK / 8, `${name} is ${r.length}, wanted well under ${MAX_LINK / 8}`);
    assert.ok(r.length > 800, `${name} is ${r.length}, suspiciously short for a whole resume`);
  }
});

test('C9: gzip is doing the work, the link is smaller than the JSON it carries', async () => {
  for (const [name, tree] of examples) {
    const payload = await encodeShare(tree);
    assert.ok(payload.length < JSON.stringify(tree).length, name);
  }
});

test('C9: images are dropped unless asked for, and that is the whole length', async () => {
  const tree = structuredClone(examples.find(([n]) => n === 'cloud-architect.yaml')[1]);
  tree.resume.basics.photo = photoDataUri();
  assert.equal(countImages(tree), 1);

  const off = await buildShareLink(tree, { base: BASE });
  assert.equal(off.dropped, 1);
  assert.equal(off.images, 0);
  assert.equal(off.tooLong, false);

  const on = await buildShareLink(tree, { images: true, base: BASE });
  assert.equal(on.images, 1);
  assert.equal(on.dropped, 0);
  // Measured: 2,430 without the photo, 71,634 with it. One image is 96% of the link.
  assert.ok(on.length > off.length * 20, `photo link ${on.length} vs ${off.length}`);
  assert.ok(on.length < MAX_LINK, `${on.length} would already fail in Safari`);

  // Dropping it is not lossy for the reader's sake: the decoded tree simply has no photo.
  const back = await decodeShare(off.url.split('#s=')[1]);
  assert.equal(back.resume.basics.photo, undefined);
  assert.equal(back.resume.basics.name, tree.resume.basics.name);
});

test('C9: a second image pushes past the refusal point, with the number to show', async () => {
  const tree = structuredClone(examples.find(([n]) => n === 'cloud-architect.yaml')[1]);
  const uri = photoDataUri();
  tree.resume.basics.photo = uri;
  tree.resume.design.banner.image = uri;
  assert.equal(countImages(tree), 2);

  const r = await buildShareLink(tree, { images: true, base: BASE });
  assert.equal(r.tooLong, true);
  assert.ok(r.length > SAFE_LINK, `${r.length} should be over ${SAFE_LINK}`);
  // Measured: 140,153 characters, which no browser would open.
  assert.ok(r.length > 100000);
});

test('C9: stripImages removes the three image homes and nothing else', () => {
  const tree = structuredClone(examples.find(([n]) => n === 'cloud-architect.yaml')[1]);
  tree.resume.basics.photo = 'data:image/jpeg;base64,AAAA';
  tree.resume.design.banner.image = 'data:image/jpeg;base64,BBBB';
  tree.resume.design.banner.dim = 40;
  tree.resume.sections[0].image = 'data:image/jpeg;base64,CCCC';
  assert.equal(countImages(tree), 3);

  const out = stripImages(tree);
  assert.equal(out.resume.basics.photo, undefined);
  assert.equal(out.resume.design.banner.image, undefined);
  assert.equal(out.resume.design.banner.dim, undefined, 'dim only ever dimmed that image');
  assert.equal(out.resume.sections[0].image, undefined);
  assert.equal(countImages(out), 0);
  // Everything else is untouched, and the caller's tree is not mutated.
  assert.equal(out.resume.basics.name, tree.resume.basics.name);
  assert.equal(out.resume.sections.length, tree.resume.sections.length);
  assert.equal(out.resume.design.banner.shape, tree.resume.design.banner.shape);
  assert.equal(tree.resume.basics.photo, 'data:image/jpeg;base64,AAAA');
});

test('C9: the payload rides in the fragment, never in a query string', async () => {
  const [, tree] = examples[0];
  const url = shareUrl(await encodeShare(tree), BASE);
  assert.equal(url.startsWith(`${BASE}view.html#s=`), true, url.slice(0, 60));
  assert.equal(url.includes('?'), false, 'a query string would be sent to the server');
  // Nothing else in the URL: what a server could log is the page name and nothing more.
  assert.equal(new URL(url).search, '');
  assert.equal(new URL(url).pathname, '/view.html');
});

test('C9: payloadFromUrl reads a whole URL or a bare hash, and rejects junk', () => {
  assert.equal(payloadFromUrl('https://resume.neorgon.com/view.html#s=AbC-_123'), 'AbC-_123');
  assert.equal(payloadFromUrl('#s=AbC-_123'), 'AbC-_123');
  assert.equal(payloadFromUrl('#t=1&s=AbC'), 'AbC');
  assert.equal(payloadFromUrl('#nothing'), null);
  assert.equal(payloadFromUrl(''), null);
  assert.equal(payloadFromUrl(null), null);
});

test('C9: "Make it yours" hands the tree over once, and never through the URL', () => {
  const store = fakeStorage();
  globalThis.sessionStorage = store;
  try {
    const [, tree] = examples.find(([n]) => n === 'cloud-architect.yaml');
    assert.equal(takeHandoff(), null, 'nothing waiting on an ordinary visit');

    assert.equal(putHandoff(tree), true);
    assert.equal(store.size, 1);
    const got = takeHandoff();
    assert.deepEqual(got, tree);
    assert.equal(got.resume.basics.name, 'Marina Costa');

    // Taken once: a reload of the builder must not offer it again.
    assert.equal(store.size, 0, 'the key is removed as it is read');
    assert.equal(takeHandoff(), null);

    // The key is one string, shared by both ends rather than typed twice.
    assert.equal(HANDOFF_KEY, 'resume-forge-v2:handoff');
  } finally {
    delete globalThis.sessionStorage;
  }
});

test('C9: a browser with storage off is reported, not silently ignored', () => {
  globalThis.sessionStorage = {
    getItem() { throw new Error('The operation is insecure.'); },
    setItem() { throw new Error('The operation is insecure.'); },
    removeItem() { throw new Error('The operation is insecure.'); },
  };
  try {
    // False is what makes view.js show its message instead of navigating away.
    assert.equal(putHandoff({ resume: {} }), false);
    assert.equal(takeHandoff(), null);
  } finally {
    delete globalThis.sessionStorage;
  }
});

test('C9: a damaged link throws rather than rendering half a resume', async () => {
  const payload = await encodeShare(examples[0][1]);
  await assert.rejects(() => decodeShare(payload.slice(0, payload.length - 40)));
  await assert.rejects(() => decodeShare('not-a-payload'));
  await assert.rejects(() => decodeShare(''));
  // A valid gzip of something that is not a resume must also fail loudly.
  const notATree = await encodeShare('just a string');
  await assert.rejects(() => decodeShare(notATree));
});
