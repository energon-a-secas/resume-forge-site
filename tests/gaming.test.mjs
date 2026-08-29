// The code-drift detector (CONTRACTS.md C11), plus the degradation rule that lets the
// site ship before the worker is redeployed (C1 consumer rule 2).
//
// Why this file exists: `worker/src/index.js` deploys on its own schedule and
// `js/gaming.js` is its only reader. Nothing else in the system would notice the two
// disagreeing about an error code, so a rename on one side would stay invisible until a
// person clicked Fetch and read a wrong sentence. Importing both files here and asserting
// set equality is the read-back.
//
// Importing the worker in node is safe on purpose: its module scope is const data only,
// and every Workers-adjacent global (fetch, Request, Response, URL) is used inside a
// function body and exists in node anyway. `globalThis.fetch` is poisoned below so that a
// test claiming "no upstream call is made" fails loudly instead of quietly going online.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import worker, { ERROR_CODES } from '../worker/src/index.js';
import { HANDLED_CODES, parseEnvelope, gamingError, clearGamingError } from '../js/gaming.js';
import { runGamingFetch, reportActionFailure } from '../js/events.js';
import { state } from '../js/state.js';
import { newSection, blankResume } from '../js/schema.js';

const realFetch = globalThis.fetch;
globalThis.fetch = () => {
  throw new Error('an upstream fetch was made where the contract says none happens');
};
process.on('exit', () => { globalThis.fetch = realFetch; });

const ORIGIN = 'https://resume.neorgon.com';
const VALVE_TEST_ID = '76561197960287930';   // Valve's own public test account

/** Drive the worker in-process. `env` defaults to no key, the state this site is in. */
async function call(path, { origin = ORIGIN, env = {} } = {}) {
  const headers = origin ? { Origin: origin } : {};
  const res = await worker.fetch(new Request(`https://resumeforge-api.neorgon.workers.dev${path}`, { headers }), env);
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { res, body };
}

test('C11: the worker and the site agree on the exact set of error codes', () => {
  assert.deepEqual([...ERROR_CODES].sort(), [...HANDLED_CODES].sort());
});

test('C11: neither side lists a code twice', () => {
  assert.equal(new Set(ERROR_CODES).size, ERROR_CODES.length);
  assert.equal(new Set(HANDLED_CODES).size, HANDLED_CODES.length);
});

test('C11: the site has words for every code the worker can send', () => {
  for (const code of ERROR_CODES) {
    const env = parseEnvelope({ ok: false, code }, 'steam');
    assert.equal(env.code, code, `${code} did not survive parseEnvelope`);
    assert.ok(env.message.length > 0, `${code} has no message when the worker sends none`);
    assert.equal(typeof env.hint, 'string', `${code} hint is not a string`);
  }
});

// ── C1: the envelope, on every path a person can reach ──────────────────────

const cases = [
  ['/psn?username=someone', 'RETIRED', 410, 'psn'],
  ['/psn', 'RETIRED', 410, 'psn'],
  ['/steam', 'MISSING_PARAM', 400, 'steam'],
  ['/steam?id=', 'MISSING_PARAM', 400, 'steam'],
  ['/steam?id=not-an-id', 'BAD_ID', 400, 'steam'],
  [`/steam?id=${VALVE_TEST_ID.slice(0, 16)}`, 'BAD_ID', 400, 'steam'],
  [`/steam?id=${VALVE_TEST_ID}`, 'NOT_CONFIGURED', 501, 'steam'],
  ['/nothing-here', 'NOT_A_ROUTE', 404, ''],
];

for (const [path, code, status, provider] of cases) {
  test(`C1: ${path} answers ${status} ${code} and makes no upstream call`, async () => {
    const { res, body } = await call(path);
    assert.equal(res.status, status);
    assert.equal(body.ok, false);
    assert.equal(body.code, code);
    assert.equal(body.provider, provider);
    assert.ok(ERROR_CODES.includes(body.code));
    assert.ok(body.message.length > 0);
    assert.equal(typeof body.hint, 'string');
    assert.match(res.headers.get('Content-Type') || '', /application\/json/);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  });
}

