/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: MIT
 */

import { buildFrontmatter, generateMarkdown } from '../utils/markdown-utils.js';

/** The render endpoint (a Netlify Function; available locally under `netlify dev`). */
const PREVIEW_ENDPOINT = '/.netlify/functions/preview';

/**
 * Whether the admin is running against a local dev server rather than the
 * deployed site. This decides the audience for any "backend unavailable"
 * messaging: on localhost the reader is a developer who likely forgot
 * `netlify dev` (actionable); on the deployed site the reader is a content
 * editor with only a browser and a Netlify login, for whom the backend is
 * deployed by Netlify and any outage is transient and not theirs to fix.
 */
export const IS_LOCAL_DEV =
  /^(localhost|127\.0\.0\.1|::1)$/.test(window.location.hostname) || window.location.hostname.endsWith('.local');

/**
 * Editor-facing message for an unreachable render backend. No dev jargon: a
 * content editor cannot act on `netlify dev`, so point at the YAML fallback and
 * a reload, and defer anything real to the site administrator.
 */
const RENDER_UNAVAILABLE_EDITOR =
  'The live preview is temporarily unavailable. Your content is safe and the YAML view still ' +
  'shows it. Try again in a moment or reload the page; if it keeps happening, let your site ' +
  'administrator know.';

/**
 * Picks the audience-appropriate detail for an unreachable-backend notice.
 * @param {string} devDetail - The developer-facing detail (localhost only).
 * @return {string} The detail to show given the current environment.
 */
function unavailableDetail(devDetail) {
  return IS_LOCAL_DEV ? devDetail : RENDER_UNAVAILABLE_EDITOR;
}

/**
 * Short hint for the disabled Rendered toggle's hover tooltip. The plain
 * `npm start` dev server serves the site but not the Functions runtime the
 * render backend lives in.
 */
const RENDER_BACKEND_HINT =
  'Rendered preview needs the render backend, which only `netlify dev` serves. ' +
  'Stop `npm start`, run `netlify dev`, and reopen the admin on the port it prints ' +
  '(default http://localhost:8888/admin/?admin=true).';

/**
 * Longer guidance for the in-frame fallback notice, used if the backend drops
 * out after the initial probe (rare).
 */
const NETLIFY_DEV_HINT =
  'The preview render runs as a Netlify Function, which the plain `npm start` dev server ' +
  'does not serve. Stop it and run `netlify dev` instead, then open the admin on the port ' +
  'it prints (default http://localhost:8888/admin/?admin=true). The YAML view stays available ' +
  'in the meantime.';

/**
 * Cheap availability probe for the render backend. A HEAD to the endpoint is
 * routed to the Function under `netlify dev` (which answers 405 for non-POST,
 * so the route exists); the plain dev server has no such route and 404s;
 * nothing listening throws. Only a reachable route counts as available.
 * @return {Promise<boolean>} Whether the render backend is serving.
 */
export async function probeRenderBackend() {
  try {
    const res = await fetch(PREVIEW_ENDPOINT, { method: 'HEAD' });
    return res.status !== 404;
  } catch {
    return false;
  }
}

export { RENDER_BACKEND_HINT };

/**
 * Updates the preview pane. The rendered view POSTs the draft's frontmatter to
 * the render endpoint, which returns the page rendered through the site's own
 * Nunjucks templates and filters, and injects it into an iframe so it carries
 * the real site CSS and JS. The YAML view (the emitted structured frontmatter)
 * stays available behind the toggle, and is the fallback when the endpoint is
 * unreachable (e.g. the plain dev server without `netlify dev`).
 * @param {string} currentId - The ID of the current draft.
 * @param {Object[]} drafts - The list of all drafts.
 * @param {Object} ui - The UI elements.
 * @return {Promise<void>}
 */
