# Plan: in-situ-first editing

Reviewer feedback: non-technical editors found the form column intimidating
("all the stuff") and asked to just edit the page itself when changing an
existing page. This plan makes the rendered page the primary editing surface
for content, keeps the forms as the surface for structure and invisible
metadata, and treats a new page as the degenerate case (no sections yet, so
it starts in the structural surface).

The engine already exists: `editor-logic.js` renders the draft through the
site's own templates into the preview iframe, annotates rendered fields with
`data-field`/`data-section-index`, makes plain-text fields contenteditable,
and routes every inline edit back through the matching form control's
`input` event. The work is promotion and coverage, not a new editor.

One model, not two modes:

- **Page surface (default for a draft with sections):** the rendered page,
  inline-editable. Content changes happen here.
- **Panel (drawer):** structure (add/remove/reorder/disable sections) and
  fields with no visual representation (SEO, card, date, nav, slug,
  container/classes). Always reachable, never the front door.
- **YAML view:** unchanged; debugging and render-backend-down fallback.

## Phase 0 — prerequisites (done)

The preview correctness bugs that this promotion turns critical are fixed:
render sequencing (stale fetch can no longer overwrite a newer document),
stale load-handler detachment, debounced-preview cancellation on draft
switch, current-draft guard in `updatePreview`, and shallowest-match field
annotation so nested items' fields aren't tagged as section-level ones.

## Phase 1 — flip the hierarchy (done)

Goal: opening an existing page lands the editor on the page, not the forms.

Shipped, after user feedback reshaped the layout twice:

- `editing-surface.js` owns the surfaces. **Page setup** and **Page** are a
  two-way view switch (exactly one shows); **Drafts** toggles the sidebar
  independently. A user-picked view persists per browser
  (`editor-main-view`) and wins over the default from then on.
- Default per draft load: sections draft + render backend reachable →
  Page view; new draft, simple Markdown page, or backend down → Page setup
  (pre-existing behavior preserved as the fallback).
- The document actions (Copy Markdown, Save, Publish) are a full-width bar
  at the bottom of `.editor-container`, sticky at the viewport bottom, so
  they are visible in both views. The toolbar row above the panes holds
  only the three view/panel buttons.
- The Markdown overlay (shared by inline prose clicks and the form's
  Expand buttons) was rendering empty: EasyMDE/CodeMirror 5 collapses to
  22px inside a flex column. The dialog body is now a plain scroll region
  and `.CodeMirror` keeps native sizing (`min-height: 55vh`).

Verified under `netlify dev`: open-from-site lands on the Page view, an
inline title edit persists to the draft's sections, view switching and
persistence work, backend-down keeps the form.

**Next session (user-reported):** several section components cannot be
edited in Page view. Expected cause, from the review: `annotateInlineFields`
(editor-logic.js) only tags section-level `.title`, `.lead-in`,
`.sub-title`, `.prose`, `.caption`, and `.ctas a`, guarded by the section's
own values — components whose text lives in nested repeatable items
(slider, accordion, columns, blurbs, flip cards…) or under other class
names get no tags, so nothing on them is clickable. That is exactly the
Phase 2 coverage work below; verify against the actual components before
assuming no additional cause.

## Phase 2 — widen inline coverage

Goal: an editor working only on the page can reach everything that is
visible on the page.

- Nested repeatable items (slides, accordion items, blurbs, list items):
  extend `annotateInlineFields` to walk array-valued section fields and
  match per-item containers in DOM order, the same way sections are matched
  to wrappers today. Field paths become `slides.2.text.title` etc.; the
  form-renderer already renders controls with those `data-field-path`s, so
  `commitInlineEdit` works unchanged.
- Images: click a rendered image opens the existing image picker for that
  field (reuse the section card's image control).
- Per-section hover toolbar in the frame: an "Open section settings" button
  that expands the drawer scrolled to that section's card — the bridge to
  everything inline editing can't express.
- Keep the manifests/`components-schema.json` as the single source: no
  editor-specific annotations in library components. Where a component's
  markup genuinely can't be matched generically, skip it and rely on the
  section-settings bridge (never mis-tag).

## Phase 3 — structure on the page

Goal: the common structural gestures without opening the drawer.

- Between-section "+" inserter on hover, offering the same type list as
  `populateAddMenu` (schema-driven).
- Hover toolbar grows move up/down, disable, delete — extracted from the
  section-card button handlers in `section-builder.js` into exported
  by-index operations both surfaces call.
- A newly inserted section is empty; auto-open its section settings in the
  drawer (materialized defaults often need content before anything renders
  to click on).

## Phase 4 — hardening the render path

Promotion makes the preview Function the hot path for every editor
keystroke (debounced), so the review's preview findings get addressed here:

- Application-level payload cap and section-nesting depth cap in
  `netlify/functions/preview.js`; validate `sectionType` against
  `[a-z0-9-]+` before it reaches the dynamic include path.
- Consider requiring an Identity JWT for preview on the deployed site
  (anonymous use of the render backend serves no editor need; keep it
  auth-free locally).
- Keep 500 bodies generic in production (no server paths).

## Cross-cutting

- Wire `npm test` (node:test) and cover the pure parts that this feature
  leans on: `markdown-utils` emit/round-trip and the annotation matcher
  (jsdom-free: extract the matching logic so it takes a parsed structure).
- Update `docs/editor-guide.md` per phase; the guide's audience is exactly
  the reviewer who asked for this.
- Verify each phase in Chrome against `netlify dev` (inline editing needs
  the render backend).

## Out of scope for now

Drag-and-drop reordering on the page, on-page editing of the SEO/card
block, multi-user/locking, and any change to the publish path.
