/**
 * The editing-surface controller. The editor's main area shows one of two
 * views — the rendered **Page** or the **Page setup** form — and the two
 * toolbar buttons switch between them (they are a segmented control, not
 * independent hide-toggles). The **Drafts** sidebar toggles on its own,
 * alongside whichever main view is showing.
 *
 * The default is in-situ-first: a draft that has sections whose page can
 * render opens on the Page view, because for a content edit the page itself
 * is the least intimidating surface. Anything else — a new draft, a simple
 * Markdown page, or an unreachable render backend — opens on Page setup.
 * A view the user picks is persisted and wins over the default from then on;
 * the default itself is never persisted.
 */

import { probeRenderBackend } from './editor-logic.js';

/** Which main view is showing; persisted once the user chooses. */
const VIEW_KEY = 'editor-main-view'; // 'page' | 'setup'
/** Whether the drafts sidebar is hidden; persisted on toggle. */
const SIDEBAR_KEY = 'editor-hide-sidebar';

/** The render-backend probe, shared by the default decision. */
let backendProbe = null;

/** @return {Element|null} The editor's pane container. */
function container() {
  return document.querySelector('.editor-container');
}

/**
 * Shows one main view and hides the other, syncing the two buttons' pressed
 * state. `no-form` hides the form (Page view); `no-preview` hides the page
 * (Page setup view); exactly one is ever set.
 * @param {'page'|'setup'} view - The view to show.
 * @param {boolean} persist - Whether to record this as the user's choice.
 */
function applyView(view, persist) {
  const c = container();
  if (!c) {
    return;
  }
  const page = view === 'page';
  c.classList.toggle('no-form', page);
  c.classList.toggle('no-preview', !page);
  const setupBtn = document.getElementById('toggle-form-btn');
  const pageBtn = document.getElementById('toggle-preview-btn');
  if (setupBtn) {
    setupBtn.setAttribute('aria-pressed', String(!page));
  }
  if (pageBtn) {
    pageBtn.setAttribute('aria-pressed', String(page));
  }
  if (persist) {
    localStorage.setItem(VIEW_KEY, view);
  }
}

/**
 * Shows or hides the drafts sidebar.
 * @param {boolean} hidden - Whether the sidebar should be hidden.
 * @param {boolean} persist - Whether to record the choice.
 */
function applySidebar(hidden, persist) {
  const c = container();
  if (!c) {
    return;
  }
  c.classList.toggle('no-sidebar', hidden);
  const btn = document.getElementById('toggle-sidebar-btn');
  if (btn) {
    btn.setAttribute('aria-pressed', String(!hidden));
  }
  if (persist) {
    localStorage.setItem(SIDEBAR_KEY, String(hidden));
  }
}

/**
 * Wires the toolbar controls: Drafts toggles the sidebar; Page setup and Page
 * switch the main view. Restores the saved sidebar state and the saved view
 * (a draft load may override the view via applyDefaultSurface).
 */
export function initEditingSurface() {
  if (!container()) {
    return;
  }
  backendProbe = probeRenderBackend();
  applySidebar(localStorage.getItem(SIDEBAR_KEY) === 'true', false);
  applyView(localStorage.getItem(VIEW_KEY) === 'page' ? 'page' : 'setup', false);

  const sidebarBtn = document.getElementById('toggle-sidebar-btn');
  if (sidebarBtn) {
    sidebarBtn.onclick = () => applySidebar(!container().classList.contains('no-sidebar'), true);
  }
  const setupBtn = document.getElementById('toggle-form-btn');
  if (setupBtn) {
    setupBtn.onclick = () => applyView('setup', true);
  }
  const pageBtn = document.getElementById('toggle-preview-btn');
  if (pageBtn) {
    pageBtn.onclick = () => applyView('page', true);
  }
}

/**
 * Applies the default view for a freshly loaded draft, unless the user has
 * already chosen one. Opens on the Page view for a sections draft whose page
 * can render; opens on Page setup for anything else.
 * @param {Object} draft - The loaded draft.
 * @return {Promise<void>}
 */
export async function applyDefaultSurface(draft) {
  if (!container() || localStorage.getItem(VIEW_KEY) !== null) {
    return;
  }
  const hasSections =
    draft && draft.bodyMode !== 'content' && Array.isArray(draft.sections) && draft.sections.length > 0;
  const backendUp = backendProbe ? await backendProbe : false;
  // The user may have picked a view (persisting a choice) while the probe was
  // in flight; their choice wins.
  if (localStorage.getItem(VIEW_KEY) !== null) {
    return;
  }
  applyView(hasSections && backendUp ? 'page' : 'setup', false);
}