test('C1: no route ever answers 500, and every code has a status that is not 500', async () => {
  for (const [path] of cases) {
    const { res } = await call(path);
    assert.notEqual(res.status, 500);
  }
  // Including the path where the worker itself throws: `env` is a Proxy that explodes on
  // the key the /steam branch reads, which is the closest thing to an internal bug that
  // can be staged from outside.
  const boom = new Proxy({}, { get() { throw new Error('staged internal fault'); } });
  const { res, body } = await call(`/steam?id=${VALVE_TEST_ID}`, { env: boom });
  assert.notEqual(res.status, 500);
  assert.equal(body.ok, false);
  assert.ok(ERROR_CODES.includes(body.code));
});

test('C1: a rejected origin gets JSON for curl and no CORS header for the browser', async () => {
  const { res, body } = await call('/steam?id=' + VALVE_TEST_ID, { origin: 'https://example.com' });
  assert.equal(res.status, 403);
  assert.equal(body.code, 'FORBIDDEN_ORIGIN');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
});

test('C1: /steam checks the key before it checks nothing else, but after the ID', async () => {
  // A person who mistyped their ID must read that, not a message about a key they do not
  // own. Order matters here and is easy to invert while refactoring.
  const bad = await call('/steam?id=nope', { env: { STEAM_API_KEY: 'set' } });
  assert.equal(bad.body.code, 'BAD_ID');
  const noKey = await call(`/steam?id=${VALVE_TEST_ID}`, { env: {} });
  assert.equal(noKey.body.code, 'NOT_CONFIGURED');
});

// ── C1 consumer rule 2: degrade against the deploy that is live today ───────

test('C1 rule 2: the live worker bare 500 body degrades to correct text, not a crash', () => {
  // Verbatim body of the deploy still serving resume.neorgon.com today.
  const env = parseEnvelope({ error: 'Failed to fetch Steam stats' }, 'steam');
  assert.equal(env.ok, false);
  assert.equal(env.code, 'UPSTREAM_ERROR');
  assert.equal(env.provider, 'steam');
  assert.equal(env.message, 'The stats service did not answer in a shape this site understands.');
  assert.equal(env.hint, 'Type the numbers in by hand below.');
});

for (const [label, body] of [
  ['no body at all', null],
  ['a body that did not parse', undefined],
  ['a string body', 'Internal Server Error'],
  ['an array body', []],
  ['an object with no code', { ok: false }],
  ['a truthy ok with no stats', { ok: true, provider: 'steam' }],
]) {
  test(`C1 rule 2: ${label} synthesises UPSTREAM_ERROR`, () => {
    const env = parseEnvelope(body, 'steam');
    assert.equal(env.ok, false);
    assert.equal(env.code, 'UPSTREAM_ERROR');
    assert.ok(env.message.length > 0);
  });
}

test('C1: the worker message and hint win over the site table when they are present', () => {
  const env = parseEnvelope({ ok: false, code: 'NOT_CONFIGURED', provider: 'steam', message: 'Worker words.', hint: '' }, 'steam');
  assert.equal(env.message, 'Worker words.');
  assert.equal(env.hint, '');   // an empty hint is a value, not an absence
});

test('C1: an unknown code from a newer worker is shown, not swallowed', () => {
  const env = parseEnvelope({ ok: false, code: 'SOMETHING_NEW', provider: 'steam', message: 'A newer worker said this.' }, 'steam');
  assert.equal(env.code, 'SOMETHING_NEW');
  assert.equal(env.message, 'A newer worker said this.');
  assert.ok(env.hint.length > 0, 'an unknown code still needs a way out for the person');
});

// ── C2: the success envelope, and the one live shape that predates it ───────

test('C2: a success envelope hands back exactly the stats object', () => {
  const stats = { games: 88, playtime: 1240, recentGames: [{ name: 'Elden Ring' }] };
  const env = parseEnvelope({ ok: true, provider: 'steam', stats }, 'steam');
  assert.equal(env.ok, true);
  assert.deepEqual(env.stats, stats);
});

