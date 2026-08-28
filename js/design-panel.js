// The design controls, one HTML builder used by the editor's Design tab and
// the Catalog's Design tab. Chips and swatches carry data-act="design-set"
// with a path and a value; ranges/colours/text inputs carry data-design=path.
import { escHtml } from './utils.js';
import { PALETTES, FONT_PAIRS, TEMPLATES, BANNER_SHAPES, BANNER_PATTERNS, BANNER_HEIGHTS, PHOTO_SHAPES, PHOTO_SIZES,
  HEADING_STYLES, ENTRY_STYLES, ICON_STYLES, DENSITIES, SKILL_STYLES, LINK_STYLES, BULLETS, PAGES, resolveColors, resolveFonts } from './design.js';

const chip = (path, value, label, on, extraCls = '') =>
  `<button type="button" class="chip ${on ? 'on' : ''} ${extraCls}" data-act="design-set" data-path="${path}" data-value="${escHtml(value)}">${escHtml(label)}</button>`;

const chips = (path, values, cur, labelOf = (v) => v) =>
  `<div class="chips">${values.map((v) => chip(path, v, labelOf(v), v === cur)).join('')}</div>`;

const group = (label, inner, hint = '') => `<div class="ctl-group"><label class="ctl-label">${escHtml(label)}</label>${inner}${hint ? `<p class="panel-hint" style="margin:6px 0 0">${escHtml(hint)}</p>` : ''}</div>`;

// A labelled percent slider. The .range-row itself holds exactly the input and
// its readout, because events.js updates the first span it finds in the row.
const pctRow = (path, label, value, min, max) =>
  `<div class="field" style="margin-top:8px"><label>${escHtml(label)}</label>
    <div class="range-row"><input type="range" min="${min}" max="${max}" step="1" data-design="${path}" value="${value}" aria-label="${escHtml(label)}"><span>${value}%</span></div></div>`;

