/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: MIT
 */

import { buildFrontmatter, generateMarkdown } from '../utils/markdown-utils.js';
// Cycle note: editing-surface imports probeRenderBackend from this module.
// Both uses are runtime-only (inside functions), so the cycle is harmless.
import { openSectionSettings } from './editing-surface.js';

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
  img[data-field-image] { cursor: pointer; }
  img[data-field-image]:hover { outline: 1px dashed rgba(80,120,255,.55); outline-offset: 3px; }
  .editor-section-toolbar {
    position: fixed; z-index: 2147483647; display: none;
    font: 12px/1 system-ui, sans-serif;
  }
  .editor-section-toolbar button {
    all: unset; cursor: pointer; padding: 5px 10px; border-radius: 999px;
    background: rgba(80,120,255,.92); color: #fff; font: inherit;
    box-shadow: 0 1px 4px rgba(0,0,0,.25);
  }
  .editor-section-toolbar button:hover { background: rgba(60,95,220,1); }
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
    // Items first: their containers scope matching most precisely, and the
    // section-level passes then skip everything the items claimed. The old
    // order let a section-level pass steal an item's element on sections that
    // hold text values they never render themselves (the slider).
    const claimed = [];
    annotateNestedArrays(wrap, section, '', claimed);
    annotateSectionFields(wrap, section, claimed);
    annotateSectionValues(wrap, section, claimed);
  });
}

/**
 * Finds the shallowest match for a selector under `wrap`. A section's own
 * field (e.g. its `.title`) sits closer to the wrapper than the same class
 * inside nested items (a slide's `.title`), so DOM depth disambiguates where
 * document order (querySelector's first match) would pick the wrong one.
 * Already-tagged elements and anything inside `exclude` containers (the
 * matched item containers) belong to someone else and are never returned.
 * @param {Element} wrap - The rendered section wrapper.
 * @param {string} selector - The field's class selector.
 * @param {Element[]} [exclude] - Containers whose contents are off-limits.
 * @return {Element|null} The shallowest matching element, or null.
 */