test('C2: the pre-wave-2 bare stats body is still accepted as a success', () => {
  const env = parseEnvelope({ games: 88, playtime: 1240 }, 'steam');
  assert.equal(env.ok, true);
  assert.equal(env.stats.games, 88);
});

// ── the click path itself: js/events.js → runGamingFetch ────────────────────
//
// Why this block exists: `runGamingFetch` had no test of any kind, and shipped dead. It
// calls `secAt`, which was declared inside `onAction`, so every press of either Fetch
// button threw `ReferenceError: secAt is not defined` before the button label changed and
// before any request was made. `onAction` is async, so the throw became a rejected promise,
// and the click listener held no reference to it: the failure was swallowed entirely. No
// label change, no request, no error line, no console entry. The tests below drive the real
// exported function, so the same mistake fails here instead of in someone's browser.
//
// `js/events.js` imports cleanly in node: every `document` reference in it and in the modules
// it pulls in sits inside a function body, not at module scope. It only needs a DOM once it
// runs, and the stub below is the whole of what it touches.

/** The smallest document `renderContentPanel` and `showToast` need. */
function stubDom() {
  const toasts = [];
  const realDoc = globalThis.document;
  const realRaf = globalThis.requestAnimationFrame;
  globalThis.document = {
    getElementById: () => null,      // renderContentPanel returns early on a missing panel
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ className: '', textContent: '', setAttribute() {}, classList: { add() {}, remove() {} }, remove() {} }),
    body: { appendChild: (n) => toasts.push(n) },
  };
  globalThis.requestAnimationFrame = (fn) => fn();
  return { toasts, restore() { globalThis.document = realDoc; globalThis.requestAnimationFrame = realRaf; } };
}

/** Answer the next fetch with one staged body, and record the URLs actually requested. */
function stubFetch(body, status) {
  const calls = [];
  const poisoned = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, restore() { globalThis.fetch = poisoned; } };
}

/** A document holding one gaming section, and the fake button the click handler would pass. */
function gamingDoc() {
  const doc = blankResume();
  const sec = newSection('gaming', 'aside');
  doc.sections.push(sec);
  state.doc = doc;
  state.docId = null;
  clearGamingError(sec.id);
  return { doc, sec, btn: { dataset: { sec: '0' }, textContent: 'Fetch', disabled: false } };
}

test('A: runGamingFetch resolves instead of throwing, and reaches the worker', async () => {
  // The exact regression. Before the fix this rejected with a ReferenceError from its first
  // line, so nothing below it ever ran.
  const dom = stubDom();
  const net = stubFetch(JSON.stringify({ ok: true, provider: 'steam', stats: { games: 88, playtime: 1240 } }), 200);
  try {
    const { sec, btn } = gamingDoc();
    sec.data.steam.id = VALVE_TEST_ID;
    await runGamingFetch(btn, 'steam');
    assert.equal(net.calls.length, 1, 'no request was made at all');
    assert.equal(net.calls[0], `https://resumeforge-api.neorgon.workers.dev/steam?id=${VALVE_TEST_ID}`);
    assert.deepEqual(sec.data.steam.stats, { games: 88, playtime: 1240 });
    assert.equal(gamingError(sec.id), null);
  } finally { net.restore(); dom.restore(); }
});

test('A: the button says Fetching while it waits, and is restored afterwards', async () => {
  const dom = stubDom();
  const { sec, btn } = gamingDoc();
  sec.data.steam.id = VALVE_TEST_ID;
  let seen = null;
  const poisoned = globalThis.fetch;
  globalThis.fetch = async () => {
    seen = { label: btn.textContent, disabled: btn.disabled };
    return new Response(JSON.stringify({ ok: false, code: 'NOT_CONFIGURED', provider: 'steam' }), { status: 501 });
  };
  try {
    await runGamingFetch(btn, 'steam');
    assert.deepEqual(seen, { label: 'Fetching…', disabled: true }, 'the wait was never shown');
    assert.equal(btn.textContent, 'Fetch', 'the original label did not come back');
    assert.equal(btn.disabled, false, 'the button stayed disabled');
  } finally { globalThis.fetch = poisoned; dom.restore(); }
});

