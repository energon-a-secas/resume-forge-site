// Gaming stats through the site's Cloudflare Worker (worker/src/index.js).
//
// This module has zero imports on purpose: it is the consumer half of the worker's
// error envelope, and tests/gaming.test.mjs imports it beside the worker in node with
// no DOM. Nothing here touches state.doc, and no fetch error is ever written to the
// model: errors live in the Map below, keyed by section id, so nothing about a failed
// fetch reaches localStorage, the YAML or an export (CONTRACTS.md C1 and C8).
//
// The worker is not redeployed in this wave, so the deployed one still answers a bare
// HTTP 500 with {"error":"Failed to fetch Steam stats"} and no `code`. That is exactly
// the case rule 2 below covers: an absent, unparseable or code-less body degrades to
// correct error text instead of to a crash.

const WORKER_URL = 'https://resumeforge-api.neorgon.workers.dev';
const TIMEOUT_MS = 15000;

/**
 * Every code this site knows how to show, with the words to use when the worker sends a
 * code but no message (an older deploy, or a truncated body). The worker's own `message`
 * and `hint` win whenever they are present: they are written to be shown verbatim.
 *
 * `HANDLED_CODES` is the keys of this table, and tests/gaming.test.mjs asserts it equals
 * the worker's exported ERROR_CODES. That test is the only thing that would notice the
 * worker and the site disagreeing about a code (CONTRACTS.md C11).
 */
const CODE_TEXT = {
  MISSING_PARAM: {
    message: 'No account name or ID was sent.',
    hint: 'Fill the field beside the button, or type the numbers in by hand below.',
  },
  BAD_ID: {
    message: 'That is not a 17 digit Steam ID.',
    hint: 'A profile URL under /profiles/ ends in the 17 digit ID.',
  },
  FORBIDDEN_ORIGIN: {
    message: 'The stats service refused this page.',
    hint: 'Type the numbers in by hand below.',
  },
  RETIRED: {
    message: 'These stats are retired and are typed in by hand now.',
    hint: 'Use the fields below.',
  },
  NOT_FOUND: {
    message: 'No account was found with that name or ID.',
    hint: 'Check what you typed, or type the numbers in by hand below.',
  },
  NOT_A_ROUTE: {
    message: 'The stats service has no route for that request.',
    hint: 'Type the numbers in by hand below.',
  },
  NOT_CONFIGURED: {
    message: 'This site has no API key for that service, so it cannot fetch anything.',
    hint: 'Type the numbers in by hand below.',
  },
  PRIVATE_PROFILE: {
    message: 'That profile keeps its game details private.',
    hint: 'Make the details public, or type the numbers in by hand below.',
  },
  UPSTREAM_BLOCKED: {
    message: 'The service is rate limiting this request.',
    hint: 'Try again in a few minutes, or type the numbers in by hand below.',
  },
  UPSTREAM_ERROR: {
    message: 'The stats service did not answer this request.',
    hint: 'Try again later, or type the numbers in by hand below.',
  },
  UPSTREAM_SHAPE: {
    message: 'The stats service answered with something this site could not read.',
    hint: 'Try again later, or type the numbers in by hand below.',
  },
};

/** The codes this site handles. Compared against the worker's ERROR_CODES by the tests. */
export const HANDLED_CODES = Object.freeze(Object.keys(CODE_TEXT));

/** Fetch errors, keyed by section id. Never on the model (CONTRACTS.md C8). */
const errors = new Map();

/** The error to show for a section, or null. `editor.js` renders it in a role="alert" line. */
export function gamingError(id) {
  return errors.get(id) || null;
}

/** Drop a section's error, for example once the person starts typing the numbers in. */
export function clearGamingError(id) {
  errors.delete(id);
}

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Consumer rule 2 (CONTRACTS.md C1), verbatim. Used when the body is absent, unparseable
 * or carries no `code`. The wording is fixed by the contract, so it stays here as one
 * literal rather than being assembled from the table above.
 */
const synthesised = (provider) => ({
  ok: false,
  code: 'UPSTREAM_ERROR',
  provider,
  message: 'The stats service did not answer in a shape this site understands.',
  hint: 'Type the numbers in by hand below.',
});

/**
 * Turn whatever came back into one shape the caller can trust. Pure, so the tests can
 * drive it with the bodies real deploys produce.
 *
 * - a success envelope gives `{ ok:true, provider, stats }`
 * - a legacy 200 carrying the bare stats object (the pre-wave-2 worker) is accepted as
 *   stats, because that deploy is still live and a success from it is still a success
 * - a body with a known or unknown `code` is passed through with the worker's own
 *   message and hint, which are written to be read by a person
 * - anything else synthesises UPSTREAM_ERROR
 */
export function parseEnvelope(body, provider) {
  if (!isObj(body)) return synthesised(provider);
  if (body.ok === true) {
    if (!isObj(body.stats)) return synthesised(provider);
    return { ok: true, provider: body.provider || provider, stats: body.stats };
  }
  const code = typeof body.code === 'string' ? body.code : '';
  if (!code) {
    // Legacy success: the old worker answered 200 with the bare stats object and no
    // `ok`. It has no `code` and no `error`, and it looks like stats.
    if (body.error === undefined && (typeof body.games === 'number' || typeof body.level === 'number')) {
      return { ok: true, provider, stats: body };
    }
    return synthesised(provider);
  }
  const fallback = CODE_TEXT[code] || CODE_TEXT.UPSTREAM_ERROR;
  return {
    ok: false,
    code,
    provider: body.provider || provider,
    message: typeof body.message === 'string' && body.message ? body.message : fallback.message,
    hint: typeof body.hint === 'string' ? body.hint : fallback.hint,
  };
}

/** One request, with the body read on every status including a non-OK one (C1 rule 1). */
async function request(url, provider) {
  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined,
    });
  } catch (err) {
    // Offline, DNS, a timeout, or a CORS rejection: there is no body to read at all.
    console.error(`${provider} fetch failed:`, err);
    return synthesised(provider);
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const env = parseEnvelope(body, provider);
  if (env.ok && !res.ok) return synthesised(provider);   // an error status may not claim success
  return env;
}

function record(sectionId, env) {
  if (!sectionId) return env;
  if (env.ok) errors.delete(sectionId);
  else errors.set(sectionId, { code: env.code, provider: env.provider, message: env.message, hint: env.hint });
  return env;
}

/**
 * A missing field is answered here, without a round trip: the worker would say the same
 * thing. The 17 digit ID rule is deliberately NOT duplicated here; the worker owns it,
 * so loosening it there does not need a matching edit on this side.
 */
const missing = (provider, what) => ({
  ok: false,
  code: 'MISSING_PARAM',
  provider,
  message: `No ${what} was entered.`,
  hint: 'Fill the field beside the button, or type the numbers in by hand below.',
});

export async function fetchPSNStats(username, sectionId) {
  const name = String(username || '').trim();
  if (!name) return record(sectionId, missing('psn', 'PSN username'));
  return record(sectionId, await request(`${WORKER_URL}/psn?username=${encodeURIComponent(name)}`, 'psn'));
}

export async function fetchSteamStats(steamId, sectionId) {
  const id = String(steamId || '').trim();
  if (!id) return record(sectionId, missing('steam', 'Steam ID'));
  return record(sectionId, await request(`${WORKER_URL}/steam?id=${encodeURIComponent(id)}`, 'steam'));
}
