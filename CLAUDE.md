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
```

## What it is

One data model (`resume:` root, see `template.yaml`) rendered through templates. The editor,
the YAML panel and the Catalog all mutate the same `state.doc`; every change re-renders the
sheet from scratch with `renderResume()`. PDF is the browser's print pipeline over a clone of
the sheet in `#print-root`, never a canvas screenshot.

## Architecture

| Module | Lines | Owns |
|---|---:|---|
| `js/app.js` | 33 | entry: load, wire, first-run example |
| `js/state.js` | 144 | `state`, `bus`, persistence (current doc, saved library, prefs), v1 migration call |
| `js/schema.js` | 505 | `SECTION_TYPES` registry, `normalizeResume`, `lintResume`, `migrateV1`, `newSection`, `blankItem` |
| `js/design.js` | 128 | `PALETTES`, `FONT_PAIRS`, `TEMPLATES`, shape lists, `resolveColors`, `googleFontsUrl` |
| `js/render.js` | 353 | `renderResume` (pure HTML), `renderSection`, `sheetStyle`, `pageCss`, `mountSheet` |
| `js/serialize.js` | 292 | YAML/JSON canonical tree, JSON Resume in/out, date helpers |
| `js/markdown.js` | 322 | Markdown (llms.txt style) out and in, heading markers |
| `js/linkedin.js` | 184 | CSV parser, LinkedIn export mapper (`importLinkedIn`) |
| `js/icons.js` | 198 | glyphs, brand lookup, host detection, `iconHtml`, `searchIcons` |
| `js/brand-icons.js` | 106 | GENERATED from assets/icons/brands by tools/build-icons.mjs |
| `js/editor.js` | 177 | schema-driven Content tab, Design tab host, `iconField` |
| `js/design-panel.js` | 73 | `designControlsHtml` (shared by Design tab and Catalog) |
| `js/catalog.js` | 168 | Catalog overlay: templates, examples, section types, design |
| `js/preview.js` | 72 | mount + scale the sheet, page guides, lint list |
| `js/export.js` | 142 | `exportAs` (pdf/yaml/json/jsonresume/md/html), `importFiles`, `importText` |
| `js/events.js` | 436 | all listeners: data-act routing, inputs, dialogs, keys, drag and drop |
| `js/fonts.js` | 26 | Google Fonts link for the sheet |
| `js/assets.js` | 48 | image resize to data: URIs |
| `js/gaming.js` | 40 | PSN/Steam fetch through the worker |
| `js/utils.js` | 70 | `escHtml`, `showToast`, `debounce`, `downloadText`, `getPath`/`setPath` |

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
- `library/*.yaml` + `library/index.json`: the example resumes the Catalog lists. Real files,
  also the fixtures the tests round-trip.
- `worker/`: Cloudflare Worker proxy for PSN/Steam; secrets are `wrangler secret` bindings.

## Conventions

- Zero build step. Plain ES modules; `js/brand-icons.js` is the only generated file.
- No inline `onclick`. Everything routes through `data-act` / `data-path` / `data-file`
  attributes handled once in `events.js`.
- Adding a section type: an entry in `SECTION_TYPES` (fields drive the editor, the importers
  and the Markdown shape) plus a branch in `render.js → sectionBody` plus a sample in
  `catalog.js → SAMPLES`. Add a test round-trip if it has new field kinds.
- Adding a palette or font pairing: `design.js` only. Palette names are colours, never brands.
- Dates are free text in the model. Only the JSON Resume export converts them.

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
- The CSP allows `img-src https:` on purpose: favicons (Google s2) and pasted image URLs.
- The `tests/` glob in `package.json` is `tests/*.test.mjs`; `node --test tests/` alone fails
  on Node 22+.

## Do not touch

- `js/neorgon-*.js`, `css/neorgon-*.css`: vendored kits, regenerated by `packages/neorgon-ui/sync-*.sh`.
- `js/brand-icons.js`: generated; edit `assets/icons/brands/` and rerun the tool.
