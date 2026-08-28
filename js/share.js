// Share links: the whole resume travels inside the URL fragment.
//
// Nothing is uploaded, and that is a property of the mechanism rather than a
// promise on a page. A fragment is not part of an HTTP request, so no server
// ever receives the payload. Two rules keep it true: this file never fetches
// and never moves the payload into a query string or a redirect, and view.html
// turns the fleet's analytics off, because a beacon carrying location.href
// would hand the document to a third party through the back door.
//
// Four primitives (toBase64Url, fromBase64Url, gzip, gunzip) are copied verbatim
// from projects/character-sheet-site/js/share/link.js:36-58, which is where they
// were proven. Nothing else from that file is reused: the rest of it encodes
// that game's own state.
//
// The payload is the canonical JSON tree, the same one toPlain() builds for the
// JSON export, gzipped and base64url'd. JSON rather than the YAML text:
// measured over the six library examples the two compress to within 4% of each
// other, and JSON lets view.html skip the js-yaml script and ship a tighter CSP.
//
// This module imports nothing. It takes a plain tree and returns strings, so it
// runs identically in the browser, in node and in a test.

/** Safari stops working on URLs past roughly this length. Chrome and Firefox take far more. */
export const MAX_LINK = 80000;

/** Where we refuse. The gap under MAX_LINK absorbs a long host name or a mail client's own wrapping. */
export const SAFE_LINK = 78000;

/* ── primitives, from character-sheet-site/js/share/link.js:36-58 ── */

function toBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function gzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/* ── payload rules, ours ── */

/**
 * The three places a resume carries an image, in the order a person would name
 * them. Everything else in the tree is text and costs tens of bytes.
 */
export function countImages(tree) {
  const r = tree?.resume || {};
  let n = 0;
  if (r.basics?.photo) n++;
  if (r.design?.banner?.image) n++;
  for (const s of r.sections || []) if (s.image) n++;
  return n;
}

/**
 * A copy of the tree with every image removed.
 *
 * Not a size optimisation: it is the difference between a link that works and
 * one that does not. A single 54 KB photo makes the link 72,019 characters
 * against Safari's ceiling of about 80,000, so images are opt-in and the opt-in
 * shows the number it produced.
 *
 * `banner.dim` goes with `banner.image`: it only ever dims that image, so
 * leaving it behind would describe something no longer in the document.
 */
export function stripImages(tree) {
  const out = structuredClone(tree);
  const r = out?.resume;
  if (!r) return out;
  if (r.basics) delete r.basics.photo;
  if (r.design?.banner) { delete r.design.banner.image; delete r.design.banner.dim; }
  for (const s of r.sections || []) delete s.image;
  return out;
}

/** Tree to fragment payload. */
export async function encodeShare(tree) {
  const raw = new TextEncoder().encode(JSON.stringify(tree));
  return toBase64Url(await gzip(raw));
}

/** Fragment payload back to a tree. Throws on anything malformed; the caller says so out loud. */
export async function decodeShare(payload) {
  const bytes = await gunzip(fromBase64Url(String(payload || '')));
  const tree = JSON.parse(new TextDecoder().decode(bytes));
  if (!tree || typeof tree !== 'object') throw new Error('the link does not hold a resume');
  return tree;
}

/** The viewer URL for a payload, absolute, from wherever the caller is served. */
export function shareUrl(payload, base) {
  const origin = base || `${location.origin}${location.pathname.replace(/[^/]*$/, '')}`;
  return `${origin}view.html#s=${payload}`;
}

/**
 * Build the link and measure it before anyone can send it.
 *
 * @returns {{url:string, length:number, images:number, dropped:number, tooLong:boolean}}
 *   `length` is the whole URL, because that is what a browser limits.
 */
export async function buildShareLink(tree, { images = false, base } = {}) {
  const total = countImages(tree);
  const payloadTree = images ? tree : stripImages(tree);
  const url = shareUrl(await encodeShare(payloadTree), base);
  return {
    url,
    length: url.length,
    images: images ? total : 0,
    dropped: images ? 0 : total,
    tooLong: url.length > SAFE_LINK,
  };
}

/** The payload in a location hash, or null. Accepts a full URL or a bare hash. */
export function payloadFromUrl(input) {
  const m = String(input || '').match(/[#&]s=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
