#!/usr/bin/env node
/**
 * Export the editor-only package from this dev fixture.
 *
 * This repo is the editor's dev/test fixture: a full Metalsmith site where the
 * editor is developed and exercised. The thing that gets published to npm is a
 * separate, constant, editor-only instance (its own git repo, its own clean
 * zero-dependency package.json, name @wernerglinka/in-situ-editor). This script
 * materializes that instance into a target folder so the fixture can change
 * freely while the published package stays editor-only.
 *
 * It copies the editor surface (the shared MANIFEST) plus the installer scripts
 * at the same relative paths, then scaffolds the package identity files
 * (package.json, README, LICENSE) only if they are absent — so the editor-only
 * repo owns its version, release config, and prose once it exists. The `files`
 * whitelist in an existing package.json is refreshed each run so a newly added
 * surface path still gets published.
 *
 * Usage:
 *   node scripts/export-editor.mjs <editor-only-dir>
 *   npm run export -- <editor-only-dir>
 */
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANIFEST, NPM_DEPS, SCRIPTS } from './editor-manifest.mjs';

const FIXTURE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Everything the published package ships = the editor surface + the scripts (the
// installer, this manifest, and the exporter; see SCRIPTS in editor-manifest.mjs).
const FILES = [...MANIFEST, ...SCRIPTS];
// Consumer-facing docs maintained in this fixture and copied into the package
// repo on export. Package-authored docs (e.g. docs/theory-of-operations.md) are
// deliberately not listed here, so the export never overwrites them.
const CONSUMER_DOCS = ['docs/editor-guide.md', 'docs/validation.md', 'docs/security-model.md'];
const PKG_NAME = '@wernerglinka/in-situ-editor';

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const args = process.argv.slice(2);
const targetArg = args.find((a) => !a.startsWith('--'));
if (!targetArg) {
  fail('Usage: node scripts/export-editor.mjs <editor-only-dir>');
}

const target = resolve(process.cwd(), targetArg);
if (target === FIXTURE_ROOT) {
  fail('Target is the fixture itself; pass the separate editor-only package directory.');
}

mkdirSync(target, { recursive: true });
console.log(`\nExporting the editor-only package into:\n  ${target}\n`);

// Copy a fixture path into the package, replacing any existing copy so deletions
// in the fixture propagate (rmSync then cpSync covers both files and dirs).
function copyFromFixture(rel) {
  const from = join(FIXTURE_ROOT, rel);
  if (!existsSync(from)) {
    console.warn(`  ⚠ missing in fixture, skipped: ${rel}`);
    return false;
  }
  const to = join(target, rel);
  mkdirSync(dirname(to), { recursive: true });
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  console.log(`  ✓ ${rel}`);
  return true;
}

// The editor surface + installer scripts.
let copied = 0;
for (const rel of FILES) {
  if (copyFromFixture(rel)) copied += 1;
}
// The installer is the package bin; keep it executable after the copy.
chmodSync(join(target, 'scripts/install-editor.mjs'), 0o755);

console.log(`\nCopied ${copied} surface item(s).`);

// The consumer docs maintained in the fixture; package-authored docs untouched.
for (const rel of CONSUMER_DOCS) {
  copyFromFixture(rel);
}

// Scaffold package identity only when absent; refresh the files whitelist when
// it exists so the published payload tracks the surface without clobbering the
// editor-only repo's version/release fields.
const pkgPath = join(target, 'package.json');
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.files = FILES;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log('  ✓ package.json (files whitelist refreshed)');
} else {
  const pkg = {
    name: PKG_NAME,
    version: '0.1.0',
    description:
      'In-site section-builder editor for Metalsmith structured-content sites, with Chrome built-in AI and Netlify Identity publishing. Run `npx @wernerglinka/in-situ-editor` inside a starter-derived site to install it.',
    type: 'module',
    keywords: ['metalsmith', 'structured-content', 'editor', 'chrome-ai', 'netlify-identity'],
    author: 'werner@glinka.co',
    license: 'MIT',
    repository: { type: 'git', url: 'https://github.com/wernerglinka/in-situ-editor.git' },
    bin: { 'in-situ-editor': 'scripts/install-editor.mjs' },
    files: FILES,
    publishConfig: { access: 'public' },
    engines: { node: '>=18.0.0' }
  };
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log('  ✓ package.json (scaffolded — edit version/release config in the editor-only repo)');
}

