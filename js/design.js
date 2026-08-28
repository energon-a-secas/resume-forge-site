// Design registry: every knob the `design:` block of a resume can turn.
// Pure data. The renderer reads it, the Catalog and the Design tab draw it,
// and the YAML schema in template.yaml documents it. Add a palette or a font
// pairing here and every surface picks it up; there is no second list.
//
// Palette names are colours, never brands or clients (see the slides-site
// rule): the name travels inside every exported YAML.

export const PALETTES = {
  navy:     { label: 'Navy',     band: '#0b1730', bandText: '#ffffff', accent: '#12307a', tile: '#748aa1', heading: '#0f2a6b', text: '#1f2937', muted: '#5b6777', rule: '#d7dde5', page: '#ffffff', card: '#eef2f7' },
  slate:    { label: 'Slate',    band: '#1e293b', bandText: '#f8fafc', accent: '#334155', tile: '#94a3b8', heading: '#1e293b', text: '#1e293b', muted: '#64748b', rule: '#e2e8f0', page: '#ffffff', card: '#f1f5f9' },
  graphite: { label: 'Graphite', band: '#1c1c1e', bandText: '#f5f5f5', accent: '#2b2b2e', tile: '#7a7a80', heading: '#1c1c1e', text: '#222222', muted: '#6b6b70', rule: '#e3e3e6', page: '#ffffff', card: '#f2f2f4' },
  ink:      { label: 'Ink',      band: '#111827', bandText: '#f9fafb', accent: '#111827', tile: '#9ca3af', heading: '#111827', text: '#111827', muted: '#6b7280', rule: '#e5e7eb', page: '#ffffff', card: '#f3f4f6' },
  ocean:    { label: 'Ocean',    band: '#0b2545', bandText: '#f5f9ff', accent: '#0a66c2', tile: '#6b9bd2', heading: '#0a4a8f', text: '#1f2937', muted: '#5b6777', rule: '#d8e2ee', page: '#ffffff', card: '#edf3fa' },
  teal:     { label: 'Teal',     band: '#0d3b44', bandText: '#f0fbfc', accent: '#0e7490', tile: '#5fa8b5', heading: '#0e7490', text: '#1e2a2e', muted: '#5a6d73', rule: '#d6e6ea', page: '#ffffff', card: '#ecf5f7' },
  forest:   { label: 'Forest',   band: '#13312a', bandText: '#f2f7f4', accent: '#1f6f55', tile: '#6f9e8c', heading: '#1f6f55', text: '#1f2d28', muted: '#5d6f67', rule: '#d9e5df', page: '#ffffff', card: '#eef5f1' },
  burgundy: { label: 'Burgundy', band: '#3b0f1f', bandText: '#fdf2f5', accent: '#8a1c3c', tile: '#b0717f', heading: '#8a1c3c', text: '#2a1e22', muted: '#6f5b61', rule: '#ebd9de', page: '#ffffff', card: '#f8eef1' },
  violet:   { label: 'Violet',   band: '#2a1b4d', bandText: '#f6f2ff', accent: '#6d28d9', tile: '#a78bfa', heading: '#5b21b6', text: '#241b33', muted: '#6b6380', rule: '#e5def5', page: '#ffffff', card: '#f3eefc' },
  amber:    { label: 'Amber',    band: '#3a2a0a', bandText: '#fff8ea', accent: '#b45309', tile: '#d6a24a', heading: '#92400e', text: '#2b2417', muted: '#70634d', rule: '#ece3d1', page: '#ffffff', card: '#faf3e6' },
  rose:     { label: 'Rose',     band: '#4a1036', bandText: '#fff1f7', accent: '#be185d', tile: '#e58ab3', heading: '#9d174d', text: '#2b1a24', muted: '#6e5a65', rule: '#f0dbe6', page: '#ffffff', card: '#fbeff5' },
  sand:     { label: 'Sand',     band: '#efe6d6', bandText: '#2b2419', accent: '#8a5a2b', tile: '#c6a06e', heading: '#6b4520', text: '#2b2419', muted: '#7a6a55', rule: '#e6dccb', page: '#fffdf9', card: '#f6efe3' },
  mist:     { label: 'Mist',     band: '#e7edf4', bandText: '#1e293b', accent: '#2563eb', tile: '#94a3b8', heading: '#1e3a8a', text: '#1e293b', muted: '#64748b', rule: '#dbe3ec', page: '#ffffff', card: '#f1f5f9' },
};

// Google Fonts pairings. `hw`/`bw` are the weights each family actually
// ships: the css2 endpoint rejects the whole request when one weight is
// missing, so a wrong list here breaks every font on the page, not one.
export const FONT_PAIRS = {
  modern:    { label: 'Modern',    heading: 'Montserrat',       body: 'DM Sans',           hw: [700, 800], bw: [400, 500, 700] },
  clean:     { label: 'Clean',     heading: 'Inter',            body: 'Inter',             hw: [700, 800], bw: [400, 500, 600, 700] },
  classic:   { label: 'Classic',   heading: 'Playfair Display', body: 'Source Sans 3',     hw: [600, 700], bw: [400, 600, 700] },
  humanist:  { label: 'Humanist',  heading: 'Poppins',          body: 'Lato',              hw: [600, 700], bw: [400, 700] },
  serif:     { label: 'Serif',     heading: 'Lora',             body: 'Merriweather Sans', hw: [600, 700], bw: [400, 700] },
  grotesk:   { label: 'Grotesk',   heading: 'Space Grotesk',    body: 'IBM Plex Sans',     hw: [600, 700], bw: [400, 500, 600] },
  editorial: { label: 'Editorial', heading: 'Bebas Neue',       body: 'Roboto',            hw: [400],      bw: [400, 500, 700] },
  mono:      { label: 'Mono',      heading: 'IBM Plex Mono',    body: 'IBM Plex Sans',     hw: [600, 700], bw: [400, 500, 600] },
  arcade:    { label: 'Arcade',    heading: 'Press Start 2P',   body: 'Inter',             hw: [400],      bw: [400, 600, 700] },
  marker:    { label: 'Marker',    heading: 'Permanent Marker', body: 'Inter',             hw: [400],      bw: [400, 600, 700] },
};