function shallowestIn(wrap, selector, exclude = []) {
  let best = null;
  let bestDepth = Infinity;
  for (const el of wrap.querySelectorAll(selector)) {
    if (el.dataset.field || exclude.some((c) => c.contains(el))) {
      continue;
    }
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

/** Tags the shallowest eligible element under `wrap` with a field path. */
function tagField(wrap, selector, path, isMarkdown, exclude) {
  const el = shallowestIn(wrap, selector, exclude);
  if (el) {
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
 * @param {Element[]} claimed - The item containers already matched, whose
 *   contents are the items', not the section's.
 */
function annotateSectionFields(wrap, section, claimed) {
  const text = section.text;
  if (text && typeof text === 'object') {
    if (text.leadIn) {
      tagField(wrap, '.lead-in', 'text.leadIn', false, claimed);
    }
    if (text.title) {
      tagField(wrap, '.title', 'text.title', false, claimed);
    }
    if (text.subTitle) {
      tagField(wrap, '.sub-title', 'text.subTitle', false, claimed);
    }
    if (text.prose) {
      tagField(wrap, '.prose', 'text.prose', true, claimed);
    }
  }
  if (section.image && section.image.caption) {
    tagField(wrap, '.caption', 'image.caption', false, claimed);
  }
  if (Array.isArray(section.ctas)) {
    annotateCtas(wrap, section.ctas, 'ctas', claimed);
  }
}

/**
 * Tags the rendered cta anchors under `scope` with their labels' field paths.
 * Only ctas with a url render, in order; each anchor is mapped back to its
 * true index in the ctas array (the form's index). Scoped to the shallowest
 * eligible `.ctas` block so anchors in nested items aren't mapped to outer
 * paths.
 * @param {Element} scope - The rendered scope owning the ctas block.
 * @param {Object[]} ctasArr - The ctas array from the draft values.
 * @param {string} arrayPath - The ctas array's field path (e.g. "ctas",
 *   "slides.2.ctas").
 * @param {Element[]} [exclude] - Containers whose ctas blocks are not this
 *   scope's (the matched item containers, on the section-level call).
 */
function annotateCtas(scope, ctasArr, arrayPath, exclude) {
  const validIndexes = ctasArr.map((c, idx) => (c && c.url ? idx : -1)).filter((idx) => idx >= 0);
  const ctasBlock = shallowestIn(scope, '.ctas', exclude);
  const anchors = ctasBlock ? ctasBlock.querySelectorAll('a') : [];
  anchors.forEach((a, n) => {
    if (n < validIndexes.length) {
      wrapCtaLabel(a, `${arrayPath}.${validIndexes[n]}.label`);
    }
  });
}

/**
 * Extends inline annotation into a section's repeatable items (slides, cards,
 * stats/steps items…). Walks the section values for arrays of objects —
 * including arrays nested in groups, like `stats.items` — matches each array
 * to its rendered per-item containers, and tags the items' fields. Data-driven
 * lists (blurbs, pricing tiers…) live in data files, not the section, so they
 * are naturally absent from this walk and stay read-only.
 * @param {Element} scope - The rendered scope to search within.
 * @param {Object} obj - The draft values at this scope (section or item).
 * @param {string} base - The field-path prefix ('' at the section root).
 */
function annotateNestedArrays(scope, obj, base, claimed) {
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'ctas') {
      continue; // handled by annotateCtas
    }
    const path = base ? `${base}.${key}` : key;
    if (Array.isArray(value)) {
      if (!value.length || !value.every((v) => v && typeof v === 'object' && !Array.isArray(v))) {
        continue;
      }
      const containers = matchItemContainers(scope, value);
      if (containers) {
        claimed.push(...containers);
      }
      value.forEach((item, i) => {
        // Without per-item containers (markup we can't match generically, e.g.
        // a column's blocks rendered without wrappers), fall back to tagging by
        // value in the enclosing scope; the uniqueness guard keeps it honest.
        const itemScope = containers ? containers[i] : scope;
        annotateItemFields(itemScope, item, `${path}.${i}`, Boolean(containers));
        annotateNestedArrays(itemScope, item, `${path}.${i}`, claimed);
      });
    } else if (value && typeof value === 'object') {
      annotateNestedArrays(scope, value, path, claimed);
    }
  }
}

/**
 * Finds the rendered per-item containers for an array of items: an element
 * whose children repeat (same count, same tag) and whose children's text
 * matches the items' own values, in order. Verification by content is what
 * disambiguates the real item list from look-alikes (a slider's pagination,
 * a hero slider's nav — same count, but little of the items' text). Returns
 * null when no candidate verifies or the best candidates are ambiguous:
 * skipping is always preferred over mis-tagging.
 * @param {Element} scope - The rendered scope to search within.
 * @param {Object[]} items - The array items from the draft values.
 * @return {Element[]|null} The per-item container elements, in item order.
 */
function matchItemContainers(scope, items) {
  // Verify against the strings that actually rendered somewhere under the
  // scope: each candidate child must hold the majority of its item's rendered
  // strings, or the "container" is just an element that happens to hold one
  // of them (a lone block's prose div) and would scope later tagging wrongly.
  const scopeText = scope.textContent;
  const findable = items.map((item) => collectItemStrings(item).filter((s) => scopeText.includes(s)));
  if (!findable.some((list) => list.length)) {
    return null;
  }
  let bestScore = 0;
  let best = [];
  for (const el of [scope, ...scope.querySelectorAll('*')]) {
    const kids = Array.from(el.children);
    if (kids.length !== items.length || !kids.every((k) => k.tagName === kids[0].tagName)) {
      continue;
    }
    let score = 0;
    let majorityInEveryItem = true;
    kids.forEach((kid, i) => {
      if (!findable[i].length) {
        return;
      }
      const text = kid.textContent;
      const contained = findable[i].filter((s) => text.includes(s)).length;
      score += contained;
      if (contained * 2 <= findable[i].length) {
        majorityInEveryItem = false;
      }
    });
    if (!majorityInEveryItem || score === 0) {
      continue;
    }
    if (score > bestScore) {
      bestScore = score;
      best = [el];
    } else if (score === bestScore) {
      best.push(el);
    }
  }
  if (!best.length) {
    return null;
  }
  // Equal-scoring candidates are fine if they nest (common when the array has
  // one item, so every ancestor with a single child matches): the outermost
  // scopes widest and its guards still hold. Disjoint ties are ambiguous.
  const outer = best.find((c) => best.every((o) => o === c || c.contains(o)));
  return outer ? Array.from(outer.children) : null;
}

/**
 * The item's own single-line text values, for verifying container candidates
 * by content. Walks nested groups and arrays; non-text values (urls, icon
 * names, classes) simply never match rendered text, so they cost nothing.
 * @param {Object} item - The array item from the draft values.
 * @return {string[]} The item's non-empty single-line strings.
 */
function collectItemStrings(item) {
  const out = [];
  (function walk(value) {
    if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(walk);
    } else if ((typeof value === 'string' || typeof value === 'number') && String(value).trim()) {
      const s = String(value).trim();
      if (!s.includes('\n')) {
        out.push(s);
      }
    }
  })(item);
  return out;
}

/**
 * Collects what a values object offers for annotation, walking nested groups
 * but stopping at arrays (those are annotateNestedArrays' job). Prose and
 * ctas are listed separately: their rendering differs from their source, so
 * they can't be matched by value.
 * @param {Object} obj - The values object (a section or an array item).
 * @param {string} base - The object's field-path prefix ('' for a section).
 * @return {{leaves: Array<{path: string, value: string}>, proseLeaves:
 *   string[], ctaArrays: Array<{path: string, value: Object[]}>}}
 */
function collectAnnotatable(obj, base) {
  const leaves = [];
  const proseLeaves = [];
  const ctaArrays = [];
  const imageLeaves = [];
  (function walk(o, prefix) {
    for (const [key, value] of Object.entries(o)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(value)) {
        if (key === 'ctas') {
          ctaArrays.push({ path, value });
        }
        continue;
      }
      if (value && typeof value === 'object') {
        walk(value, path);
      } else if (key === 'prose') {
        if (typeof value === 'string' && value.trim()) {
          proseLeaves.push(path);
        }
      } else if (key === 'src') {
        // An image group's src; matched against rendered <img> elements
        // rather than text. (A video's provider name never matches one.)
        if (typeof value === 'string' && value.trim()) {
          imageLeaves.push({ path, value: value.trim() });
        }
      } else if ((typeof value === 'string' || typeof value === 'number') && !String(value).includes('\n')) {
        const trimmed = String(value).trim();
        if (trimmed) {
          leaves.push({ path, value: trimmed });
        }
      }
    }
  })(obj, base);
  return { leaves, proseLeaves, ctaArrays, imageLeaves };
}