// LICENSE: seed from the fixture if the package has none.
const licFrom = join(FIXTURE_ROOT, 'LICENSE');
const licTo = join(target, 'LICENSE');
if (existsSync(licFrom) && !existsSync(licTo)) {
  cpSync(licFrom, licTo);
  console.log('  ✓ LICENSE (copied)');
}

// README: scaffold install docs if the package has none.
const readmePath = join(target, 'README.md');
if (!existsSync(readmePath)) {
  const readme = `# @wernerglinka/in-situ-editor

The in-situ editor: an in-site, section-builder admin for Metalsmith
structured-content sites, with Chrome built-in AI and
Netlify Identity publishing.

[![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url]

This package is the editor's published, editor-only instance. It is generated
from the editor's dev fixture by \`export-editor.mjs\`; do not hand-edit the
copied surface here — change it in the fixture and re-export.

## Install

Inside a freshly cloned starter-derived site:

\`\`\`sh
npx @wernerglinka/in-situ-editor
\`\`\`

This vendors the editor into your site (you own and commit the copied files —
that is the point of an in-situ editor) and prints the remaining wiring:

1. \`npm install ${NPM_DEPS.join(' ')}\`
2. Wire the plugins into \`metalsmith.js\` (emit the editor schema from
   \`metalsmith-bundled-components\` with \`schema: { enabled: true }\`; place
   \`pagesArtifact()\` before \`collections()\` and \`dataArtifact()\` after it,
   before \`permalinks()\`).
3. Make sure the site loads its data files into \`metadata().data\` before
   \`dataArtifact()\` runs.
4. Set up Netlify Identity + the publish Function's GitHub PAT (the PAT lives
   only in the Function, never the client).
5. Review the POC globals in \`lib/layouts/admin.njk\` (\`window.AUTHORS\`, locales).
6. Build, then open \`/admin/?admin=true\`. Sign in to edit and publish.

Re-run with \`--force\` to overwrite an existing install.

Add \`--dev\` to also copy the distribution scripts into the site, turning it into
a self-contained dev fixture you can develop the editor in and re-export from
(\`node scripts/export-editor.mjs <dir>\`). A plain content install omits it.

## Author

[werner@glinka.co](https://github.com/wernerglinka)

## Acknowledgments

The initial inspiration for this editor came from Google Chrome's
[starter-extended-blog](https://github.com/GoogleChrome/starter-extended-blog) —
its in-site authoring model (editing content in place within the running site),
its publish-from-browser flow (composing in the browser and committing back to
the repo), and its use of Chrome's built-in AI for writing assistance.

## License

[MIT](LICENSE)


[npm-badge]: https://img.shields.io/npm/v/@wernerglinka/in-situ-editor.svg
[npm-url]: https://www.npmjs.com/package/@wernerglinka/in-situ-editor
[license-badge]: https://img.shields.io/npm/l/@wernerglinka/in-situ-editor.svg
[license-url]: LICENSE
`;
  writeFileSync(readmePath, readme);
  console.log('  ✓ README.md (scaffolded)');
}

// .gitignore: scaffold if absent (the editor-only repo has no node_modules —
// it is zero-dependency — but npm pack leaves *.tgz behind).
const gitignorePath = join(target, '.gitignore');
if (!existsSync(gitignorePath)) {
  writeFileSync(gitignorePath, 'node_modules/\n*.tgz\n.DS_Store\n');
  console.log('  ✓ .gitignore (scaffolded)');
}

console.log(`
Done. The editor-only package is ready at:
  ${target}

Next (yours — they touch git remotes and npm):
  cd ${target}
  git init && git add -A && git commit -m "Editor surface <version>"
  # point the remote at the canonical repo, e.g. github.com/wernerglinka/in-situ-editor
  npm publish        # publishes @wernerglinka/in-situ-editor (zero-dependency)
`);
