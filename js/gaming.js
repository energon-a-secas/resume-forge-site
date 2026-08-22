// PSN and Steam stats through the site's Cloudflare Worker (worker/src/index.js).
// The stats are cached inside the gaming section's data so the PDF never waits
// on the network.
import { showToast } from './utils.js';

const WORKER_URL = 'https://resumeforge-api.neorgon.workers.dev';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPSNStats(username) {
  if (!username) { showToast('Enter a PSN username first'); return null; }
  try {
    showToast('Fetching PSN stats…');
    const data = await fetchJson(`${WORKER_URL}/psn?username=${encodeURIComponent(username)}`);
    showToast('PSN stats loaded');
    return data;
  } catch (err) {
    console.error('PSN fetch failed:', err);
    showToast('Could not fetch PSN stats. Check the username or try later.');
    return null;
  }
}

export async function fetchSteamStats(steamId) {
  if (!steamId) { showToast('Enter a Steam ID first'); return null; }
  try {
    showToast('Fetching Steam stats…');
    const data = await fetchJson(`${WORKER_URL}/steam?id=${encodeURIComponent(steamId)}`);
    showToast('Steam stats loaded');
    return data;
  } catch (err) {
    console.error('Steam fetch failed:', err);
    showToast('Could not fetch Steam stats. Check the ID or try later.');
    return null;
  }
}
