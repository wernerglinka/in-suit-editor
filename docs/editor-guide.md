# Editor guide

How to write and publish posts with the in-site editor. This guide tracks
the editor as it evolves; if something here doesn't match what you see,
the guide is behind — say so.

## Opening the editor

The editor lives at `/admin/` on the site. It is gated by sign-in: fresh
visitors see a sign-in prompt, and the editor appears once you sign in
with your Netlify Identity account (invite-only; ask the site owner for
an invite).

For local development without Identity, append `?admin=true` to the URL
(`http://localhost:3000/admin/?admin=true`). This sets a flag in your
browser so subsequent visits stay unlocked. It only reveals the editing
surface — publishing still requires sign-in, and the server enforces
that regardless of what the browser shows.

## Drafts

Drafts live in your browser (localStorage for the text, IndexedDB for
images). Two consequences worth knowing:

- Drafts are per browser *and* per site. A draft started on the live
  site won't appear on localhost, or in another browser or profile.
- Clearing site data in your browser deletes your drafts. Use
  **💾 Save (.zip)** to keep a copy outside the browser.

The sidebar lists your drafts. **+** starts a new one, **×** deletes one, and **Load Draft** restores a draft from a saved file.

**Load Draft** also opens an existing page for editing: pick a page's
`.md` (or a `.zip` saved from here) and its sections load into the form
ready to edit. The editor reads the page's frontmatter, so the title,
description, date, tags, and every section come back as you left them.
Anything the editor doesn't manage — a data-driven section like
`featured-posts`, or any field it doesn't recognize — is shown as preserved
and written back unchanged when you save, so opening a page never loses
content.

**Open from site** lists every published page straight from the site, so
you can edit existing content without first finding its file. It reads a
snapshot the build emits (`/assets/pages.json`), groups the pages into posts
and other pages, and on pick loads the page through the same path as a file —
sections, menu settings, and unmanaged fields all come back intact. Two
things to know: the list reflects the **last deploy**, so a page you just
submitted as a PR appears only once that PR merges and the site rebuilds; and
because the destination slug is derived from the title, renaming the title
before publishing writes a new file rather than updating the original. To
update a page in place, keep its title.

## The form at a glance

The top of the form holds the four things you always set, in order: **Title**,
**Description**, **Page type**, and the **Simple page** toggle. Everything else
lives in labeled, collapsible sections below, each grouping its fields on a
faint background so the form stays scannable.

**Page type** (radio buttons) decides where the content publishes and what
fields it carries:

- **Blog post** — publishes to `src/blog/<slug>.md`, joins the blog
  collection, and carries a date, authors, and tags. Images go under
  `/assets/images/blog/<slug>/`.
- **Page** — publishes to `src/<slug>.md` (a top-level page like `/about/`),
  with no date/authors/tags. Images go under `/assets/images/<slug>/`.

**Simple page** is the body-mode toggle. Off (the default) builds the page from
the site's components in the **Sections** area. On makes it a single Markdown
body in the **Content** field — no sections, rendered through the simple
layout (headings, bold, lists, code blocks, links). Switching swaps the editing
surface; your other fields carry across. Publishing a simple page with an empty
body is refused — the body is the page.

Switching page type or body mode only changes which fields apply; your work is
untouched.

## The form sections

Below the primary controls, the collapsible sections (each appears only where
it's relevant):

- **Navigation** (pages only) — **Show in site menu**, plus the menu label and
  order, to place the page in the main navigation.
- **Page meta** — **Body classes** added to the page's `<body>` (defaults to
  `sections-page` / `content-page` by mode), and **Has hero** (section mode
  only), which flags a page that opens with a hero for the section layout's
  styling.
- **Top message** — a dismissible banner above the site header. The message
  body takes Markdown (bold, italics, an inline link), with an optional
  separate **Link URL** and **Link label** for a trailing call to action.
  Clear the message to remove the banner.