const SYSTEM_FONTS = new Set(['Avenir Next', 'Helvetica', 'Arial', 'Georgia', 'Times New Roman', 'system-ui']);

/** Resolve `design.fonts` (a pairing id or {heading, body}) to families + weights. */
export function resolveFonts(fonts) {
  if (typeof fonts === 'string' && FONT_PAIRS[fonts]) return { pair: fonts, ...FONT_PAIRS[fonts] };
  if (fonts && typeof fonts === 'object' && (fonts.heading || fonts.body)) {
    const heading = fonts.heading || FONT_PAIRS.modern.heading;
    const body = fonts.body || FONT_PAIRS.modern.body;
    const known = Object.values(FONT_PAIRS);
    const hw = (known.find((p) => p.heading === heading) || {}).hw || [400, 700];
    const bw = (known.find((p) => p.body === body) || {}).bw || [400, 700];
    return { pair: '', heading, body, hw, bw };
  }
  return { pair: 'modern', ...FONT_PAIRS.modern };
}

/** Google Fonts css2 URL for the families a design needs, or '' for system fonts only. */
export function googleFontsUrl(fonts) {
  const f = resolveFonts(fonts);
  const fams = new Map();
  if (!SYSTEM_FONTS.has(f.heading)) fams.set(f.heading, new Set(f.hw));
  if (!SYSTEM_FONTS.has(f.body)) {
    const w = fams.get(f.body) || new Set();
    f.bw.forEach((x) => w.add(x));
    fams.set(f.body, w);
  }
  if (!fams.size) return '';
  const parts = [...fams].map(([fam, w]) => `family=${fam.replace(/\s+/g, '+')}:wght@${[...w].sort((a, b) => a - b).join(';')}`);
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;
}

export const TEMPLATES = {
  banner:  { label: 'Banner',  aside: true,  desc: 'Full-width band with the name and photo, then a coloured column beside the main content. Pattern or photo behind the band.' },
  sidebar: { label: 'Sidebar', aside: true,  desc: 'A coloured column down one side holds the photo, contact and aside sections; the main column carries the rest.' },
  split:   { label: 'Split',   aside: true,  desc: 'Light header with the photo beside the name, a thin accent rule, then two quiet columns. No band.' },
  classic: { label: 'Classic', aside: false, desc: 'One column, centred name, rules between sections. The plainest and the most parser-friendly.' },
  stripe:  { label: 'Stripe',  aside: true,  desc: 'An accent stripe down the page edge, caps headings, and a narrow secondary column.' },
  cards:   { label: 'Cards',   aside: true,  desc: 'Every section in a soft card on a tinted page, with a rounded band for the header.' },
};

export const BANNER_SHAPES  = ['flat', 'slant', 'curve', 'rounded', 'none'];
export const BANNER_PATTERNS = ['none', 'dots', 'grid', 'diagonal', 'blueprint'];
export const BANNER_HEIGHTS = ['short', 'normal', 'tall'];
export const PHOTO_SHAPES   = ['circle', 'rounded', 'square', 'squircle', 'hex', 'none'];
export const PHOTO_SIZES    = ['sm', 'md', 'lg'];
export const HEADING_STYLES = ['pill', 'bar', 'rule', 'caps', 'plain'];
export const ENTRY_STYLES   = ['plain', 'timeline', 'cards'];
export const ICON_STYLES    = ['tiles', 'circles', 'outline', 'plain'];
export const DENSITIES      = ['compact', 'normal', 'relaxed'];
export const SKILL_STYLES   = ['tags', 'bars', 'dots', 'hearts', 'list', 'grid'];
export const LINK_STYLES    = ['icons', 'text', 'both', 'none'];
export const BULLETS        = ['✦', '•', '▸', '◆', '→', '✓', '-'];
export const PAGES = {
  A4:     { label: 'A4',        w: 210,   h: 297 },
  Letter: { label: 'US Letter', w: 215.9, h: 279.4 },
};

export function defaultDesign() {
  return {
    template: 'banner',
    palette: 'navy',
    colors: {},
    fonts: 'modern',
    fontScale: 1,
    density: 'normal',
    page: 'A4',
    headings: 'pill',
    entries: 'plain',
    bullet: '✦',
    skills: 'tags',
    links: 'icons',
    icons: 'tiles',
    // x, y and zoom are integer percentages: the focal point the photo is
    // cropped around, and how far it is scaled up. Integers keep the design
    // panel's plain "%" slider label correct without a special case.
    photo: { shape: 'circle', size: 'md', ring: true, ringColor: '', x: 50, y: 50, zoom: 100 },
    banner: { shape: 'flat', height: 'normal', image: '', dim: 45, pattern: 'none' },
    columns: { side: 'left', width: 34 },
  };
}

/** Final colour tokens for a design: palette, then explicit overrides. */
export function resolveColors(design) {
  const base = PALETTES[design.palette] || PALETTES.navy;
  const out = { ...base };
  delete out.label;
  for (const [k, v] of Object.entries(design.colors || {})) {
    if (k in base && typeof v === 'string' && v) out[k] = v;
  }
  return out;
}
