// Cloudflare Worker for PSN/Steam scraping proxy

const ALLOWED_ORIGINS = [
  'https://resume.neorgon.com',
  'http://localhost:8822',
  'http://127.0.0.1:8822',
];

// CORS headers
function corsHeaders(origin) {
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Handle OPTIONS request
function handleOptions(request) {
  const origin = request.headers.get('Origin');
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// Scrape PSN Profile stats
async function scrapePSNProfile(username) {
  try {
    const url = `https://psnprofiles.com/${username}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Parse trophy counts
    const platinumMatch = html.match(/<li class="platinum">\s*(\d+)/);
    const goldMatch = html.match(/<li class="gold">\s*(\d+)/);
    const silverMatch = html.match(/<li class="silver">\s*(\d+)/);
    const bronzeMatch = html.match(/<li class="bronze">\s*(\d+)/);

    // Parse level
    const levelMatch = html.match(/Level\s+(\d+)/);

    // Parse total games (approximate from trophy list)
    const gamesMatch = html.match(/(\d+)\s+Games Played/i);

    return {
      trophies: {
        platinum: platinumMatch ? parseInt(platinumMatch[1], 10) : 0,
        gold: goldMatch ? parseInt(goldMatch[1], 10) : 0,
        silver: silverMatch ? parseInt(silverMatch[1], 10) : 0,
        bronze: bronzeMatch ? parseInt(bronzeMatch[1], 10) : 0,
      },
      level: levelMatch ? parseInt(levelMatch[1], 10) : 0,
      games: gamesMatch ? parseInt(gamesMatch[1], 10) : 0,
    };
  } catch (err) {
    console.error('PSN scraping failed:', err);
    throw new Error('Failed to fetch PSN profile');
  }
}

// Scrape Steam stats (simplified - using SteamDB Calculator or public profile)
async function scrapeSteamStats(steamId) {
  try {
    // Try SteamDB Calculator first
    const url = `https://steamdb.info/calculator/${steamId}/?cc=us`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Parse total games
    const gamesMatch = html.match(/(\d+)\s+games/i);

    // Parse total playtime (hours)
    const playtimeMatch = html.match(/([\d,]+)\s+hours/i);

    // Recent games (harder to parse, simplified)
    const recentGames = [];

    return {
      games: gamesMatch ? parseInt(gamesMatch[1].replace(/,/g, ''), 10) : 0,
      playtime: playtimeMatch ? parseInt(playtimeMatch[1].replace(/,/g, ''), 10) : 0,
      recentGames,
    };
  } catch (err) {
    console.error('Steam scraping failed:', err);
    throw new Error('Failed to fetch Steam stats');
  }
}

// Main handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // Handle OPTIONS
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Check origin
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    // PSN endpoint
    if (url.pathname === '/psn') {
      const username = url.searchParams.get('username');
      if (!username) {
        return new Response('Missing username parameter', { status: 400 });
      }

      try {
        const stats = await scrapePSNProfile(username);
        return new Response(JSON.stringify(stats), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300', // 5-minute cache
            ...corsHeaders(origin),
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
          },
        });
      }
    }

    // Steam endpoint
    if (url.pathname === '/steam') {
      const steamId = url.searchParams.get('id');
      if (!steamId) {
        return new Response('Missing id parameter', { status: 400 });
      }

      try {
        const stats = await scrapeSteamStats(steamId);
        return new Response(JSON.stringify(stats), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300', // 5-minute cache
            ...corsHeaders(origin),
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin),
          },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
