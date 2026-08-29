# CLAUDE.md: Resume Forge

Resume Forge: CV builder, YAML in, PDF out (resume.neorgon.com)

**Live:** resume.neorgon.com · **Port:** 8822

## Run

```bash
make serve          # http://localhost:8822 (ES modules need HTTP, file:// blocks them)
npm install         # once, for the node tests and validate.mjs (js-yaml)
npm test            # node --test tests/*.test.mjs
node validate.mjs library            # lint every example; exit 1 on warnings
node validate.mjs --print md x.yaml  # convert (yaml | json | jsonresume | md)
node tools/build-icons.mjs           # regenerate js/brand-icons.js from assets/icons/brands/
make worker                          # cd worker && wrangler dev
cd worker && wrangler secret put STEAM_API_KEY   # the one secret; not set today
```

## What it is

One data model (`resume:` root, see `template.yaml`) rendered through templates. The editor,
the YAML panel and the Catalog all mutate the same `state.doc`; every change re-renders the
sheet from scratch with `renderResume()`. PDF is the browser's print pipeline over a clone of
the sheet in `#print-root`, never a canvas screenshot.

Two pages: `index.html` is the builder, and `view.html` renders a resume that arrived in a
share link and nothing else. The viewer never reads or writes the visitor's saved resumes.

## Architecture

| Module | Lines | Owns |
|---|---:|---|
| `js/app.js` | 49 | entry: load, wire, first-run example, the share handoff prompt |
| `js/state.js` | 144 | `state`, `bus`, persistence (current doc, saved library, prefs), v1 migration call |
| `js/schema.js` | 593 | `SECTION_TYPES` registry, `normalizeResume`, `lintResume`, `migrateV1`, `newSection`, `blankItem` |
| `js/i18n.js` | 133 | `LANGS`, `SECTION_TITLES`, `PRESENT`, `resolveLang`, `sectionTitle`, `pack`. Every word the sheet prints in a language other than English |
| `js/design.js` | 131 | `PALETTES`, `FONT_PAIRS`, `TEMPLATES`, shape lists, `resolveColors`, `googleFontsUrl` |
| `js/render.js` | 385 | `renderResume` (pure HTML), `renderSection`, `sheetStyle`, `pageCss`, `mountSheet` |
| `js/serialize.js` | 305 | YAML/JSON canonical tree, JSON Resume in/out, date helpers |
| `js/markdown.js` | 329 | Markdown (llms.txt style) out and in, heading markers |
| `js/linkedin.js` | 184 | CSV parser, LinkedIn export mapper (`importLinkedIn`) |
| `js/icons.js` | 198 | glyphs, brand lookup, host detection, `iconHtml`, `searchIcons` |
| `js/brand-icons.js` | 106 | GENERATED from assets/icons/brands by tools/build-icons.mjs |
| `js/editor.js` | 266 | schema-driven Content tab, Design tab host, `iconField`, the gaming block |
| `js/design-panel.js` | 83 | `designControlsHtml` (shared by Design tab and Catalog) |
| `js/catalog.js` | 205 | Catalog overlay: templates, examples, section types, design, `inert` + focus trap |
| `js/preview.js` | 83 | mount + scale the sheet, page guides, lint list |
| `js/export.js` | 206 | `exportAs` (pdf/yaml/json/jsonresume/md/html/link), `importFiles`, `importText`, the share dialog |
| `js/share.js` | 171 | share payload (gzip + base64url), image stripping, length limits, the sessionStorage handoff |
| `js/view.js` | 98 | `view.html` only: decode the fragment, render, print, "Make it yours" |
| `js/events.js` | 723 | all listeners: data-act routing, inputs, dialogs, keys, drag and drop |
| `js/a11y.js` | 353 | the reorder live region, keyboard reordering, runtime decoration of the drag handles |
| `js/fonts.js` | 26 | Google Fonts link for the sheet |
| `js/assets.js` | 48 | image resize to data: URIs |
| `js/gaming.js` | 194 | the worker's error envelope, read: `parseEnvelope`, `HANDLED_CODES`, the per-section error map |
| `js/utils.js` | 70 | `escHtml`, `showToast`, `debounce`, `downloadText`, `getPath`/`setPath` |
| `worker/src/index.js` | 366 | the worker itself: `/steam` on the Steam Web API, `/psn` retired, the JSON error envelope |

Vendored from `packages/neorgon-ui/`: never edit in place, run the sync script instead:
`js/neorgon-footer.js`, `js/neorgon-header.js`, `js/neorgon-persist.js`, `css/neorgon-*.css`.

`css/resume.css` is the sheet and must stay self-contained (no app tokens, no `@font-face`):
the standalone HTML export inlines it verbatim. `css/style.css` is the app chrome.

