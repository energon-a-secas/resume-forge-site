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

import worker, { ERROR_CODES } from '../worker/src/index.js';
import { HANDLED_CODES, parseEnvelope } from '../js/gaming.js';

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
