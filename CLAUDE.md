# Working on the in-suit-editor port

This project is an active POC port of GoogleChrome/starter-extended-blog
onto metalsmith2025-simple-starter, Chrome-AI-only. See ~/.claude memory
for the project background.

## Operating mode

Work through the obvious next step without checking in. When you finish
a logical chunk, commit it on a sensible boundary (whole feature working,
not mid-refactor) and start the next chunk. Report what you did in one
or two sentences and keep moving.

Reserve "pause and ask" for: architectural forks with no obvious right
answer, irreversible operations (force push, history rewrites, deleted
branches), or anything that touches state outside this repo.

Verify UI changes in the browser via Chrome MCP before reporting a pass
complete. The dev server runs at localhost:3000 via `npm start`. For
features that touch Netlify Identity or the publish Function, use
`netlify dev` instead so the auth endpoint and Functions runtime are
proxied locally.

## Scope guardrails

- The publish path is Netlify Identity + a Netlify Function that holds
  the GitHub PAT. Do not reintroduce client-side PATs or per-user
  GitHub credential inputs in the admin UI.
- Role enforcement lives in the Function (`netlify/functions/publish.js`),
  not in the UI. The UI hides buttons as a courtesy; the Function is
  the actual security boundary.
- Don't add image optimization, RSS, i18n, or PWA bits unless the
  upstream feature being ported needs them.
- `/admin/` is still publicly readable. Identity gates the publish
  action, not the editor page. Don't deploy sensitive content there
  until that changes.