/**
 * Value-tags a set of collected leaves, dropping any value two leaves share:
 * when an object holds the same string twice (an icon name equal to a label,
 * a title reused as the subtitle) the rendered text can't say which field it
 * belongs to, and a wrong tag is worse than none.
 * @param {Element} scope - The rendered scope to search within.
 * @param {Array<{path: string, value: string}>} leaves - The collected leaves.
 * @param {Element[]} [exclude] - Containers whose contents are off-limits.
 */
function tagLeavesByValue(scope, leaves, exclude) {
  const counts = new Map();
  for (const leaf of leaves) {
    counts.set(leaf.value, (counts.get(leaf.value) || 0) + 1);
  }
  for (const leaf of leaves) {
    if (counts.get(leaf.value) === 1) {
      valueTagField(scope, leaf.path, leaf.value, exclude);
    }
  }
}

/**
 * Tags an item's fields inside its rendered container. Plain strings are
 * matched by value — the element whose text equals the field's value — which
 * needs no knowledge of the component's class names, so custom markup
 * (stat values, step titles, timeline years) works the same as the shared
 * text partial. Prose and ctas can't value-match (rendered HTML differs from
 * the source), so they use the partials' classes, guarded to exactly one
 * candidate each; with two (a flip card's front and back) we skip rather
 * than guess.
 * @param {Element} scope - The item's rendered container.
 * @param {Object} item - The array item from the draft values.
 * @param {string} base - The item's field path (e.g. "slides.2").
 * @param {boolean} hasContainer - Whether `scope` is the item's own container
 *   (false in fallback mode, where class-based tagging would hit the wrong
 *   block).
 */
