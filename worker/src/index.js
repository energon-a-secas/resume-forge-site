// Cloudflare Worker for resume.neorgon.com: Steam stats, and an honest 410 for PSN.
//
// Wave 2 (2026-08-22) deleted both HTML scrapers. The reasons are on the record here
// so nobody "repairs" a regex that has nothing to parse:
//
//   psnprofiles.com  answers 403 to any non-browser client, from any IP (verified: it
//                    reproduces off Cloudflare Workers entirely, so this is not a
//                    Workers IP or Workers UA problem). No public Sony trophy API is
//                    known to us, and the PSN clients we are aware of authenticate with
//                    the user's own NPSSO session token, which is password equivalent
//                    and cannot be asked for. That second half is our understanding and
//                    not a citation. The measured 403 is on its own sufficient grounds
//                    to stop calling it, so /psn answers 410 RETIRED and makes no
//                    upstream request at all.
//
//   steamdb.info     answers 403 the same way, and its robots.txt (verified 2026-08-22)
//                    carries "Allow: /calculator/$", "Disallow: /calculator/" and
//                    "Disallow: /*?cc=*". The URL this worker used to fetch was
//                    https://steamdb.info/calculator/{id}/?cc=us; the Allow is an exact
//                    match rule, so that URL hit both Disallow lines. Deleting that
//                    scraper is a correctness fix and not only an availability one: do
//                    not restore it.
//
// Steam is now the official Web API, which needs a key:
//
//   wrangler secret put STEAM_API_KEY
//
// With no key, /steam answers 501 NOT_CONFIGURED before it fetches anything, because a
// key-less call to api.steampowered.com is refused (verified: 401 from GetOwnedGames)
// and that would be reported as an upstream fault when it is a configuration fact.
// Issuing a key is commonly reported to need a non-limited Steam account, which we could
// not verify; if that holds for this account, NOT_CONFIGURED is the permanent steady
// state and the site's manual entry is the feature rather than the fallback.
//
// Error envelope: every non-success response is JSON carrying ok/code/provider/message/
// hint, and no response from this worker is ever HTTP 500 (CONTRACTS.md C1).

const ALLOWED_ORIGINS = [
  'https://resume.neorgon.com',
  'http://localhost:8822',
  'http://127.0.0.1:8822',
];

/**
 * Every code this worker can put in an error envelope. `js/gaming.js` exports the codes
 * it handles and `tests/gaming.test.mjs` asserts the two sets are equal, which is the
 * only thing in the system that would notice the worker and the site drifting apart:
 * the worker deploys on its own schedule and `js/gaming.js` is its only reader
 * (CONTRACTS.md C11). Additive only: renaming one of these breaks that test on purpose.
 */
export const ERROR_CODES = [
  'MISSING_PARAM',
  'BAD_ID',
  'FORBIDDEN_ORIGIN',
  'RETIRED',
  'NOT_FOUND',
  'NOT_A_ROUTE',
  'NOT_CONFIGURED',
  'PRIVATE_PROFILE',
  'UPSTREAM_BLOCKED',
  'UPSTREAM_ERROR',
  'UPSTREAM_SHAPE',
];

/** The HTTP status each code rides on. 500 appears nowhere, by contract. */
const HTTP_FOR = {
  MISSING_PARAM: 400,
  BAD_ID: 400,
  FORBIDDEN_ORIGIN: 403,
  NOT_FOUND: 404,
  NOT_A_ROUTE: 404,
  RETIRED: 410,
  NOT_CONFIGURED: 501,
  PRIVATE_PROFILE: 502,
  UPSTREAM_BLOCKED: 502,
  UPSTREAM_ERROR: 502,
  UPSTREAM_SHAPE: 502,
};

const STEAM_API = 'https://api.steampowered.com';
const MANUAL = 'Type the numbers in by hand in the gaming section.';