export async function updatePreview(currentId, drafts, ui) {
  // A debounced call can fire after the user switched drafts; rendering it
  // would show (and inline-edit against) the wrong draft.
  const activeId = localStorage.getItem('current-draft-id');
  if (activeId && currentId !== activeId) {
    return;
  }
  const draft = drafts.find((d) => d.id === currentId);
  if (!draft) {
    return;
  }
  const classifierResults = window.getSelectedClassifierResults ? window.getSelectedClassifierResults() : [];
  const args = [
    draft,
    ui.titleInput.value,
    ui.descInput.value,
    ui.dateInput.value,
    ui.tagsInput.value,
    ui.contentInput ? ui.contentInput.value : '',
    classifierResults
  ];

  // Keep the YAML view current regardless of which pane is showing.
  const pre = document.createElement('pre');
  pre.className = 'frontmatter-preview';
  pre.textContent = generateMarkdown(...args);
  ui.previewContent.replaceChildren(pre);

  await renderPreviewFrame(ui, ...args);
}

/** Monotonic render counter: only the newest in-flight render may commit. */
let renderSeq = 0;

/** The load handler of the last committed render, so a newer render can
 * detach it before it fires against the newer document with stale data. */
let pendingLoadHandler = null;

/**
 * Fetches the rendered HTML for the draft and swaps it into the preview iframe,
 * preserving scroll position across the reload. On failure, writes a short
 * notice into the frame and leaves the YAML view as the usable fallback.
 * Renders are sequenced: a slower, older fetch that resolves after a newer one
 * is dropped instead of overwriting the fresh document.
 * @param {Object} ui - The UI elements.
 * @param {...any} args - The buildFrontmatter arguments.
 * @return {Promise<void>}
 */
async function renderPreviewFrame(ui, ...args) {
  const frame = ui.previewFrame;
  if (!frame) {
    return;
  }
  const seq = ++renderSeq;
  const draft = args[0];
  const { doc, body, isContent } = buildFrontmatter(...args);
  const frontmatter = { ...doc, bodyMode: isContent ? 'content' : 'sections', contents: body };

  let html;
  try {
    const res = await fetch(PREVIEW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frontmatter })
    });
    html = await res.text();
    if (res.status === 404) {
      // Server is up (e.g. plain `npm start`) but the Functions runtime isn't,
      // so the request 404s with the dev server's own error page rather than a
      // rendered document. The function itself never returns 404, so in
      // production this branch effectively doesn't happen.
      html = renderNotice('Live preview unavailable', unavailableDetail(NETLIFY_DEV_HINT));
    } else if (!res.ok) {
      // A real backend error (e.g. 500). Show the raw body to a developer; keep
      // it plain for a content editor.
      html = renderNotice('Live preview unavailable', unavailableDetail(html));
    }
  } catch {
    // Nothing is listening at the endpoint at all.
    html = renderNotice('Live preview unavailable', unavailableDetail(NETLIFY_DEV_HINT));
  }

  if (seq !== renderSeq) {
    // A newer render started while this one was in flight; let it win.
    return;
  }

  const prevScroll = frame.contentWindow ? frame.contentWindow.scrollY : 0;
  if (pendingLoadHandler) {
    // The previous document's load hasn't fired yet; detach its handler so it
    // can't annotate the new document with the old draft's section indexes.
    frame.removeEventListener('load', pendingLoadHandler);
  }
  const onLoad = () => {
    pendingLoadHandler = null;
    if (frame.contentWindow) {
      frame.contentWindow.scrollTo(0, prevScroll);
    }
    annotateInlineFields(frame, draft);
    wireInlineEditing(frame);
  };
  pendingLoadHandler = onLoad;
  frame.addEventListener('load', onLoad, { once: true });
  frame.srcdoc = html;
}

/**
 * The style injected into the preview frame to signal which text is editable
 * in place and to give focus a clear affordance.
 */
const INLINE_EDIT_STYLE = `
  [data-field][contenteditable]:hover { outline: 1px dashed rgba(80,120,255,.55); outline-offset: 3px; }
  [data-field][contenteditable]:focus { outline: 2px solid rgba(80,120,255,.9); outline-offset: 3px; cursor: text; }
  [data-field-markdown] { cursor: pointer; }
  [data-field-markdown]:hover { outline: 1px dashed rgba(80,120,255,.55); outline-offset: 3px; }
`;

/**
 * Injects the source-mapping attributes (data-section-index, data-field) into
 * the rendered preview. The library components are generic and emit none of
 * this — all editor knowledge lives here. It walks the draft's sections against
 * the rendered section wrappers (in order, skipping disabled ones), then tags
 * the editable fields inside each using the generic partials' stable class
 * names (`.title`, `.lead-in`, `.sub-title`, `.prose`, `.caption`, `.ctas a`),
 * guarded by the section's own values so a section that doesn't own a field at
 * top level (a slider, whose text lives per-slide) is never mis-tagged.
 * @param {HTMLIFrameElement} frame - The preview iframe.
 * @param {Object} draft - The current draft (its `sections` array).
 */