function annotateItemFields(scope, item, base, hasContainer) {
  const { leaves, proseLeaves, ctaArrays, imageLeaves } = collectAnnotatable(item, base);
  tagLeavesByValue(scope, leaves);
  tagImagesByValue(scope, imageLeaves);

  if (!hasContainer) {
    return;
  }
  if (ctaArrays.length === 1 && scope.querySelectorAll('.ctas').length === 1) {
    annotateCtas(scope, ctaArrays[0].value, ctaArrays[0].path);
  }
  if (proseLeaves.length === 1) {
    const prose = scope.querySelectorAll('.prose');
    if (prose.length === 1 && !prose[0].dataset.field) {
      prose[0].dataset.field = proseLeaves[0];
      prose[0].dataset.fieldMarkdown = 'true';
    }
  }
}

/**
 * Value-tags the section's own remaining fields — the ones the class-based
 * pass has no selector for, because the component renders them with its own
 * markup (a testimonial's quotee, an image-compare's labels). Runs last:
 * everything the items and the class pass claimed is already tagged or
 * excluded, so only genuinely section-owned text can match.
 * @param {Element} wrap - The rendered section wrapper.
 * @param {Object} section - The draft section values.
 * @param {Element[]} claimed - The matched item containers.
 */
function annotateSectionValues(wrap, section, claimed) {
  const { leaves, imageLeaves } = collectAnnotatable(section, '');
  tagLeavesByValue(wrap, leaves, claimed);
  tagImagesByValue(wrap, imageLeaves, claimed);
}

/**
 * Tags rendered images with their `src` field's path (data-field-image), by
 * matching the stored value's filename against each <img>'s src. The same
 * never-guess rules as text: a filename two fields share tags nothing, and
 * only a unique match tags. Clicking a tagged image opens its form field's
 * image picker (see wireInlineEditing).
 * @param {Element} scope - The rendered scope to search within.
 * @param {Array<{path: string, value: string}>} imageLeaves - The collected
 *   src leaves.
 * @param {Element[]} [exclude] - Containers whose contents are off-limits.
 */
function tagImagesByValue(scope, imageLeaves, exclude = []) {
  const basename = (v) => v.split('/').pop();
  const counts = new Map();
  for (const leaf of imageLeaves) {
    counts.set(basename(leaf.value), (counts.get(basename(leaf.value)) || 0) + 1);
  }
  for (const leaf of imageLeaves) {
    const name = basename(leaf.value);
    if (!name || counts.get(name) !== 1) {
      continue;
    }
    const matches = Array.from(scope.querySelectorAll('img')).filter((img) => {
      if (img.dataset.fieldImage || exclude.some((c) => c.contains(img))) {
        return false;
      }
      return basename(img.getAttribute('src') || '') === name;
    });
    if (matches.length === 1) {
      matches[0].dataset.fieldImage = leaf.path;
    }
  }
}

/**
 * Tags the element whose rendered text equals a field's value. Only an
 * unambiguous match is tagged: the innermost matching element, and only if
 * there is exactly one (two stats sharing a value, or a title equal to a cta
 * label, tag nothing). Interactive elements (a tab's button label) and
 * non-HTML content (svg) are never tagged.
 * @param {Element} scope - The rendered scope to search within.
 * @param {string} path - The field path to tag with.
 * @param {string} value - The field's trimmed value.
 * @param {Element[]} [exclude] - Containers whose contents are off-limits.
 */