export function designControlsHtml(design, { rich = false } = {}) {
  const d = design;
  const colors = resolveColors(d);
  const fonts = resolveFonts(d.fonts);
  const out = [];

  out.push(group('Template', `<div class="chips tpl-chips">${Object.entries(TEMPLATES).map(([id, t]) => chip('design.template', id, t.label, d.template === id)).join('')}</div>`,
    rich ? TEMPLATES[d.template]?.desc : ''));

  out.push(group('Palette', `<div class="swatches">${Object.entries(PALETTES).map(([id, p]) =>
    `<button type="button" class="swatch ${d.palette === id ? 'on' : ''}" data-act="design-set" data-path="design.palette" data-value="${id}" title="${escHtml(p.label)}">
      <span class="swatch-chip"><i style="background:${p.band}"></i><i style="background:${p.accent}"></i><i style="background:${p.tile}"></i></span>
      <span class="swatch-name">${escHtml(p.label)}</span></button>`).join('')}</div>`));

  out.push(group('Colour overrides', `<div class="color-row">
      ${['band', 'bandText', 'accent', 'tile', 'heading', 'page'].map((k) => `<label>${k === 'bandText' ? 'band text' : k}<input type="color" data-design="design.colors.${k}" value="${colors[k]}"></label>`).join('')}
      <button type="button" class="btn btn-sm" data-act="design-colors-reset">Reset to palette</button>
    </div>`, 'Band is the side column and banner; tile is the icon squares.'));

  out.push(group('Fonts', `<div class="chips">${Object.entries(FONT_PAIRS).map(([id, p]) => chip('design.fonts', id, `${p.label}: ${p.heading} + ${p.body}`, fonts.pair === id, 'font-chip')).join('')}</div>
    <div class="grid-2" style="margin-top:8px">
      <div class="field"><label>Heading font (Google Fonts name)</label><input type="text" data-design="design.fonts.heading" value="${escHtml(fonts.heading)}" placeholder="Montserrat"></div>
      <div class="field"><label>Body font</label><input type="text" data-design="design.fonts.body" value="${escHtml(fonts.body)}" placeholder="DM Sans"></div>
    </div>
    <div class="range-row" style="margin-top:8px"><input type="range" min="0.85" max="1.15" step="0.05" data-design="design.fontScale" value="${d.fontScale || 1}" aria-label="Font scale"><span>${Math.round((d.fontScale || 1) * 100)}%</span></div>`));

  out.push(group('Density', chips('design.density', DENSITIES, d.density)));
  out.push(group('Paper', chips('design.page', Object.keys(PAGES), d.page, (v) => PAGES[v].label)));
  out.push(group('Section headings', chips('design.headings', HEADING_STYLES, d.headings)));
  out.push(group('Entries (experience, education, projects)', chips('design.entries', ENTRY_STYLES, d.entries)));
  out.push(group('Bullet glyph', chips('design.bullet', BULLETS, d.bullet)));
  out.push(group('Skills default style', chips('design.skills', SKILL_STYLES, d.skills)));
  out.push(group('Icon rows', chips('design.icons', ICON_STYLES, d.icons)));
  out.push(group('Header links (Basics > Links, beside the name)', chips('design.links', LINK_STYLES, d.links, (v) => ({ icons: 'icons only', text: 'text only', both: 'icon + text', none: 'hidden (use a side-column icon row instead)' })[v])));

  out.push(group('Photo', `${chips('design.photo.shape', PHOTO_SHAPES, d.photo.shape)}
    <div class="chips" style="margin-top:6px">${PHOTO_SIZES.map((v) => chip('design.photo.size', v, ({ sm: 'small', md: 'medium', lg: 'large' })[v], d.photo.size === v)).join('')}</div>
    <div class="color-row" style="margin-top:8px">
      <label><input type="checkbox" data-design="design.photo.ring" ${d.photo.ring ? 'checked' : ''}> ring</label>
      <label>ring colour <input type="color" data-design="design.photo.ringColor" value="${d.photo.ringColor || colors.page}"></label>
      <button type="button" class="btn btn-sm" data-act="design-set" data-path="design.photo.ringColor" data-value="">auto</button>
    </div>
    ${pctRow('design.photo.x', 'Focal point, left to right', d.photo.x, 0, 100)}
    ${pctRow('design.photo.y', 'Focal point, top to bottom', d.photo.y, 0, 100)}
    ${pctRow('design.photo.zoom', 'Zoom', d.photo.zoom, 100, 300)}`,
    'Framing crops the photo around the focal point. Move the point onto the face first, then zoom in.'));

  out.push(group('Banner (banner template)', `${chips('design.banner.shape', BANNER_SHAPES, d.banner.shape)}
    <div class="chips" style="margin-top:6px">${BANNER_HEIGHTS.map((v) => chip('design.banner.height', v, v, d.banner.height === v)).join('')}</div>
    <div class="chips" style="margin-top:6px">${BANNER_PATTERNS.map((v) => chip('design.banner.pattern', v, v === 'none' ? 'no pattern' : v, d.banner.pattern === v)).join('')}</div>
    <div class="photo-field" style="margin-top:8px">
      ${d.banner.image ? `<img class="photo-thumb is-wide" src="${escHtml(d.banner.image)}" alt="">` : '<span class="photo-thumb is-wide" aria-hidden="true"></span>'}
      <label class="btn btn-sm btn-file">Background image…<input type="file" data-file="banner" accept="image/*" hidden></label>
      ${d.banner.image ? '<button type="button" class="btn btn-sm" data-act="design-set" data-path="design.banner.image" data-value="">Remove</button>' : ''}
    </div>
    ${d.banner.image ? `<div class="range-row" style="margin-top:8px"><input type="range" min="0" max="90" step="5" data-design="design.banner.dim" value="${d.banner.dim}" aria-label="Darken image"><span>dim ${d.banner.dim}%</span></div>` : ''}`));

  out.push(group('Side column', `${chips('design.columns.side', ['left', 'right'], d.columns.side)}
    <div class="range-row" style="margin-top:8px"><input type="range" min="24" max="45" step="1" data-design="design.columns.width" value="${d.columns.width}" aria-label="Side column width"><span>${d.columns.width}%</span></div>`));

  return out.join('');
}
