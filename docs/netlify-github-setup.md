# Netlify / GitHub setup

The operational runbook for the editor's hosting: what to configure where,
how to do it again from scratch, and how to fix it when it breaks. The
*why* behind these settings lives in `docs/security-model.md`; this file is
the *how*. The last section records the current test deployment's facts.

## How the pieces talk to each other

The site is a static Metalsmith build deployed by Netlify from the GitHub
repo. Two Netlify Functions ride along with the deploy:

- `preview` renders draft frontmatter through the site's own templates. It
  requires a signed-in Netlify Identity user and holds no secrets.
- `publish` writes to GitHub (a PR branch, or `main` for admins). It holds
  the only secret: a GitHub fine-grained PAT, supplied as an environment
  variable.

Netlify Identity is the account system. The admin page's sign-in widget
talks to it; the JWT it issues is attached to preview/publish calls and
verified by Netlify's platform before Function code runs. Editors exist
only because you invited them.

All build configuration (build command, publish directory, functions
directory, the preview Function's bundled template files) is in
`netlify.toml` in the repo — none of it needs to be entered in the Netlify
UI.

## From scratch: GitHub side

1. **The repo.** The site deploys from and publishes to the same GitHub
   repository. Note its `owner/name` — you'll need it twice below.

2. **The fine-grained PAT.** GitHub → your avatar → *Settings* →
   *Developer settings* → *Personal access tokens* → *Fine-grained tokens*
   → *Generate new token*.
   - **Token name**: something you'll recognize in a list a year from now
     (e.g. `editor-<site>`).
   - **Expiration**: pick a real date, 60–90 days. Put it in your
     calendar — see "When publishing breaks" below for why.
   - **Resource owner**: your account (or the org that owns the repo).
   - **Repository access**: *Only select repositories* → the one repo.
   - **Repository permissions**: *Contents* → Read and write;
     *Pull requests* → Read and write. (Metadata read gets added
     automatically.) Nothing else, and no account permissions.
   - Generate, copy the token once — GitHub never shows it again.

3. **Branch protection (optional but recommended).** Repo → *Settings* →
   *Branches* → add a rule for `main` requiring a pull request before
   merging. Leave "Include administrators" off so your own pushes and the
   admin direct-commit path keep working. Read the nuance in
   `docs/security-model.md` before trusting this with more than accident
   prevention: the PAT acts as you, so admin-exempt protection does not
   constrain the token itself.

## From scratch: Netlify side

1. **Create the site** from the GitHub repo (Add new project → Import an
   existing project). Build command and publish directory are read from
   `netlify.toml`; accept them.

2. **Environment variables.** Site configuration → *Environment
   variables*. Two, both scoped to Functions (all scopes is fine too):
   - `GITHUB_REPO` — the `owner/name` string, e.g.
     `wernerglinka/in-situ-editor-dev`. No URL, no `.git`.
   - `GITHUB_PAT` — the fine-grained token from above.

   Environment changes take effect on the **next deploy** — trigger one
   (Deploys → *Trigger deploy*) after setting or rotating them, or the
   Functions keep running with the old values.

3. **Enable Identity.** The Identity section of the site dashboard →
   *Enable Identity*. Then, and this is the setting everything rests on:
   - *Registration* → **Invite only**, email confirmation **required**.
   - *External providers*: leave all off. Email is the only door, and the
     invite is the only key.

4. **Verify before inviting anyone.** From any terminal:

   ```
   curl -s -w " -> %{http_code}\n" -X POST \
     https://<site>/.netlify/functions/preview \
     -H "Content-Type: application/json" \
     -d '{"frontmatter":{"sections":[]}}'
   ```

   Expected: `Sign in to use the live preview -> 401`. Also confirm the
   admin URL shows only the sign-in prompt, and that `/sitemap.xml` and
   the site menu don't mention it.

## People: inviting, roles, removing

**Invite** from Identity → Users → *Invite users*, one email per editor.
The recipient clicks the link, sets a password, confirms — done. If a
tester reports the invite link no longer working, delete the pending user
and re-invite; the links are short-lived by design.

**Roles** are set on the user (open the user in the Users list, edit
roles). There are exactly two meaningful states:

- *No role* — a normal editor. Can sign in, use the full editor, see live
  previews, and publish **as a pull request** you review and merge.
- `admin` — additionally sees and can use "Publish direct", which commits
  straight to the default branch, skipping the PR. Give this to no one you
  wouldn't hand the repo to. Role enforcement is in the publish Function;
  the UI hiding buttons is cosmetic.

**Remove** a departing editor by deleting the user in the Identity UI.
Their existing session dies when their JWT expires (about an hour). If
they had the `admin` role, rotate the PAT too — not because they had it
(they never did), but as cheap hygiene on any privileged departure.

## Routine operations

**Rotating the PAT** (on expiry, on schedule, or after any scare):
generate a new fine-grained token with the same settings, replace
`GITHUB_PAT` in the Netlify environment, trigger a deploy, then delete the
old token on GitHub. Total downtime: none if you set the new value before
deleting the old token.

**Rotating the admin URL** (if it leaks): rename `src/admin/` in the repo
to any new directory name, commit, push — the deploy moves the page and
the old URL 404s. Nothing else references the path. Tell the editors.

**When publishing breaks** and nothing changed in the code, it's almost
always the PAT: it expired, or was regenerated without updating the env
var, or the env var was updated without a redeploy. The symptom is a
publish error that looks like a bug ("failed to create branch/commit"),
not like a credential problem. Check the token's expiry on GitHub first.

**When previews break** on the deployed site for a signed-in editor, have
them sign out and back in (an expired-but-cached session); if it persists,
check the deploy log — the preview Function bundles the site's templates
via `netlify.toml` `included_files`, so a failed deploy can leave it
stale.

## Local development

`netlify dev` (not plain `npm start`) proxies the Functions and Identity,
serving everything on **http://localhost:8888**. The admin is at
`/admin/?admin=true` — the flag reveals the editor without an Identity
session, and works **only on localhost**. The preview Function runs
auth-free locally; publish still requires real Identity sign-in, so
publishing is normally exercised against the deployed test site instead.

## This deployment (the dev fixture's test site)

Facts as of 2026-07-02 — update this section when they change:

- Site: **https://testdit.netlify.app/** (the similarly-named
  `ms2025-structured-content-starter.netlify.app` is the *starter's* demo,
  not the editor).
- Repo: `wernerglinka/in-situ-editor-dev` (both deploy source and publish
  target; `GITHUB_REPO` points here).
- PAT: fine-grained token named `editor-test`, scoped to that one repo,
  contents + pull requests read/write, **expires 2026-08-13**.
- Identity: invite-only, email confirmation required, no external
  providers. One user: Werner (`admin` role).
- Verified live 2026-07-02: anonymous preview POST → 401, GET → 405,
  admin page dormant and unlisted (no nav entry, no sitemap entry, no
  robots.txt mention, noindex meta).
