# Security model

How the in-situ editor is secured, what each layer is for, and which parts
are configuration you maintain in Netlify and GitHub rather than code in
this repo. The shape of it:

> Obscurity for discovery, sign-in for the surface, JWT plus input caps in
> the Functions for the boundary, PR review plus branch protection for the
> repo, and invite-only provisioning holding it all up.

The guiding principle, stated once and relied on everywhere: **the browser
is a courtesy, the Functions are the boundary.** Everything the admin page
does — hiding buttons, hiding itself — improves the experience and reduces
noise, but is client-side JavaScript anyone can read. Every decision that
matters is re-checked server-side.

## Who can act: provisioning

Editors exist because the site admin invited them through Netlify Identity.
That process is manual on purpose: it is the control point for who can edit
at all.

The whole model rests on one Netlify setting: **Identity registration must
be invite-only** (Site settings → Identity → Registration). With open
registration, anyone could self-provision an account and pass every check
below. This is the first thing to verify on a new deployment.

Roles stay minimal. Any authenticated user may use the editor and preview;
publishing a PR requires sign-in; committing directly to `main` requires
the `admin` role. Role checks live in the publish Function, never only in
the UI.

## The admin page: dark, then sign-in-first

The admin page is deliberately unreachable by browsing:

- No link anywhere on the site: the page has no `navigation` block, and the
  menu is opt-in, so it appears in no menu.
- `seo.noIndex: true`: search engines are told not to index it and it stays
  out of the sitemap. It is deliberately **not** listed in robots.txt — a
  `Disallow` line is an advertisement.
- Editors reach it by typing the URL, which is shared privately.

On the deployed site, the page shows nothing but a sign-in prompt until a
Netlify Identity session exists. The `?admin=true` URL flag reveals the
editor **on localhost only** (plain dev servers don't proxy Identity); the
deployed site ignores it.

If the URL is ever considered compromised, rotate it: rename the page's
directory (`src/admin/` → `src/<anything>/`) and redeploy. Nothing else
references the path — the editor's JavaScript, the Functions, and the
publish flow are all path-independent. Tell the editors the new URL and
the old one 404s.

All of this is discovery hygiene, not a boundary. A scanner that guesses
the URL sees a sign-in form; a scanner that reads the bundle learns nothing
it can use, because the Functions check for themselves.

## The Functions: the actual boundary

Both Functions treat every request as hostile until proven otherwise.

**`preview.js`** renders caller-supplied frontmatter through the site's own
Nunjucks templates — real server-side compute on untrusted input. It
requires a verified Netlify Identity user (any role) on the deployed site;
the platform validates the bearer token and the Function trusts only
`context.clientContext.user`. Independent of auth — because an invited
editor's browser can be compromised — it also validates input:

- Request body capped (1 MB; a real page is tens of KB).
- Section count capped (200) and value-tree nesting depth capped (24).
- `sectionType` must match `[a-z0-9-]+` before it reaches the dynamic
  include path (`../sections/<type>/<type>.njk`) — anything else is a path
  traversal attempt, not a component name.
- Render errors return a generic body in production; details (which can
  contain server paths) only under local dev.

Locally (`netlify dev`) the preview runs auth-free: Identity isn't proxied
by default and the endpoint listens only on localhost.

**`publish.js`** holds the only secret (the GitHub token) and does the only
writes. It requires a signed-in user, enforces the `admin` role for direct
commits, and validates slugs and image filenames before building Git paths.
No GitHub credential ever reaches the client, and no UI state is trusted.

Honest gap: there is no per-user rate limiting on the Functions at this
hosting tier. The auth gate is what stands between the endpoints and
anonymous compute abuse — that is why preview is not anonymous.

## The repo: assume an editor account gets compromised someday

Publishing goes through pull requests, and the human review before merge is
the content-integrity gate — an invited editor can put anything in
Markdown, and the merge is where it's caught.

Two GitHub-side settings keep the blast radius of a stolen editor session
small; maintain them alongside the site:

- **Branch protection on `main`** requiring review, so even the `admin`
  direct-commit path can be turned off at the repo when wanted, and a
  compromised account can at worst open PRs you decline.
- **A fine-grained PAT** for the publish Function: single repository,
  contents and pull-requests write only, with an expiry. Store it as a
  Netlify environment variable, rotate it on a schedule and whenever anyone
  leaves.

## What is deliberately not done

No WAF, no CAPTCHA, no custom token scheme, and no encryption of drafts in
the browser (IndexedDB drafts are a local-machine concern; editors on
shared computers should sign out and clear site data). Each of these costs
more complexity than it buys at this threat model.

## Deployment checklist

On every new site built from this repo:

1. Netlify Identity: registration **invite-only**; invite editors manually.
2. Netlify env: `GITHUB_PAT` is a fine-grained PAT scoped to the one repo
   named in `GITHUB_REPO` (contents + pull requests), with an expiry date.
3. GitHub: branch protection on `main`, require PR review.
4. Optionally rename `src/admin/` to a site-specific path before the first
   deploy, and share that URL privately with editors.