function corsHeaders(origin) {
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

/**
 * The one error constructor. `provider` is 'psn' or 'steam' on the two real routes and
 * the empty string when the path names neither (NOT_A_ROUTE, or FORBIDDEN_ORIGIN on an
 * unknown path): the key is always present, which is what the consumer relies on.
 * Errors are never cached; a retry has to reach the worker.
 */
function fail(code, { provider = '', message, hint = '', origin = null, cors = true }) {
  const headers = { 'Cache-Control': 'no-store', ...(cors ? corsHeaders(origin) : {}) };
  return json({ ok: false, code, provider, message, hint }, HTTP_FOR[code] || 502, headers);
}

const shapeError = (provider) => ({
  code: 'UPSTREAM_SHAPE',
  message: 'Steam answered with something this worker could not read.',
  hint: `Try again later. ${MANUAL}`,
  provider,
});

/**
 * One call to the Steam Web API. Returns `{ body }` on success, or a ready-made error
 * with a C1 code. The status mapping is fixed by CONTRACTS.md amendment A2 and this
 * function is the only place that decides it:
 *
 *   401 or 403  -> UPSTREAM_ERROR, our key was refused. Both statuses occur for one bad
 *                  key (GetOwnedGames answers 401, GetRecentlyPlayedGames answers 403),
 *                  so the pair is handled together. Not UPSTREAM_BLOCKED: a refused key
 *                  is this site's fault, not Steam blocking the person.
 *   404         -> UPSTREAM_SHAPE. api.steampowered.com answers 404 only when the method
 *                  path is wrong, which is our bug and never the person's. An unknown
 *                  user does not 404, so this is deliberately not NOT_FOUND.
 *   429         -> UPSTREAM_BLOCKED
 *   other !ok   -> UPSTREAM_ERROR
 *   threw       -> UPSTREAM_ERROR
 *   200, no JSON-> UPSTREAM_SHAPE
 */
async function steamGet(path, params) {
  const url = new URL(STEAM_API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  let res;
  try {
    res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  } catch (err) {
    console.error('steam fetch threw:', err);
    return {
      code: 'UPSTREAM_ERROR',
      message: 'Steam could not be reached from this worker.',
      hint: `Try again in a few minutes. ${MANUAL}`,
    };
  }
  if (res.status === 401 || res.status === 403) {
    return {
      code: 'UPSTREAM_ERROR',
      message: 'Steam refused this site\'s API key.',
      hint: `The site owner needs to check STEAM_API_KEY. ${MANUAL}`,
    };
  }
  if (res.status === 404) return shapeError('steam');
  if (res.status === 429) {
    return {
      code: 'UPSTREAM_BLOCKED',
      message: 'Steam is rate limiting requests from this site.',
      hint: `Try again in a few minutes. ${MANUAL}`,
    };
  }
  if (!res.ok) {
    return {
      code: 'UPSTREAM_ERROR',
      message: `Steam answered ${res.status} to this request.`,
      hint: `Try again later. ${MANUAL}`,
    };
  }
  try {
    return { body: await res.json() };
  } catch {
    return shapeError('steam');
  }
}

/**
 * GetOwnedGames is reported to answer `{"response":{}}` both for a private library and
 * for an id that does not exist, so the two cannot be told apart from that call alone.
 * One extra call to GetPlayerSummaries decides it (amendment A2 maps `players: []` to
 * NOT_FOUND). It runs only on this error path, never on the happy path, and if it fails
 * we keep PRIVATE_PROFILE.
 *
 * UNVERIFIED, coded defensively (amendment A6.1): no Steam API key existed when this was
 * written, so neither the empty-response shape nor the empty-players shape was executed
 * against the real API. Both branches are written to degrade to a correct sentence
 * either way, and neither is claimed as a tested fact.
 */
async function emptyResponseReason(steamId, key) {
  const priv = {
    code: 'PRIVATE_PROFILE',
    message: 'That Steam profile keeps its game details private.',
    hint: `Set Game details to Public in Steam privacy settings, or type the numbers in by hand.`,
  };
  const r = await steamGet('/ISteamUser/GetPlayerSummaries/v2/', { key, steamids: steamId });
  if (r.code) return priv;
  const players = r.body && r.body.response && r.body.response.players;
  if (Array.isArray(players) && players.length === 0) {
    return {
      code: 'NOT_FOUND',
      message: 'Steam has no account with that ID.',
      hint: `Check the 17 digit ID. ${MANUAL}`,
    };
  }
  return priv;
}

/** Up to three recently played names. Best effort by amendment A1: a failure here is not
 *  worth failing the whole request, so it degrades to an empty list. */
async function recentGames(steamId, key) {
  const r = await steamGet('/IPlayerService/GetRecentlyPlayedGames/v1/', { key, steamid: steamId, count: 3 });
  if (r.code) return [];
  const games = r.body && r.body.response && r.body.response.games;
  if (!Array.isArray(games)) return [];
  return games.slice(0, 3).map((g) => ({ name: String((g && g.name) || '') })).filter((g) => g.name);
}

/**
 * The Steam half of the success envelope. Derivation frozen by amendment A1:
 *   games    = response.game_count from GetOwnedGames
 *   playtime = sum(response.games[].playtime_forever) / 60, whole hours. Valve publishes
 *              no total-playtime field, so the sum is ours.
 *   recent   = GetRecentlyPlayedGames names, sliced to 3, best effort.
 * `include_played_free_games=1` is this worker's choice, not part of the frozen
 * derivation: a played free game is still a played game. `include_appinfo` is not sent
 * because nothing here reads a game's name from this call.
 */
async function steamStats(steamId, key) {
  const owned = await steamGet('/IPlayerService/GetOwnedGames/v1/', {
    key,
    steamid: steamId,
    include_played_free_games: 1,
  });
  if (owned.code) return owned;
  const r = owned.body && typeof owned.body === 'object' ? owned.body.response : null;
  if (!r || typeof r !== 'object') return shapeError('steam');
  if (Object.keys(r).length === 0) return await emptyResponseReason(steamId, key);
  if (typeof r.game_count !== 'number') return shapeError('steam');
  const list = Array.isArray(r.games) ? r.games : [];
  const minutes = list.reduce((sum, g) => sum + (Number(g && g.playtime_forever) || 0), 0);
  return {
    stats: {
      games: r.game_count,
      playtime: Math.round(minutes / 60),
      recentGames: await recentGames(steamId, key),
    },
  };
}

/**
 * The router. Every path through it returns a C1 envelope or a C2 success. The default
 * export below wraps it, which is what makes "never 500" true even for a bug in here.
 */
const router = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const provider = path === '/psn' ? 'psn' : path === '/steam' ? 'steam' : '';

    // A preflight carries no body, so a rejected one is a bare 204 with no CORS headers.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // This body is JSON for curl and for the operator only. A browser sees a CORS
    // failure and never reads it, because a rejected origin gets no CORS headers by
    // design. Do not build UI for it (CONTRACTS.md C1).
    if (!allowed) {
      return fail('FORBIDDEN_ORIGIN', {
        provider,
        message: 'This API only answers requests from the Resume Forge site.',
        hint: 'Add the origin to ALLOWED_ORIGINS in worker/src/index.js if it belongs there.',
        cors: false,
      });
    }

    // PSN is retired, deliberately. No parameter is read and no upstream request is made:
    // MISSING_PARAM would imply that sending a username could make this work, and it
    // cannot. The message states the measured fact, not a claim about Sony's APIs.
    if (path === '/psn') {
      return fail('RETIRED', {
        provider: 'psn',
        message: 'PSN stats are retired: the source this site used now blocks automated requests.',
        hint: 'Type your level, games and trophy counts in by hand in the gaming section.',
        origin,
      });
    }

    if (path === '/steam') {
      const steamId = (url.searchParams.get('id') || '').trim();
      // The request is validated before the service is: a person who mistyped their ID
      // should read that, not a message about a key they do not own.
      if (!steamId) {
        return fail('MISSING_PARAM', {
          provider: 'steam',
          message: 'No Steam ID was sent.',
          hint: `Add ?id= with your 17 digit Steam ID. ${MANUAL}`,
          origin,
        });
      }
      if (!/^\d{17}$/.test(steamId)) {
        return fail('BAD_ID', {
          provider: 'steam',
          message: 'That is not a 17 digit Steam ID.',
          hint: 'A profile URL under /profiles/ ends in the 17 digit ID; a custom URL name has to be converted first.',
          origin,
        });
      }
      // Gate on the key before any fetch: a key-less call answers 400 upstream, which
      // would be reported as an upstream fault when it is a configuration fact.
      if (!env || !env.STEAM_API_KEY) {
        return fail('NOT_CONFIGURED', {
          provider: 'steam',
          message: 'This site has no Steam API key set, so it cannot ask Steam anything.',
          hint: 'Type your games and playtime in by hand in the gaming section.',
          origin,
        });
      }
      const r = await steamStats(steamId, env.STEAM_API_KEY);
      if (r.code) {
        return fail(r.code, { provider: 'steam', message: r.message, hint: r.hint, origin });
      }
      return json({ ok: true, provider: 'steam', stats: r.stats }, 200, {
        'Cache-Control': 'public, max-age=300',
        ...corsHeaders(origin),
      });
    }

    return fail('NOT_A_ROUTE', {
      provider,
      message: 'That path is not a route on this worker.',
      hint: 'The routes are /psn and /steam.',
      origin,
    });
  },
};

export default {
  /**
   * "No response from this worker is ever HTTP 500" (CONTRACTS.md C1) is a promise about
   * every response, including the ones a bug in this file produces. An uncaught throw in
   * a Workers fetch handler is answered by the runtime with a 500-class error page and no
   * CORS headers, and `js/gaming.js` would see it as an unreadable body. So the router is
   * wrapped and a thrown error becomes the same UPSTREAM_ERROR envelope as any other
   * failure. This catch existing is not a claim that it never fires: the log line is there
   * for the operator, and the person still gets a sentence and the manual fields.
   */
  async fetch(request, env) {
    try {
      return await router.fetch(request, env);
    } catch (err) {
      console.error('worker threw:', err);
      let origin = null;
      try { origin = request.headers.get('Origin'); } catch { origin = null; }
      return fail('UPSTREAM_ERROR', {
        provider: '',
        message: 'The stats service hit an error it did not expect.',
        hint: `Try again later. ${MANUAL}`,
        origin,
      });
    }
  },
};