## Data

- `localStorage['resume-forge-v2:current']` (working copy + docId), `resume-forge-v2:library`
  (named saves), `resume-forge-v2:ui` (tab, zoom, guides, open sections). All through the
  Persist Kit (`createStore`), so a full quota degrades to a toast, not a crash.
- `resume-forge-v1` (the canvas-era key) is migrated on first load by `schema.js → migrateV1`
  and left in place.
- `sessionStorage['resume-forge-v2:handoff']`: how `view.html` hands a shared resume to the
  builder. Written by `putHandoff`, read once and deleted by `takeHandoff`. Same origin, same
  tab, and the builder URL it navigates to carries no fragment.
- `library/*.yaml` + `library/index.json`: the example resumes the Catalog lists. Real files,
  also the fixtures the tests round-trip.
- `worker/`: the Cloudflare Worker behind the gaming section. One secret, `STEAM_API_KEY`, set
  with `wrangler secret put STEAM_API_KEY` and never written into the repo. See "Gaming" below
  for what is deployed and what is not.

## Gaming

Both HTML scrapers were deleted in wave 2 and the reasons are recorded at the top of
`worker/src/index.js`. Do not restore either one.

- `/psn` answers **410 RETIRED** and makes no upstream request. psnprofiles.com answers 403 to
  any non-browser client, and the PSN clients we know of authenticate with the person's own
  NPSSO session token, which is password equivalent and cannot be asked for.
- `/steam` is the official Steam Web API (`api.steampowered.com`), gated on the secret: with no
  `STEAM_API_KEY` binding it answers **501 NOT_CONFIGURED before it fetches anything**, because
  a key-less call is refused upstream and that would be reported as an outage when it is a
  configuration fact.
- Every non-success response is a JSON envelope with `ok`, `code`, `provider`, `message` and
  `hint`, and no response is ever HTTP 500: the default export wraps the router in a try/catch
  so even a bug in the file produces an envelope.
- **Manual entry is the first-class path, not the fallback.** Every number the gaming section
  renders is reachable by typing it in the editor, without ever pressing Fetch. `editor.js`
  prints a Fetch button beside the **Steam** account only. The PSN account gets **no Fetch
  button at all** (`account(..., fetchable = false)`): a provider that can only answer 410 has
  no fetch concept, so the absence is the honest structure, and the note under the PSN field
  says the numbers there are typed in. A Steam fetch never blocks typing, and a failure
  re-renders the panel rather than throwing a toast, because the fields the person needs are
  already on screen underneath.
- No fetch error ever reaches the model. Errors live in a `Map` in `js/gaming.js` keyed by section
  id, so nothing about a failed fetch reaches localStorage, the YAML or an export.

Current state, honestly: **the key is not set and this worker is not deployed.** The deploy at
`resumeforge-api.neorgon.workers.dev` is still the pre-wave-2 one, which answers a bare HTTP 500
with `{"error":"..."}` and no `code`. `js/gaming.js` treats an absent, unparseable or code-less
body as `UPSTREAM_ERROR` and shows correct error text, so the site degrades properly against it.
The Steam happy path has therefore **never been exercised against Valve**: a successful fetch, a
private profile and an unknown ID are all untested code paths, coded defensively and marked as
unverified in the worker's own comments.

## Conventions

- Zero build step. Plain ES modules; `js/brand-icons.js` is the only generated file.
- No inline `onclick`. Everything routes through `data-act` / `data-path` / `data-file`
  attributes handled once in `events.js`.
- Adding a section type: an entry in `SECTION_TYPES` (fields drive the editor, the importers
  and the Markdown shape) plus a branch in `render.js → sectionBody` plus a sample in
  `catalog.js → SAMPLES` plus a title in **every** language table in `i18n.js → SECTION_TITLES`
  (`tests/i18n.test.mjs` fails on a missing one). Add a test round-trip if it has new field kinds.
  **Exception:** `pagebreak` is the first type that renders no `r-sec` wrapper at all.
  `renderSection` returns the bare marker before it reaches `sectionBody`, its title is an empty
  string in every language on purpose, and its `SAMPLES` entry is `{}`. A type that prints a
  heading does not get to take that path.
- Localisation: `meta.lang` switches the default section titles and the words the sheet prints
  (`Present` becomes `Actualidad`). **YAML keys stay English at every language**, and so does the
  UI chrome: the editor, the Catalog and the toolbar are English by design. `js/i18n.js` imports
  nothing, because `schema.js`, `serialize.js`, `markdown.js` and `render.js` all read it.
  A title the person typed is never overwritten: `sectionTitle` is consulted at exactly two
  places, `newSection` and `normalizeSection` when `raw.title` is `undefined`. `PRESENT` is
  applied at render time, never at import time, so switching the language back is lossless.
  `lintResume` points out section titles still sitting at the English default; it renames nothing.