test('A + C1 rule 2: the live bare 500 becomes the alert line, and never the model', async () => {
  // What a person actually meets today: the deployed worker is pre-wave-2 and answers a bare
  // 500. The alert must carry the synthesised UPSTREAM_ERROR words, and C8 says nothing about
  // a failed fetch may reach the model, so `stats` has to still be null afterwards.
  const dom = stubDom();
  const net = stubFetch(JSON.stringify({ error: 'Failed to fetch Steam stats' }), 500);
  try {
    const { sec, btn } = gamingDoc();
    sec.data.steam.id = VALVE_TEST_ID;
    await runGamingFetch(btn, 'steam');
    const err = gamingError(sec.id);
    assert.equal(err.code, 'UPSTREAM_ERROR');
    assert.equal(err.message, 'The stats service did not answer in a shape this site understands.');
    assert.equal(err.hint, 'Type the numbers in by hand below.');
    assert.equal(sec.data.steam.stats, null, 'a failed fetch wrote to the model');
  } finally { net.restore(); dom.restore(); }
});

test('A: an empty field is answered without a request', async () => {
  const dom = stubDom();
  const net = stubFetch('{}', 200);
  try {
    const { sec, btn } = gamingDoc();
    await runGamingFetch(btn, 'steam');           // id left empty
    assert.equal(net.calls.length, 0);
    assert.equal(gamingError(sec.id).code, 'MISSING_PARAM');
    assert.equal(btn.textContent, 'Fetch');
  } finally { net.restore(); dom.restore(); }
});

test('A: a button pointing at no section is a no-op, not a crash', async () => {
  const dom = stubDom();
  try {
    gamingDoc();
    await runGamingFetch({ dataset: { sec: '99' }, textContent: 'Fetch', disabled: false }, 'steam');
  } finally { dom.restore(); }
});

// ── the swallowed rejection, which is what made A invisible ─────────────────

test('A: a failed action is reported, in the console and on screen', () => {
  const dom = stubDom();
  const realError = console.error;
  const realTimeout = globalThis.setTimeout;      // showToast schedules its own removal
  const logged = [];
  console.error = (...args) => logged.push(args);
  globalThis.setTimeout = () => 0;                // safe: reportActionFailure never awaits
  try {
    reportActionFailure('fetch-steam', new ReferenceError('secAt is not defined'));
  } finally { console.error = realError; globalThis.setTimeout = realTimeout; dom.restore(); }
  assert.equal(logged.length, 1, 'the console said nothing');
  assert.match(String(logged[0][0]), /fetch-steam/);
  assert.equal(logged[0][1].message, 'secAt is not defined');
  assert.equal(dom.toasts.length, 1, 'nothing was shown to the person');
  assert.match(dom.toasts[0].textContent, /fetch-steam/);
});

test('A: the click listener still hands rejections to reportActionFailure', () => {
  // A source assertion, and it is worth being plain about what it does and does not prove.
  // It does not run the listener: that needs a real DOM. It proves only that the one call
  // site of `onAction` still attaches a catch, which is the exact line whose absence turned
  // a ReferenceError into a click that did nothing at all. Deleting it fails here.
  const src = readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
  const calls = [...src.matchAll(/(?<!function )onAction\(btn, e\)(.{0,60})/g)].map((m) => m[1]);
  assert.equal(calls.length, 1, 'onAction is called from somewhere new; give it a catch too');
  assert.match(calls[0], /\.catch\(/, 'onAction is called with no catch: a throw in any action would vanish');
});

test('A: secAt is at module scope, where runGamingFetch can see it', () => {
  // The scope bug itself, guarded at the source. `runGamingFetch` is not the only function
  // outside `onAction` that may want a section from a data-sec button.
  const src = readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
  assert.match(src, /^const secAt = /m, 'secAt is not declared at module scope');
});
