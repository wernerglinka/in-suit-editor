/**
 * The editing-surface controller. The editor has three panes — the drafts
 * sidebar, the page-setup form column, and the rendered page — and this
 * module owns which of them show.
 *
 * The default is in-situ-first: a draft that has sections opens as the
 * rendered page with the form column closed, because for a content edit the
 * page itself is the least intimidating surface. The form column is the
 * structural/metadata surface ("Page setup") and stays the default for a
 * draft with nothing to render (a new draft, or a simple Markdown page).
 * A toggle the user clicks is persisted and wins over the default from then
 * on; the default itself is never persisted.
 *
 * When the render backend is unreachable the page pane can't render, so the
 * default never closes the form; the editor behaves exactly as it did before
 * in-situ-first.
 */

import { probeRenderBackend } from './editor-logic.js';

/** One entry per collapsible pane: its toggle button, the container class
 * that hides it, and the localStorage key holding the user's explicit choice. */
const PANES = [
  { id: 'toggle-sidebar-btn', cls: 'no-sidebar', key: 'editor-hide-sidebar' },
  { id: 'toggle-form-btn', cls: 'no-form', key: 'editor-hide-form' },
  { id: 'toggle-preview-btn', cls: 'no-preview', key: 'editor-hide-preview' }
];

/** The render-backend probe, shared by every default decision. */
let backendProbe = null;

/** @return {Element|null} The editor's pane container. */
function container() {
  return document.querySelector('.editor-container');
}

/**
 * Shows or hides a pane, keeping the toggle button's pressed state in step.
 * @param {Object} pane - A PANES entry.
 * @param {boolean} hidden - Whether the pane should be hidden.
 * @param {boolean} persist - Whether to record this as the user's choice.
 */
function setPane(pane, hidden, persist) {
  const c = container();
  if (!c) {
    return;
  }
  c.classList.toggle(pane.cls, hidden);
  const btn = document.getElementById(pane.id);
  if (btn) {
    btn.setAttribute('aria-pressed', String(!hidden));
  }
  if (persist) {
    localStorage.setItem(pane.key, String(hidden));
  }
}

/** @param {Object} pane - A PANES entry. @return {boolean} Whether it is hidden. */
function isHidden(pane) {
  const c = container();
  return Boolean(c && c.classList.contains(pane.cls));
}

/**
 * Wires the pane toggles. Restores each pane from the user's saved choice,
 * and guards the form/page pair so the two can never both be closed (the
 * editor would be empty): closing one while the other is closed reopens the
 * other.
 */
export function initEditingSurface() {
  if (!container()) {
    return;
  }
  backendProbe = probeRenderBackend();

  const form = PANES[1];
  const page = PANES[2];
  for (const pane of PANES) {
    setPane(pane, localStorage.getItem(pane.key) === 'true', false);
    const btn = document.getElementById(pane.id);
    if (!btn) {
      continue;
    }
    btn.onclick = () => {
      const hiding = !isHidden(pane);
      setPane(pane, hiding, true);
      // Never leave both main panes closed.
      if (hiding && pane === form && isHidden(page)) {
        setPane(page, false, true);
      }
      if (hiding && pane === page && isHidden(form)) {
        setPane(form, false, true);
      }
    };
  }
  // A saved state could have both closed (older versions persisted the panes
  // independently); reopen the form so the editor is never empty.
  if (isHidden(form) && isHidden(page)) {
    setPane(form, false, false);
  }
}

/**
 * Applies the default surface for a freshly loaded draft. Respects an
 * explicit user choice for the form pane; otherwise closes the form for a
 * sections draft whose page can actually render, and opens it for anything
 * else (new draft, simple Markdown page, backend unreachable).
 * @param {Object} draft - The loaded draft.
 * @return {Promise<void>}
 */
export async function applyDefaultSurface(draft) {
  if (!container() || localStorage.getItem('editor-hide-form') !== null) {
    return;
  }
  const form = PANES[1];
  const page = PANES[2];
  const hasSections =
    draft && draft.bodyMode !== 'content' && Array.isArray(draft.sections) && draft.sections.length > 0;
  const backendUp = backendProbe ? await backendProbe : false;
  // The user may have toggled (persisting a choice) while the probe was
  // in flight; their choice wins.
  if (localStorage.getItem('editor-hide-form') !== null) {
    return;
  }
  setPane(form, hasSections && backendUp && !isHidden(page), false);
}