function annotateInlineFields(frame, draft) {
  const doc = frame.contentDocument;
  const main = doc && doc.querySelector('main');
  if (!main) {
    return;
  }
  const sections = Array.isArray(draft.sections) ? draft.sections : [];
  const rendered = sections.filter((s) => !s.isDisabled);
  const wrappers = Array.from(main.children).filter((el) => /^(SECTION|ARTICLE|ASIDE|DIV)$/.test(el.tagName));

  wrappers.forEach((wrap, i) => {
    const section = rendered[i];
    if (!section) {
      return;
    }
    wrap.dataset.sectionIndex = String(sections.indexOf(section));
    annotateSectionFields(wrap, section);
  });
}

/**
 * Finds the shallowest match for a selector under `wrap`. A section's own
 * field (e.g. its `.title`) sits closer to the wrapper than the same class
 * inside nested items (a slide's `.title`), so DOM depth disambiguates where
 * document order (querySelector's first match) would pick the wrong one.
 * @param {Element} wrap - The rendered section wrapper.
 * @param {string} selector - The field's class selector.
 * @return {Element|null} The shallowest matching element, or null.
 */
function shallowestIn(wrap, selector) {
  let best = null;
  let bestDepth = Infinity;
  for (const el of wrap.querySelectorAll(selector)) {
    let depth = 0;
    for (let n = el.parentElement; n && n !== wrap; n = n.parentElement) {
      depth++;
    }
    if (depth < bestDepth) {
      best = el;
      bestDepth = depth;
    }
  }
  return best;
}

/** Tags the shallowest matching element under `wrap` with a field path, once. */
function tagField(wrap, selector, path, isMarkdown) {
  const el = shallowestIn(wrap, selector);
  if (el && !el.dataset.field) {
    el.dataset.field = path;
    if (isMarkdown) {
      el.dataset.fieldMarkdown = 'true';
    }
  }
}

/**
 * Tags a section's own top-level editable fields, guarded by the section values
 * so nested content (a slide's text) isn't picked up as the section's.
 * @param {Element} wrap - The rendered section wrapper.
 * @param {Object} section - The draft section values.
 */
function annotateSectionFields(wrap, section) {
  const text = section.text;
  if (text && typeof text === 'object') {
    if (text.leadIn) {
      tagField(wrap, '.lead-in', 'text.leadIn');
    }
    if (text.title) {
      tagField(wrap, '.title', 'text.title');
    }
    if (text.subTitle) {
      tagField(wrap, '.sub-title', 'text.subTitle');
    }
    if (text.prose) {
      tagField(wrap, '.prose', 'text.prose', true);
    }
  }
  if (section.image && section.image.caption) {
    tagField(wrap, '.caption', 'image.caption');
  }
  if (Array.isArray(section.ctas)) {
    // Only ctas with a url render, in order; map each rendered anchor back to
    // its true index in the section's ctas array (the form's index).
    const validIndexes = section.ctas.map((c, idx) => (c && c.url ? idx : -1)).filter((idx) => idx >= 0);
    // Scope to the section's own ctas block (the shallowest one), so anchors
    // in nested items (per-slide ctas) aren't mapped to section-level paths.
    const ctasBlock = shallowestIn(wrap, '.ctas');
    const anchors = ctasBlock ? ctasBlock.querySelectorAll('a') : [];
    anchors.forEach((a, n) => {
      if (n < validIndexes.length) {
        wrapCtaLabel(a, `ctas.${validIndexes[n]}.label`);
      }
    });
  }
}

/**
 * Wraps a cta anchor's label text in a data-field span (leaving any icon
 * element in place) so the label alone is editable.
 * @param {HTMLAnchorElement} a - The rendered cta anchor.
 * @param {string} path - The label's field path (e.g. "ctas.0.label").
 */