function valueTagField(scope, path, value, exclude = []) {
  if (!value) {
    return;
  }
  const matches = [];
  for (const el of scope.querySelectorAll('*')) {
    if (el.dataset && el.dataset.field) {
      continue;
    }
    if (exclude.some((c) => c.contains(el))) {
      continue;
    }
    if (el.textContent.trim() === value) {
      matches.push(el);
    }
  }
  const innermost = matches.filter((m) => !matches.some((o) => o !== m && m.contains(o)));
  if (innermost.length !== 1) {
    return;
  }
  const el = innermost[0];
  if (
    el.namespaceURI !== 'http://www.w3.org/1999/xhtml' ||
    el.closest('button, summary, select, input, textarea') ||
    el.querySelector('[data-field]')
  ) {
    return;
  }
  el.dataset.field = path;
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

  for (const el of doc.querySelectorAll('[data-field-image]')) {
    el.title = 'Click to choose a replacement image';
    el.addEventListener('click', () => openImagePicker(el));
  }

  wireSectionToolbar(doc);
}

/**
 * A floating per-section toolbar in the preview frame: hovering a section
 * shows an "Section settings" button at its top-right corner, which switches
 * to Page setup opened at that section's card — the bridge to everything
 * inline editing can't express (structure, empty fields, images without a
 * unique match). One toolbar element serves all sections, repositioned on
 * hover; it lives in the frame's body so it scrolls with the content.
 * @param {Document} doc - The preview frame's document.
 */
function wireSectionToolbar(doc) {
  if (!doc.querySelector('[data-section-index]')) {
    return;
  }
  const toolbar = doc.createElement('div');
  toolbar.className = 'editor-section-toolbar';
  const btn = doc.createElement('button');
  btn.type = 'button';
  btn.textContent = '⚙ Section settings';
  toolbar.append(btn);
  doc.body.append(toolbar);

  let current = null;
  btn.addEventListener('click', () => {
    if (current) {
      openSectionSettings(current.dataset.sectionIndex);
    }
  });

  // Fixed-position at the hovered section's top-right, clamped below the
  // site's sticky header and into the viewport, so the button stays reachable
  // on a tall section and never hides under the header.
  const position = () => {
    if (!current) {
      return;
    }
    const rect = current.getBoundingClientRect();
    const viewH = doc.documentElement.clientHeight;
    // The site banner floats over content when fixed/sticky; keep the button
    // below it. A header that scrolls away needs no clamp.
    const header = doc.querySelector('header');
    const floating = header && /fixed|sticky/.test(doc.defaultView.getComputedStyle(header).position);
    const minTop = floating ? Math.max(8, header.getBoundingClientRect().bottom + 8) : 8;
    if (rect.bottom < minTop + 8 || rect.top > viewH - 8) {
      toolbar.style.display = 'none';
      return;
    }
    toolbar.style.display = 'block';
    toolbar.style.top = `${Math.min(Math.max(rect.top + 8, minTop), viewH - 40)}px`;
    toolbar.style.right = `${Math.max(8, doc.documentElement.clientWidth - rect.right + 8)}px`;
  };

  doc.addEventListener('scroll', position, { passive: true });
  doc.addEventListener('mouseover', (e) => {
    if (toolbar.contains(e.target)) {
      return; // hovering the toolbar itself keeps it where it is
    }
    const wrap = e.target.closest && e.target.closest('[data-section-index]');
    if (!wrap) {
      current = null;
      toolbar.style.display = 'none';
      return;
    }
    if (wrap === current) {
      return;
    }
    current = wrap;
    position();
  });
}

/**
 * Finds the form control that backs a preview element, matching on the
 * section index (nearest data-section-index ancestor) and the field path.
 * @param {Element} el - The edited element in the preview frame.
 * @param {string} [attr] - The attribute carrying the field path.
 * @return {HTMLElement|null} The form input/textarea, or null if not found.
 */
function formControlFor(el, attr = 'data-field') {
  const wrap = el.closest('[data-section-index]');
  if (!wrap) {
    return null;
  }
  const index = wrap.getAttribute('data-section-index');
  const path = el.getAttribute(attr);
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
 * Opens the image picker for a rendered image by triggering its form field's
 * Choose-image button. The picker stores the processed file's name through
 * the field's own handler, so the edit flows through the usual pipeline.
 * @param {Element} el - The clicked image in the preview frame.
 */
function openImagePicker(el) {
  const input = formControlFor(el, 'data-field-image');
  const group = input && input.closest('.section-image-field');
  const chooseBtn = group && group.querySelector('.section-image-picker button');
  if (chooseBtn) {
    chooseBtn.click();
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
