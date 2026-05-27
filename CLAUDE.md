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
complete. The dev server runs at localhost:3000.

## Scope guardrails

- Faithful port first, opinionation later. Don't customize until the
  whole upstream feature set works end-to-end.
- Don't add image optimization, RSS, i18n, or PWA bits unless the
  upstream feature being ported needs them.
- Keep polyfill UI elements in src/admin.html intact (initAIToggle
  reads them at startup). Prune them only when modifying AI modules
  to call Chrome built-ins.
