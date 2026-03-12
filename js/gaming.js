import { showToast } from './utils.js';

const WORKER_URL = 'https://resumeforge-api.neorgon.workers.dev';

// Fetch PSN stats
export async function fetchPSNStats(username) {
  if (!username) {
    showToast('Please enter a PSN username');
    return null;
  }

  try {
    showToast('Fetching PSN stats...');
    const res = await fetch(`${WORKER_URL}/psn?username=${encodeURIComponent(username)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    showToast('PSN stats loaded!');
    return data;
  } catch (err) {
    console.error('Failed to fetch PSN stats:', err);
    showToast('Failed to fetch PSN stats. Check username or try again.');
    return null;
  }
}

// Fetch Steam stats
export async function fetchSteamStats(steamId) {
  if (!steamId) {
    showToast('Please enter a Steam ID');
    return null;
  }

  try {
    showToast('Fetching Steam stats...');
    const res = await fetch(`${WORKER_URL}/steam?id=${encodeURIComponent(steamId)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    showToast('Steam stats loaded!');
    return data;
  } catch (err) {
    console.error('Failed to fetch Steam stats:', err);
    showToast('Failed to fetch Steam stats. Check Steam ID or try again.');
    return null;
  }
}

// Render PSN stats display
export function renderPSNStats(stats) {
  const container = document.getElementById('psnStats');
  if (!stats) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  container.innerHTML = `
    <h4>PSN Stats</h4>
    <p><strong>Level:</strong> ${stats.level || 0}</p>
    <p><strong>Total Games:</strong> ${stats.games || 0}</p>
    <p><strong>Trophies:</strong> 🥇 ${stats.trophies?.platinum || 0} | 🥈 ${stats.trophies?.gold || 0} | 🥉 ${stats.trophies?.silver || 0} | 🏅 ${stats.trophies?.bronze || 0}</p>
  `;
  container.classList.remove('hidden');
}

// Render Steam stats display
export function renderSteamStats(stats) {
  const container = document.getElementById('steamStats');
  if (!stats) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  const recentGames = stats.recentGames?.slice(0, 3).map(g => g.name).join(', ') || 'None';
  container.innerHTML = `
    <h4>Steam Stats</h4>
    <p><strong>Total Games:</strong> ${stats.games || 0}</p>
    <p><strong>Total Playtime:</strong> ${stats.playtime ? `${Math.round(stats.playtime)} hrs` : 'N/A'}</p>
    <p><strong>Recent:</strong> ${recentGames}</p>
  `;
  container.classList.remove('hidden');
}