function wrapCtaLabel(a, path) {
  if (a.querySelector('span[data-field]')) {
    return;
  }
  let label = '';
  for (const node of Array.from(a.childNodes)) {
    if (node.nodeType === 3) {
      label += node.textContent;
      a.removeChild(node);
    }
  }
  label = label.trim();
  if (!label) {
    return;
  }
  const span = a.ownerDocument.createElement('span');
  span.dataset.field = path;
  span.textContent = label;
  a.appendChild(span);
}

/**
 * Makes the rendered preview editable in place. Plain-string fields (marked
 * data-field) become contenteditable and commit on blur; Markdown prose
 * (data-field-markdown) opens the field's Markdown overlay on click. Both route
 * the edit through the matching form control, so the existing bind →
 * persist → re-render pipeline does the actual work. Re-run on every frame load
 * since each render replaces the document.
 * @param {HTMLIFrameElement} frame - The preview iframe.
 */
function wireInlineEditing(frame) {
  const doc = frame.contentDocument;
  if (!doc || !doc.body) {
    return;
  }
  if (doc.head) {
    const style = doc.createElement('style');
    style.textContent = INLINE_EDIT_STYLE;
    doc.head.append(style);
  }

  // The preview is for editing, not navigating: swallow link clicks so editing a
  // CTA label or a linked image caption (both live inside an <a>) never loads
  // another page into the frame. Capture phase, so it wins over the default.
  doc.addEventListener(
    'click',
    (e) => {
      const link = e.target.closest && e.target.closest('a[href]');
      if (link) {
        e.preventDefault();
      }
    },
    true
  );

  for (const el of doc.querySelectorAll('[data-field]:not([data-field-markdown])')) {
    el.contentEditable = 'plaintext-only';
    el.spellcheck = false;
    let original = '';
    el.addEventListener('focus', () => {
      original = el.textContent.trim();
    });
    // These fields are single-line; Enter commits rather than inserting a break.
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
    });
    el.addEventListener('blur', () => {
      const value = el.textContent.trim();
      if (value !== original) {
        commitInlineEdit(el, value);
      }
    });
  }

  for (const el of doc.querySelectorAll('[data-field-markdown]')) {
    el.title = 'Click to edit in the Markdown editor';
    el.addEventListener('click', () => openProseEditor(el));
  }
}

/**
 * Finds the form control that backs a preview element, matching on the
 * section index (nearest data-section-index ancestor) and the field path.
 * @param {Element} el - The edited element in the preview frame.
 * @return {HTMLElement|null} The form input/textarea, or null if not found.
 */
function formControlFor(el) {
  const wrap = el.closest('[data-section-index]');
  if (!wrap) {
    return null;
  }
  const index = wrap.getAttribute('data-section-index');
  const path = el.getAttribute('data-field');
  return document.querySelector(`#sections-list [data-section-index="${index}"] [data-field-path="${path}"]`);
}

/**
 * Writes an inline text edit back through its form control: set the value and
 * dispatch `input`, which fires the control's existing handler (mutate model,
 * sync, re-render preview). No-op if the control can't be found.
 * @param {Element} el - The edited preview element.
 * @param {string} value - The new text.
 */
function commitInlineEdit(el, value) {
  const input = formControlFor(el);
  if (!input) {
    return;
  }
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Opens the Markdown overlay for a prose field by triggering its form field's
 * Expand button. The overlay writes back by dispatching `input` on the
 * textarea, so saving flows through the same pipeline as a form edit.
 * @param {Element} el - The clicked prose element in the preview frame.
 */
function openProseEditor(el) {
  const textarea = formControlFor(el);
  const expandBtn = textarea && textarea.parentElement && textarea.parentElement.querySelector('button');
  if (expandBtn) {
    expandBtn.click();
  }
}

/**
 * A minimal standalone HTML document showing a notice in the preview frame.
 * @param {string} heading - The notice heading.
 * @param {string} detail - The notice detail (plain text).
 * @return {string} An HTML document string.
 */
function renderNotice(heading, detail) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  return `<!doctype html><meta charset="utf-8"><body style="font:14px/1.5 system-ui,sans-serif;color:#444;padding:2rem">
    <h2 style="margin:0 0 .5rem;font-size:1rem">${esc(heading)}</h2>
    <p style="margin:0;white-space:pre-wrap">${esc(detail)}</p></body>`;
}

export { wrapText } from '../utils/text-utils.js';
