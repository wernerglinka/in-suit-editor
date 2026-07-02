# Code review backlog (from the 2026-07-01 comprehensive review)

A five-area review (editor core, persistence/utils, AI layer, publish-path
security, build/scripts) produced a set of verified findings. The critical
cluster was fixed in `503c9e6` (dialog cancel deleting drafts, sections wiped
by the schema-fetch race, translations wiped by DOM-as-truth sync, preview
render races, tag-schema short-circuit, expiring publish token). This file
holds what was found and **not yet fixed**, so it survives the session that
found it. Line numbers are as of the review; re-locate before editing.

## Security / publish path (Function is the boundary; no criticals found)

- **Image extension unchecked** — `netlify/functions/publish.js` (~line 144):
  name regex allows `evil.js`/`x.html`; an authenticated editor can commit a
  served script into the assets tree (hosted stored-XSS). Constrain extension
  to an image allowlist and/or sniff the base64 payload.
- **Preview Function unauthenticated and uncapped** — `preview.js`: no
  payload-size, nesting-depth, or rate bound; recursive section rendering;
  also renders a *dynamic Nunjucks include path* from `section.sectionType`
  (bounded by the loader's basePath prefix guard + forced `.njk`, but still
  template-path injection). Validate `sectionType` against `[a-z0-9-]+`,
  cap payload/depth, consider requiring Identity on the deployed site.
  (Planned as Phase 4 of docs/in-situ-first-plan.md.)
- **`pr` mode ungated** — publish.js: any authenticated Identity user (no
  role) can create branches/PRs; fine if Identity registration is
  invite-only — that platform setting is load-bearing, verify it.
- **Error bodies leak internals** — publish.js ~223 returns raw GitHub API
  error text; preview.js ~38 returns fs error messages with absolute lambda
  paths. Keep production 500 bodies generic.
- **Load-bearing platform assumption** (document in the Function): Netlify
  verifies the Identity JWT and populates `clientContext.user`; deployed
  anywhere else, auth collapses. No independent signature check exists.

## Data loss / correctness (client)

- **zip export ignores pageType** — `export/zip-exporter.js` ~50: hardcodes
  `src/blog/<slug>.md` + blog image root for every draft; a 'page' draft
  exports self-contradicting paths. Use `pageTypeOf(draft)` + shared slugify.
- **Stale top-level keys re-emitted** — `MANAGED_KEYS` in
  `utils/markdown-utils.js` ~249 omits `title`/`description`/`date`, so a
  hand-authored page's legacy top-level `title` rides along in `draft.extra`
  and diverges from the edited `seo.title` on every publish.
- **Unquoted source dates blanked** — a `pages.json` date that was an
  unquoted YAML date arrives as an ISO datetime string, which
  `<input type="date">` rejects → `card.date` publishes empty and the
  collections sort breaks (`open-from-site.js` ~121). Normalize to
  `YYYY-MM-DD` before assigning.
- **YAML scalar quoting gaps** — `escapeYamlValue` leaves `true`/`null`,
  numerics ("2024"), and `!`-leading strings unquoted; array items with
  newlines emit invalid YAML (multiline handling exists only in object
  position).
- **sanitizer.js fallback chain is broken** — the DOMPurify path can't load
  (`script.src = 'dompurify'`, nothing vendored) and terminates in raw
  `innerHTML = html`; the native `new Sanitizer(config)` path silently
  ignores the DOMPurify-style config keys. Reduce to native `setHTML` +
  hard failure, or vendor DOMPurify properly. One caller (translation
  preview).
- **localStorage fragility** — `draft-manager.js`: unguarded `JSON.parse`
  at import bricks the editor on corrupt storage; `saveDrafts` has no
  QuotaExceededError handling (silent persistence stop). Same unguarded
  parse pattern in `ai-translator.js` init and `ai-classifier-restorer.js`.
- **IndexedDB deletes are fire-and-forget** — `db-storage.js` ~66-100:
  cursor-delete helpers resolve before the transaction completes, no
  onerror; `getImage` rejects with `tx.error` instead of `request.error`.
