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

## Phase 2 — widen inline coverage

Goal: an editor working only on the page can reach everything that is
visible on the page.

**Done — nested repeatable items and custom markup.** The user-reported
"several section components cannot be edited in Page view" was the expected
annotation-coverage gap. `annotateInlineFields` now runs three passes per
section, most precisely scoped first:

1. *Items*: every array-of-objects field (recursing through groups, so
   `stats.items` counts) is matched to its rendered per-item containers — an
   element whose children repeat (same count, same tag) and where each child
   holds the majority of its item's rendered strings. Inside each container,
   plain string fields are matched **by value** (the element whose text
   equals the field's value), which needs no knowledge of component class
   names, so custom markup (stat values, timeline years, a testimonial's
   quotee) works the same as the shared text partial. Prose and ctas can't
   value-match; they use the partials' classes, guarded to exactly one
   candidate per item. No containers matched → value-match in the parent
   scope (covers a column's unwrapped blocks); still ambiguous → skip.
2. *Section class pass* (the original `.title`/`.lead-in`/… tagging), now
   skipping everything the items claimed — this also fixed a Phase 1 bug
   where a slider section holding `text.title` it never renders stole slide
   0's title element for the section-level path.
3. *Section value pass*: the section's own remaining strings, value-matched
   (testimonial, artwork-style custom markup).

Never-mis-tag guards throughout: a value two fields share tags nothing
(rendered text can't say which field owns it), only an unambiguous innermost
match tags, and interactive elements / svg are excluded. Data-driven lists
(blurbs, pricing tiers, accordions) hold no items in the section values, so
they stay read-only by construction. `src/qa-inline-editing.md` is the QA
fixture — nested sections with realistic distinct values (the all-sections
QA page reuses "Sample text" everywhere, which correctly tags nothing).
Verified under `netlify dev`: slider/hero-slider slides, stats, steps,
timeline, flip cards front+back, testimonial, columns block titles all edit
in place and round-trip through their form controls; the markdown overlay
opens per-slide prose; the pathological all-sections page produces zero
mis-tags.

**Done — images.** `src` leaves are collected alongside text and matched by
filename against rendered `<img>` elements (`data-field-image`), same
never-guess rules (a filename two fields in scope share tags nothing).
Clicking a tagged image triggers its form field's Choose-image button, so
the upload flows through the existing image pipeline. Verified: slide
images, a testimonial portrait, and hero-slider background images tag with
correct paths and the click reaches the file input; the all-sections page
(every image the same file) tags only per-scope-unique ones, all correctly.

**Done — the section-settings bridge.** Hovering a section in the frame
shows a fixed-position "⚙ Section settings" pill at its top-right (one
element repositioned per hover, clamped into the viewport and below a
fixed/sticky site header). Clicking it calls
`openSectionSettings(index)` (editing-surface.js): switches to Page setup
without persisting the view choice, expands that section's card, scrolls
to it. This is the bridge to everything inline editing can't express —
structure, empty fields, and same-valued fields it skips as ambiguous.

Phase 2 standing rule: the manifests/`components-schema.json` stay the
single source — no editor-specific annotations in library components.
Where a component's markup genuinely can't be matched generically, skip
it and rely on the section-settings bridge (never mis-tag).

## Phase 3 — structure on the page (done)

Goal: the common structural gestures without opening the drawer.

Shipped:

- `section-builder.js` exports by-index operations — `moveSection`,
  `removeSection`, `toggleSectionDisabled`, `insertSection`,
  `listSectionTypes`, `sectionCount` — and its card controls and add menu
  now call them, so both surfaces share one implementation.
- The hover toolbar grew ↑ ↓ ⊘ ✕ ahead of ⚙ Section settings (bounds-aware:
  ↑/↓ disable at the ends). Disable removes the section from the rendered
  page (it stops rendering), so re-enabling lives on the section's card.
- "+" inserters pinned to the hovered section's top and bottom edges — the
  actual seam an insert lands at, hidden rather than clamped when the seam
  is off-screen. Each is a native select styled as a pill, so one click
  opens the schema-driven type list (same source as the drawer's add menu).
  Inserting opens the new section's card via `openSectionSettings` (a new
  section is empty; often nothing renders to click on).
- A 400ms hide grace lets the cursor cross the margin gap between sections
  to reach a seam's "+".

Verified under `netlify dev` on the qa-inline-editing fixture: move down
reorders the emitted document, disable removes the section from the page
and emits `isDisabled: true`, the top-edge inserter lands a banner at the
right index and opens its card in Page setup, deleting it from the page
removes it, and the drawer's own controls (which now call the shared ops)
restore the original order.

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