- Adding a palette or font pairing: `design.js` only. Palette names are colours, never brands.
- Dates are free text in the model. Only the JSON Resume export converts them.
- `section.source === 'basics'` (icon rows only) renders `basics.links` instead of the section's
  own items; the Markdown marker token is `from-basics`. `design.links: none` hides the header copy.
- Drag and drop (`events.js → initDragAndDrop`) is pointer-event based, not HTML5 DnD (a ghost
  clone follows the pointer, `elementFromPoint` picks the target, Escape cancels, an aria-live
  region announces the move). It rebuilds `sections` as main-then-aside when the template has a
  side column; in single-column templates the list order is kept as dropped. Item cards collapse
  to their heads while an item is in flight (`body.is-dnd-item`).
- `js/a11y.js` is a **runtime decorator** over markup it does not own. It never writes the model
  and never reorders anything: an arrow key clicks the same `[data-act="move-section"]` /
  `[data-act="move-item"]` button a mouse would, so there is one mover in the app. It diffs
  `state.doc` on the `doc` bus event, which is why a pointer drag announces itself too without
  the drag block knowing this file exists. Its `decorate()` `console.warn`s once if the model has
  sections and the panel has zero `[data-drag]` handles: a development warning, not a test.
  **The diff alone cannot name the block a person moved**, which is why the file also records the
  block each interaction starts on (`focusin`, and `pointerdown` in the capture phase). A swap
  moves two blocks and either one explains the new order; worse, the main-then-aside rebuild
  above permutes several entries per drop on a document that was not already grouped, and then
  the diff explains the result with a block that only slid over, or with nothing at all. The
  recorded grab settles both, and when there is no usable grab the file says nothing rather than
  name the wrong block.
- **`#a11y-status` has exactly one writer: `js/a11y.js`.** `events.js` keeps a function named
  `announce`, and it is a deliberately inert stub. Both of its call sites are inside the frozen
  drag block, so the name has to stay; the body does not. When it had one, every drag spoke
  twice, and the events.js sentence (no position, landing about 30ms later) was the one that
  stuck. **Checked once by hand on 2026-08-28, and by nothing since:** Chromium with a
  `MutationObserver` on `#a11y-status` counted exactly one non-empty write per section drag, per
  item drag and per arrow move (re-run the same day on the multi-entry permutation drop described
  above, also 1). A one-off manual observation, **not a test**: no test in this project has a DOM, so a
  second writer added to that element later would go unnoticed until someone loads the page and
  listens. Do not give that stub a body.
- Share links (`js/share.js`): the canonical JSON tree, gzipped, base64url'd, carried in
  `view.html#s=`. **Nothing is uploaded**, and that is a property of the mechanism rather than a
  promise on a page: a fragment is never part of an HTTP request. Two rules keep it true, and
  both are load-bearing. `share.js` never fetches and never moves the payload into a query
  string or a redirect, and `view.html` sets `<meta name="neo-analytics" content="off">` because
  a beacon carrying `location.href` would hand the document to a third party through the back
  door. Verified in a browser: no request carried the payload.

## Gotchas

- js-yaml is a CDN global (`globalThis.jsyaml`), loaded by a classic `<script>` before the
  module entry. The node tests and `validate.mjs` set the same global from the npm package.
  `serialize.js` reads it lazily so importing the module never throws.
- Google Fonts css2 rejects the whole request when one weight does not exist for a family.
  `FONT_PAIRS` lists the exact weights each family ships; every pairing URL was checked (200).
- `content: var(--r-bullet)` needs the variable to hold a quoted string; `sheetStyle` writes
  `--r-bullet:'✦'`. An unquoted glyph renders nothing.
- The preview scales the sheet with `transform`, which does not change layout size: `preview.js`
  sets the stage's width/height by hand or the scroll area collapses.
- Printing uses `#print-root` (a clone) and hides every other body child. Printing the live
  preview would inherit the transform and the scroll container.
- Inputs inside `<summary>` toggle the `<details>` on click; `events.js` calls
  `preventDefault()` for inputs and buttons inside a summary.
- Desktop layout: `body { height: 100dvh }` above 1024px so `.editor-scroll` and `.preview-scroll`
  scroll internally. `flex: 1` on `.workspace` silently defeated an explicit `height:` calc and the
  whole page scrolled instead; verified with `scrollHeight === clientHeight` before the fix.
- The CSP allows `img-src https:` on purpose: favicons (Google s2) and pasted image URLs.
  `view.html` is tighter than `index.html` on purpose: `script-src` and `connect-src` are
  `'self'` and nothing else, because that page holds someone's CV in its own URL.
