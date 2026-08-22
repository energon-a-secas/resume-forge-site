// Icons for links, icon rows and contact lines. Three sources, one resolver:
//   1. brand slugs from the vendored Simple Icons set (js/brand-icons.js), inlined
//      as SVG paths so the palette can recolour them and the PDF needs no network;
//   2. generic stroke glyphs drawn here (mail, phone, pin, trophy, gamepad ...);
//   3. an image: an uploaded file as a data: URI (e.g. from freeicons.io), an
//      https URL, or `favicon`, which asks a favicon service for the link's host.
// Images always render through <img>, never inline, so an uploaded SVG cannot
// carry script into the page.

import { BRAND_ICONS } from './brand-icons.js';

const G = (t, svg) => ({ t, svg });
export const GLYPHS = {
  link:       G('Link',        '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  mail:       G('Email',       '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
  phone:      G('Phone',       '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  pin:        G('Location',    '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  globe:      G('Website',     '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  calendar:   G('Calendar',    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  user:       G('Person',      '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  badge:      G('ID badge',    '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7 18a5 5 0 0 1 10 0"/>'),
  briefcase:  G('Work',        '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/>'),
  graduation: G('Education',   '<path d="M2 9l10-4 10 4-10 4z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6"/>'),
  certificate:G('Certificate', '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M7 8h10M7 12h6"/><circle cx="17" cy="15" r="2.5"/><path d="M15.5 17l-.5 4 2-1 2 1-.5-4"/>'),
  trophy:     G('Trophy',      '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>'),
  medal:      G('Medal',       '<circle cx="12" cy="14" r="5"/><path d="M8.5 9.5L6 3h4l2 4 2-4h4l-2.5 6.5"/>'),
  star:       G('Star',        '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z"/>'),
  heart:      G('Heart',       '<path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z"/>'),
  sparkle:    G('Sparkle',     '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>'),
  check:      G('Check',       '<path d="M4 12l5 5L20 6"/>'),
  flag:       G('Flag',        '<path d="M5 21V4h11l-2 4 2 4H5"/>'),
  target:     G('Target',      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  lightbulb:  G('Idea',        '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3z"/>'),
  rocket:     G('Rocket',      '<path d="M12 3c3 2 5 6 5 10l-2 3h-6l-2-3c0-4 2-8 5-10z"/><path d="M7 13l-3 3 3 1M17 13l3 3-3 1M10 19v2M14 19v2"/><circle cx="12" cy="10" r="1.5"/>'),
  code:       G('Code',        '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>'),
  terminal:   G('Terminal',    '<path d="M4 17l6-5-6-5M12 19h8"/>'),
  cpu:        G('Hardware',    '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>'),
  cloud:      G('Cloud',       '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z"/>'),
  database:   G('Data',        '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'),
  shield:     G('Security',    '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'),
  cube:       G('Cube',        '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>'),
  pen:        G('Writing',     '<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/>'),
  book:       G('Book',        '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>'),
  language:   G('Languages',   '<path d="M3 5h10M8 3v2M10 5c-.5 4-3 7-6 9M6 8c1 3 3 5 6 6M13 21l4-10 4 10M14.5 17h5"/>'),
  chat:       G('Chat',        '<path d="M4 5h16v10H9l-5 4z"/>'),
  mic:        G('Microphone',  '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>'),
  headset:    G('Headset',     '<path d="M4 13a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/>'),
  music:      G('Music',       '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  camera:     G('Photography', '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  image:      G('Image',       '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 16l-5-5-9 8"/>'),
  film:       G('Film',        '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
  tv:         G('TV',          '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 21h8M12 18v3"/>'),
  gamepad:    G('Games',       '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v4M5 13h4M15 12h.01M18 14h.01"/>'),
  dice:       G('Tabletop',    '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="8.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="8.5" cy="15.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/>'),
  puzzle:     G('Puzzle',      '<path d="M10 3a2 2 0 0 1 2 2v1h4v4h1a2 2 0 1 1 0 4h-1v4h-4v1a2 2 0 1 1-4 0v-1H4v-4h1a2 2 0 1 0 0-4H4V6h4V5a2 2 0 0 1 2-2z"/>'),
  palette:    G('Art',         '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 2 2 0 0 1 1.3-3.3H17a4 4 0 0 0 4-4c0-4-4-7-9-7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>'),
  coffee:     G('Coffee',      '<path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2M6 3v2M10 3v2"/>'),
  utensils:   G('Food',        '<path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v5M9 3v5M17 3c-2 1-3 4-3 7h3v11"/>'),
  plane:      G('Travel',      '<path d="M2 14l8-2 4-8 2 1-2 7 7 2-1 2-7-1-3 6-2-1 1-6-6-1z"/>'),
  map:        G('Map',         '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  home:       G('Home',        '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  bike:       G('Cycling',     '<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-8h5l3 8M10 9h4l-2 8"/>'),
  dumbbell:   G('Fitness',     '<path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12"/>'),
  leaf:       G('Nature',      '<path d="M5 20c0-8 6-14 15-15-1 9-7 15-15 15z"/><path d="M5 20c3-4 6-7 10-10"/>'),
  sun:        G('Sun',         '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  paw:        G('Pets',        '<circle cx="8" cy="7" r="1.8"/><circle cx="16" cy="7" r="1.8"/><circle cx="4.5" cy="12" r="1.8"/><circle cx="19.5" cy="12" r="1.8"/><path d="M12 11c3 0 5.5 3 5.5 5.5a3 3 0 0 1-4 2.8 3.5 3.5 0 0 0-3 0 3 3 0 0 1-4-2.8C6.5 14 9 11 12 11z"/>'),
  smile:      G('Smile',       '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>'),
  gift:       G('Gift',        '<rect x="3" y="9" width="18" height="4"/><path d="M5 13v8h14v-8M12 9v12M12 9c-2-3-6-3-6-1s4 1 6 1M12 9c2-3 6-3 6-1s-4 1-6 1"/>'),
  clock:      G('Time',        '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
};

export const GLYPH_IDS = Object.keys(GLYPHS);
export const BRAND_IDS = Object.keys(BRAND_ICONS);

export const isBrand = (id) => Object.prototype.hasOwnProperty.call(BRAND_ICONS, id);
export const isGlyph = (id) => Object.prototype.hasOwnProperty.call(GLYPHS, id);
export const isImageSpec = (id) => /^(data:|https?:\/\/|favicon$)/i.test(id || '');

export function iconTitle(id) {
  if (isBrand(id)) return BRAND_ICONS[id].t;
  if (isGlyph(id)) return GLYPHS[id].t;
  if (id === 'favicon') return 'Favicon of the link';
  if (/^data:/i.test(id)) return 'Uploaded image';
  if (/^https?:/i.test(id)) return 'Image URL';
  return '';
}

// host -> brand slug. Matched on the exact host, then on a suffix so
// user.substack.com or someone.github.io still resolve.
export const HOST_MAP = {
  'github.com': 'github', 'github.io': 'github', 'gitlab.com': 'gitlab', 'bitbucket.org': 'bitbucket', 'gitea.com': 'gitea',
  'linkedin.com': 'linkedin', 'x.com': 'x', 'twitter.com': 'x', 'instagram.com': 'instagram', 'threads.net': 'threads',
  'youtube.com': 'youtube', 'youtu.be': 'youtube', 'medium.com': 'medium', 'substack.com': 'substack', 'dev.to': 'devdotto',
  'hashnode.com': 'hashnode', 'hashnode.dev': 'hashnode', 'wordpress.com': 'wordpress', 'tumblr.com': 'tumblr',
  'mastodon.social': 'mastodon', 'fosstodon.org': 'mastodon', 'hachyderm.io': 'mastodon', 'mstdn.social': 'mastodon',
  'bsky.app': 'bluesky', 'discord.gg': 'discord', 'discord.com': 'discord', 'twitch.tv': 'twitch', 'kick.com': 'twitch',
  'steamcommunity.com': 'steam', 'steampowered.com': 'steam', 'psnprofiles.com': 'playstation', 'playstation.com': 'playstation',
  'xbox.com': 'xbox', 'nintendo.com': 'nintendoswitch', 'epicgames.com': 'epicgames', 'battle.net': 'battledotnet', 'itch.io': 'itchdotio',
  'riotgames.com': 'riotgames', 'ubisoft.com': 'ubisoft', 'ea.com': 'ea', 'roblox.com': 'roblox', 'minecraft.net': 'minecraft',
  'behance.net': 'behance', 'dribbble.com': 'dribbble', 'artstation.com': 'artstation', 'deviantart.com': 'deviantart', 'figma.com': 'figma',
  'stackoverflow.com': 'stackoverflow', 'codepen.io': 'codepen', 'codewars.com': 'codewars', 'leetcode.com': 'leetcode',
  'hackerrank.com': 'hackerrank', 'exercism.org': 'exercism', 'hackthebox.com': 'hackthebox', 'tryhackme.com': 'tryhackme',
  'kaggle.com': 'kaggle', 'huggingface.co': 'huggingface', 'npmjs.com': 'npm', 'hub.docker.com': 'docker', 'n8n.io': 'n8n',
  'scholar.google.com': 'googlescholar', 'orcid.org': 'orcid', 'researchgate.net': 'researchgate',
  'credly.com': 'credly', 'coursera.org': 'coursera', 'udemy.com': 'udemy', 'edx.org': 'edx', 'pluralsight.com': 'pluralsight',
  'freecodecamp.org': 'freecodecamp', 'duolingo.com': 'duolingo',
  'letterboxd.com': 'letterboxd', 'goodreads.com': 'goodreads', 'myanimelist.net': 'myanimelist', 'strava.com': 'strava',
  'open.spotify.com': 'spotify', 'spotify.com': 'spotify', 'soundcloud.com': 'soundcloud', 'bandcamp.com': 'bandcamp',
  'vimeo.com': 'vimeo', 'flickr.com': 'flickr', 'pinterest.com': 'pinterest', 'tiktok.com': 'tiktok', 'reddit.com': 'reddit',
  'facebook.com': 'facebook', 'fb.com': 'facebook', 'linktr.ee': 'linktree', 'linktree.com': 'linktree',
  't.me': 'telegram', 'telegram.me': 'telegram', 'wa.me': 'whatsapp', 'whatsapp.com': 'whatsapp', 'signal.me': 'signal',
  'matrix.to': 'matrix', 'keybase.io': 'keybase', 'slack.com': 'slack', 'notion.so': 'notion', 'notion.site': 'notion', 'obsidian.md': 'obsidian',
  'buymeacoffee.com': 'buymeacoffee', 'patreon.com': 'patreon', 'ko-fi.com': 'kofi', 'paypal.me': 'paypal', 'paypal.com': 'paypal',
  'calendly.com': 'calendly', 'polywork.com': 'polywork', 'wellfound.com': 'wellfound', 'glassdoor.com': 'glassdoor',
  'indeed.com': 'indeed', 'upwork.com': 'upwork', 'fiverr.com': 'fiverr', 'apple.com': 'apple', 'proton.me': 'protonmail',
  'protonmail.com': 'protonmail', 'gmail.com': 'gmail', 'microsoft.com': 'microsoft', 'cloud.google.com': 'googlecloud',
  'aws.amazon.com': 'amazonwebservices', 'kubernetes.io': 'kubernetes',
};

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

/** Best icon id for a URL when none was chosen: brand by host, else a generic glyph. */
export function detectIcon(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^mailto:/i.test(u)) return 'mail';
  if (/^tel:/i.test(u)) return 'phone';
  const host = hostOf(u);
  if (!host) return 'link';
  if (HOST_MAP[host]) return HOST_MAP[host];
  const parts = host.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const suffix = parts.slice(i).join('.');
    if (HOST_MAP[suffix]) return HOST_MAP[suffix];
  }
  return 'link';
}

export function faviconUrl(url, size = 64) {
  const host = hostOf(url);
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}` : '';
}

/**
 * Resolve a link's icon field to something renderable.
 * @returns {{kind:'svg', svg:string, stroke:boolean, title:string}|{kind:'img', src:string, title:string}|null}
 */
export function resolveIcon(spec, url) {
  const id = String(spec || '').trim();
  if (id === 'favicon') {
    const src = faviconUrl(url);
    return src ? { kind: 'img', src, title: 'favicon' } : resolveIcon('', url);
  }
  if (/^(data:image\/|https?:\/\/)/i.test(id)) return { kind: 'img', src: id, title: 'icon' };
  const want = id || detectIcon(url);
  if (isBrand(want)) return { kind: 'svg', svg: `<path d="${BRAND_ICONS[want].d}"/>`, stroke: false, title: BRAND_ICONS[want].t };
  if (isGlyph(want)) return { kind: 'svg', svg: GLYPHS[want].svg, stroke: true, title: GLYPHS[want].t };
  if (want) return resolveIcon('link', '');
  return null;
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** HTML for an icon, sized by CSS (`.r-ico`). Returns '' when nothing resolves. */
export function iconHtml(spec, url, cls = '') {
  const r = resolveIcon(spec, url);
  if (!r) return '';
  const klass = `r-ico ${cls}`.trim();
  if (r.kind === 'img') {
    return `<img class="${klass} r-ico-img" src="${escAttr(r.src)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  }
  const style = r.stroke
    ? 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
    : 'fill="currentColor"';
  return `<svg class="${klass}" viewBox="0 0 24 24" ${style} aria-hidden="true" focusable="false">${r.svg}</svg>`;
}

/** Everything the picker can offer, brands first for a query that looks like one. */
export function searchIcons(query = '', limit = 60) {
  const q = query.trim().toLowerCase();
  const all = [
    ...GLYPH_IDS.map((id) => ({ id, title: GLYPHS[id].t, kind: 'glyph' })),
    ...BRAND_IDS.map((id) => ({ id, title: BRAND_ICONS[id].t, kind: 'brand' })),
  ];
  if (!q) return all.slice(0, limit);
  const score = (x) => {
    const t = x.title.toLowerCase();
    if (x.id === q || t === q) return 0;
    if (x.id.startsWith(q) || t.startsWith(q)) return 1;
    if (x.id.includes(q) || t.includes(q)) return 2;
    return 9;
  };
  return all.map((x) => [score(x), x]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0]).map(([, x]) => x).slice(0, limit);
}