- **Blog post** (posts only) — **Date**, **Authors**, and **Tags**.
- **SEO** — **Social image** (Open Graph; for a post it also becomes the card
  thumbnail, falling back to the first section image when blank) and
  **Canonical URL** (overrides the page's canonical link).

## Building a post

In section mode, a post is a stack of sections, composed in the **Sections**
area (in content mode, you write a Markdown body instead — see above). The
**Add a section** menu lists every section the site's component library
defines; each one generates its form straight from that component's schema,
so it exposes exactly the fields the library section supports. A few of the
most common:

- **Rich Text** — a title and prose plus the full set of fields the
  library's text section supports: lead-in, title level (h1–h6), centering,
  subtitle, any number of call-to-action buttons, and a **Container
  settings** pane for width, spacing, and background. Prose fields take
  Markdown (headings, bold, lists, code blocks).
- **Image Only** — one image with alt text, caption, an optional link, and
  call-to-action buttons. Type a filename or URL, or use **Choose image**
  to upload; alt and caption are filled in for you when you upload, and a
  thumbnail appears.
- **Multi Media** — a richer media section: a text block plus media that can
  be an image, video, audio, icon, or Lottie animation, with a reverse-layout
  option and call-to-action buttons. Pick the media type at the top and the
  form shows only that media's fields; the others stay hidden until selected.
- **CTA Banner** — a call-to-action band: title, supporting prose, an
  optional image, and any number of buttons. Whether it spans full width and
  whether it uses a dark background are set in **Container settings**, not
  fixed; a plain banner is contained and light by default.

Add a section from the **Add a section** menu below the stack; reorder with
↑/↓; remove with ✕.

Each section's form is collapsible. A page opens with every section
collapsed, so the stack reads as a short list of section types and you can
see the page's makeup at a glance and jump to the one you want. Click
anywhere on a section's header to open or close its form (the ↑/↓/✕
controls in the header act on the section without toggling it); a section
you just added opens automatically so you can fill it in.

The toolbar at the top holds three buttons. **Page setup** and **Page**
switch the main area between two views: **Page setup** shows this form
(metadata, sections, settings), and **Page** shows the rendered page you
edit on directly — only one is up at a time. **Drafts** is separate: it
shows or hides the list on the left alongside whichever view you are in.
The document actions — Copy Markdown, Save, and Publish — live in a bar
along the bottom of the editor that stays on screen as you scroll.

A page that already has sections opens on the **Page** view: for reading
and text edits the page itself is the whole editor, and you switch to
**Page setup** for structure or metadata. A new draft (or a simple
Markdown page) opens on **Page setup**, since an empty page gives you
nothing to click. Once you pick a view yourself the editor remembers your
choice per browser instead of choosing for you.

Every section generates its form from the component library's schema rather
than from hand-written editor code, which is why each exposes the full set of
fields its library section supports and is named after that section. The menu
is built from the schema the build emits, so the editor offers whatever
components a site defines with no per-type editor code.