- **Duplicate image names not deduped** — re-uploading `photo.jpg` keeps the
  old blob for thumbnails (first-match by name) and publishes both payloads
  under one name (`image-handler.js` ~44). Zip import can also collide ids
  (`load-draft.js` ~162, `Date.now()` in a loop) and emits `image/svg` as a
  MIME type.
- **Housekeeping ignores translations** — `draft-housekeeping.js` ~50 scans
  only sections + content for image references; an image referenced solely
  by a translation gets purged.
- **Object URLs never revoked** — section-builder `thumbCache`,
  image-handler dimension probe, translator preview `blobCache`.

## AI layer (biggest items after the fixed criticals)

- **No AbortController / generation guard on streams** — Writer/Rewriter
  write into `ui.contentInput` after a draft switch and persist into the
  wrong draft (`ai-writer.js` ~81, `ai-rewriter.js` ~103); rewriter also
  drops a trailing `<figure>` and has no rollback on mid-stream failure.
- **Translator applies metadata before content and swallows failures** —
  a failed block translation leaves a title-only locale that publish ships
  (`ai-translator-core.js` ~76 with client `publish.js`).
- **Model output interpolated unescaped into `alt="…"`** —
  `ai-multimodal.js` ~106 → `image-handler.js` ~75; a quote in alt text
  breaks out of the attribute in *published* markup. Escape attributes.
- **Silent multi-GB model download** — `ai-init.js` warmup and multimodal
  `LanguageModel.create()` without `availability()`/monitor.
- Session leaks (no `destroy()` anywhere), no language-detection confidence
  threshold, `runAIAction` can't propagate errors to callers, translate
  re-entrancy (`ontoggle` + Translate all), suggested tags replace
  user-entered tags, dead code stratum (classifier scaffolding for a
  nonexistent API, `renderPills` imports that resolve undefined in
  `ai-toggle.js`/`settings-loader.js`, `activeAiStreams`, unused imports).

## Build / scripts / tests

- **`--env` CLI scripts are broken** — the metalsmith CLI applies `--env`
  AFTER importing the config, but `isProduction`/`basePath` are read at
  module top level (`metalsmith.js` ~75). `npm run dev` silently runs a
  production build; `build:subdomain` builds with an empty basePath. Only
  the shell-env `start*` scripts behave. Read env lazily or set it in the
  script shell.
- **No `npm test`** — 4 of 6 test files use mocha globals (mocha.opts is
  dead config), `build-integration.test.js` imports a package that isn't
  installed and asserts a file that doesn't exist. Highest-risk untested
  code: `netlify/functions/publish.js`, `utils/markdown-utils.js`,
  drafts/db-storage.
- **export-editor.mjs safety** — recursive `rmSync` of every MANIFEST path
  in the target with only a `target !== FIXTURE_ROOT` guard; add a
  target-is-the-editor-package check (package.json name) before deleting.
  `chmodSync` also crashes if the installer was skipped as missing.
- **install-editor.mjs granularity** — whole-directory skip/overwrite:
  partial installs when a site has same-named dirs; `--force` clobbers a
  site-owned `netlify.toml`.
- **Manifest drift traps** — `netlify/functions/lib/render-page.js` is
  listed as a single file (a second lib file would silently not ship);
  exported `pkg.files` whitelist excludes the copied CONSUMER_DOCS.
- **Filters throw on undefined** — `getSelections` (array-filters) and the
  whole string-filters family TypeError on missing frontmatter; in watch
  mode the rethrow at metalsmith.js ~335 kills the dev server. Same for
  unguarded `JSON.parse` over `lib/data` in watch.
- Minor: cwd-relative package.json read in metalsmith.js; dead
  `hostnames` entry in safe-links config; `metalsmith-sitemap` unused;
  `depcheck` in dependencies; qa scripts with hardcoded external path /
  undeclared js-yaml import.

## Dead code (removal candidates, verify first)

`paste-handler.js`, `html-paste-handler.js` (target removed markup; two
majors live in them but only matter if rewired), `image-handler.handleFiles`,
`frontmatter-parser.populateUIFromMetadata`, classifier renderer globals,
`base64-utils` to/from helpers, `settings-file-handler`'s
`eleventy-blog-settings.json` name.