- The `tests/` glob in `package.json` is `tests/*.test.mjs`; `node --test tests/` alone fails
  on Node 22+.
- **The worker and the site can drift silently**, because the worker deploys on its own schedule
  and nothing in a page load checks which version answered. `js/gaming.js` is the worker's only
  reader, so `tests/gaming.test.mjs` imports both and asserts the worker's exported
  `ERROR_CODES` equals the site's `HANDLED_CODES`. That test is the only thing in the system
  that would notice a disagreement about a code. Renaming a code breaks it on purpose; the list
  is additive only.
- **`css/resume.css` must stay self-contained**, because the standalone HTML export inlines it
  verbatim: no app tokens, no `@font-face`, nothing that resolves only inside `index.html`. That
  constraint is why the photo zoom is divided by 100 in `render.js → sheetStyle`
  (`--r-photo-zoom: 1.40`) instead of with a `calc()` in the stylesheet. The model stores an
  integer percent (100 to 300) so the design panel can label the slider with a plain `%`; the
  CSS receives a unitless multiplier it can hand straight to `scale()`.
- **The zoomed photo reaches the printer still transformed, and nothing detects what that costs.**
  `css/resume.css:400` clears the preview transform on `.sheet` only (`transform: none
  !important`) and clears nothing on its descendants, so the `transform: scale()` at
  `css/resume.css:89` is live through the whole print pipeline. A transform inside a print job is
  the classic place for a renderer to give up on vectors and rasterize the page, which would cost
  selectable text and crisp glyphs, not just a blurry photo. **Checked once by hand on 2026-08-28,
  and by nothing since:** two PDFs printed from the same resume at zoom 100 and zoom 220 each
  carried exactly 1 image and 12 embedded fonts, with byte-identical extractable text, and the
  photo's placement box measured exactly 2.2x, so the scale was applied and nothing was
  flattened. Same standing as the `pagebreak` check above: a one-off manual run, **no automated
  detector**, no PDF rendered by any test. If it ever does regress, the fallback is already
  decided and it is not a CSS patch: keep `--r-photo-x` and `--r-photo-y`, which are
  `object-position` and cost nothing at print, and withdraw the zoom control.
- `meta.lang` has **no control in the UI**. It is set in the YAML tab, or in an imported file.
  What the language does have wired up is `newSection`, which is passed `doc.meta.lang` so a
  section added to a Spanish document is born with a Spanish default title.
- The `pagebreak` marker is visible only because `mountSheet` adds `is-editing` to the article.
  `renderResume` alone emits a zero-height element, which is what keeps the PDF, the standalone
  HTML export and the Catalog thumbnails showing exactly what prints. A break placed in the side
  column does nothing, and `lintResume` says so rather than silently moving it.
  **Checked once by hand on 2026-08-28, and by nothing since:** printed through headless Chromium
  and measured with PyMuPDF, `banner`, `sidebar` and `classic` each went from 1 page to 2 with a
  break in place, so `break-after: page` does survive the grid templates. That was a one-off
  manual run. **No test in this project renders a PDF**, `tests/` has no DOM at all, so this is
  not covered by the suite: a CSS change that stops the break working would ship silently. If you
  touch the print rules in `css/resume.css`, re-run that check by hand or you are shipping on the
  strength of a date.
- A share link with one photo runs to about 71,000 characters and one with a photo and a banner
  to over 140,000, against the roughly 80,000 where Safari gives up. So images are stripped by
  default, the dialog shows the measured length of the whole URL, and Copy and Open are disabled
  past `SAFE_LINK` (78,000). Measure the URL, not the payload: the host name is part of the limit.

## Do not touch

- `js/neorgon-*.js`, `css/neorgon-*.css`: vendored kits, regenerated by `packages/neorgon-ui/sync-*.sh`.
- `js/brand-icons.js`: generated; edit `assets/icons/brands/` and rerun the tool.
- The psnprofiles.com and steamdb.info scrapers are **deleted and stay deleted**. Both answer 403
  to any non-browser client from any IP, and the steamdb URL the old worker fetched
  (`/calculator/{id}/?cc=us`) hit two `Disallow` lines in its robots.txt, so removing it is a
  correctness fix and not only an availability one. The full record is at the top of
  `worker/src/index.js`. Do not "repair" a regex that has nothing left to parse.
- The drag block in `js/events.js` is frozen. `js/a11y.js` decorates its handles at runtime
  rather than editing it, which is the whole reason that file is a decorator.
- `js/a11y.js` is imported by a one-line import at the top of `js/catalog.js`, which looks wrong
  and is deliberate (contract C10: the two files had one owner and `js/app.js` had another).
  Nothing in it depends on the Catalog. If you move that import to `app.js`, **move** it: a
  second import installs the live region and the listeners twice.
