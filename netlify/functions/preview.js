/**
 * POST /.netlify/functions/preview
 *
 * Renders a draft's frontmatter to a full HTML page using the SAME Nunjucks
 * templates and filters the Metalsmith build uses, so the admin can show the
 * author a faithful preview of the page publishing will produce. Read-only —
 * it touches no repo state and holds no secrets — but it is real server-side
 * template rendering on caller-supplied data, so on the deployed site it
 * requires a Netlify Identity user like publish does, and it validates its
 * input regardless of auth (see docs/security-model.md).
 *
 * Body: { frontmatter: { sections, bodyMode, bodyClasses, ... } }
 * Response: text/html — the rendered document.
 */

import { renderPage } from './lib/render-page.js';

/** Local dev (`netlify dev`) runs auth-free: Identity isn't proxied by
 * default and the endpoint only listens on localhost. */
const IS_LOCAL_DEV = process.env.NETLIFY_DEV === 'true';

/** Upper bound on the request body. A real page is tens of KB; the platform
 * allows 6MB, which is far more compute than a preview should accept. */
const MAX_BODY_BYTES = 1024 * 1024;

/** Upper bound on sections per page. */
const MAX_SECTIONS = 200;

/** Upper bound on value-tree nesting. The deepest real component (a column's
 * blocks' text group) sits around 6; runaway nesting is a crafted payload. */
const MAX_DEPTH = 24;

/** The only shape a section type may have: it is spliced into a Nunjucks
 * include path (`../sections/<type>/<type>.njk`), so anything beyond a bare
 * component name (dots, slashes) is a traversal attempt, not a component. */
const SECTION_TYPE = /^[a-z0-9-]+$/;

/**
 * Whether a value tree nests deeper than allowed.
 * @param {*} value - The value to walk.
 * @param {number} depth - Remaining allowed depth.
 * @return {boolean} True if the tree exceeds the depth budget.
 */
function tooDeep(value, depth) {
  if (depth < 0) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((v) => tooDeep(v, depth - 1));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((v) => tooDeep(v, depth - 1));
  }
  return false;
}

/**
 * Validates the parsed frontmatter against the input caps.
 * @param {Object} frontmatter - The parsed frontmatter.
 * @return {string|null} A rejection reason, or null when acceptable.
 */
function rejectInput(frontmatter) {
  const sections = frontmatter.sections;
  if (sections !== undefined) {
    if (!Array.isArray(sections)) {
      return 'sections must be an array';
    }
    if (sections.length > MAX_SECTIONS) {
      return 'too many sections';
    }
    for (const section of sections) {
      const type = section && section.sectionType;
      if (type !== undefined && (typeof type !== 'string' || !SECTION_TYPE.test(type))) {
        return 'invalid sectionType';
      }
    }
  }
  if (tooDeep(frontmatter, MAX_DEPTH)) {
    return 'frontmatter nests too deeply';
  }
  return null;
}

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // The security boundary: on the deployed site, previewing requires a
  // signed-in Netlify Identity user (any role). The platform verifies the
  // Authorization bearer token and exposes the user on clientContext.
  if (!IS_LOCAL_DEV) {
    const user = context && context.clientContext && context.clientContext.user;
    if (!user) {
      return { statusCode: 401, body: 'Sign in to use the live preview' };
    }
  }

  if (event.body && event.body.length > MAX_BODY_BYTES) {
    return { statusCode: 413, body: 'Request too large' };
  }

  let frontmatter;
  try {
    ({ frontmatter } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: 'Invalid JSON body' };
  }
  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    return { statusCode: 400, body: 'Missing frontmatter' };
  }
  const rejection = rejectInput(frontmatter);
  if (rejection) {
    return { statusCode: 400, body: `Invalid frontmatter: ${rejection}` };
  }

  try {
    const html = renderPage(frontmatter);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: html
    };
  } catch (err) {
    // Locally, surface the reason so a developer can act on it. Deployed,
    // keep the body generic: template errors can carry server paths.
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: IS_LOCAL_DEV ? `Preview render failed: ${err.message}` : 'Preview render failed'
    };
  }
};