Within a section, the form collapses the same way the section stack does, at
every level. Repeatable entries (a hero slider's slides, for instance) are
collapsible cards that add, remove, and reorder like the section stack; an
existing entry loads collapsed and a newly added one opens. Field groups
(Text, Image, Background, and so on) are collapsible disclosures too: a group
at the top of a section opens by default, while a group nested inside an entry
or another group starts collapsed, so a long form like a hero slide reads as a
short list of parts you open as needed. Call-to-action buttons are the one
variant: a section starts with none, **Add CTA** appends one as its own
collapsible card, and each CTA carries only a remove control, since their
order does not matter.

Every section also carries the same wrapper settings, regardless of type,
grouped together at the top of the form before any content. **Disable
section** comes first, then **Container tag** (the HTML element the section
renders as: `section`, `article`, `aside`, or `div`; `section` by default,
though a few types seed their own, e.g. a banner starts as `aside`), then
**Section ID** and **CSS classes**, which set an `id` and extra classes on
that element for linking and styling. **Container settings** (the collapsed
group at the bottom) holds the layout options: containment, animation,
margins, padding, and background.

Above the sections sit the post's metadata: title, description, date,
authors, and tags. The title doubles as the post's URL slug
(`Trying Hard not to Smile` → `/blog/trying-hard-not-to-smile/`), so set
it before you publish — image URLs are derived from it, and an untitled
draft files its images under `untitled/`. Everything re-derives live as
you type, so renaming before publish is harmless.

The right-hand pane previews the page, updating a moment after every edit.
It has two views, switched by the **Rendered** / **YAML** buttons at its top:

- **Rendered** (the default) shows the actual page, drawn by the site's own
  templates and styles inside a frame — the same render publishing produces, so
  the preview is what you get. Sections that pull from the site's own content
  (related posts, collection lists, the author block) render with real data from
  the last deploy. The parts that depend on where the page will sit in its
  collection — previous/next collection links, and a collection list's page
  numbers — can't be known for an unsaved draft, so those render empty or
  unpaginated until the page is published.
- **YAML** shows the structured frontmatter document that publishing will
  commit, handy for checking exactly what a section emits. Long lines are
  clipped at the pane's edge.

On the deployed site the rendered view just works: the render runs as a Netlify
Function that Netlify serves alongside the site, so an editor signed in through
Netlify only needs the browser. If it is ever unreachable (a transient hiccup or
a broken deploy) the pane says so in plain language and the YAML view still
shows your content; reload in a moment, and tell your site administrator if it
persists.

The one place this differs is local development. The render endpoint is not
served by the plain `npm start` dev server, so run the site with `netlify dev`
instead. When running on `localhost` without it, the editor greys out the
**Rendered** button and falls back to YAML; hover the greyed button for a
one-line reminder of what to run. Restart under `netlify dev`, reload the admin,
and the Rendered view returns to whichever mode you last used. This greying-out
is localhost-only — it never happens on the deployed site.

## Editing on the page

In the rendered view you can edit a section's text straight on the page —
this is the editor's default face for an existing sections page. Hover a
title, lead-in, subtitle, image caption, or call-to-action button label and it
highlights; click to place the cursor, type, and click away (or press Enter) to
commit. This works for slider slides too, and clicking a button in the preview
edits its label rather than following the link. The change flows to the matching form field, so the two stay in step
and it saves like any other edit. Prose is Markdown, so clicking a prose block
opens the Markdown editor overlay rather than editing in place.

This edits text that is already there; adding a field that's currently empty, or
anything structural (adding, reordering, or removing sections, choosing images),
is done in **Page setup**. A structural change takes the moment the
preview needs to re-render; a text tweak shows as you type.

## The Markdown editor

Every Markdown field — a section's prose fields and the **Content** body in
simple-page mode — is a plain text box you can type into directly. Below each
one is an **⤢ Expand** button that opens a full-screen Markdown editor with a
small toolbar (bold, italic, heading, quote, bulleted and numbered lists,
link) and a preview toggle. Use it when a field needs more room than the
inline box gives, or when you want the toolbar and live preview; keep typing in
the box for quick edits.

The overlay edits only that one field. **Save** writes your text back to the
field and updates the preview; **Cancel** (or pressing Escape) closes it and
leaves the field untouched. Nothing is committed to the page until you save the
draft or publish as usual.

## Images

Pick an image with the **Choose image** button on an Image section.
The file can come from anywhere — your desktop, downloads, wherever. The
editor stores a copy in your browser and, on publish, commits it to the
site alongside the post at `src/assets/images/blog/<slug>/<filename>`.
You never need to know the repository layout.

Picking a file that already exists on the site does not link to the
existing copy — it uploads a fresh one under the post's image folder.

## Publishing

Sign in (Settings → Account, or the sign-in prompt), then:

- **🚀 Publish (as PR)** — available to every signed-in editor. Opens a
  pull request with the post and its images for the site owner to review
  and merge.
- **Publish directly to main** — admins only. Commits straight to the
  live site; Netlify rebuilds and the post is live in a couple of
  minutes.

The server checks your role on every publish — hiding or revealing
buttons in the browser changes nothing.

## Working locally without publishing

Two flows for testing a post against a local build:

- **💾 Save (.zip)** — the archive mirrors the repository layout. Unzip
  it at the repo root and the post (`src/blog/<slug>.md`) and its images
  (`src/assets/images/blog/<slug>/`) land exactly where the build wants
  them.
- **📋 Copy Markdown** — copies just the frontmatter document. Paste it
  into `src/blog/<slug>.md`. Fine for text-only posts; if the post has
  images you must place them at `src/assets/images/blog/<slug>/` by
  hand, so prefer the zip for image-bearing posts.

## AI features

The editor integrates Chrome's built-in AI (Summarizer, Writer,
Rewriter, and friends) for suggesting titles, descriptions, and tags and
for expanding or rewriting prose. The ✨ buttons appear only in Chrome
with the on-device model provisioned; in any other browser the editor
works normally without them. Per-section AI assistance is planned.
