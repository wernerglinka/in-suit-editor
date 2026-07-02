/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: MIT
 */

import { ui } from './ui-elements.js';
import { drafts, createNewDraft } from '../drafts/draft-manager.js';
import { updatePreview, probeRenderBackend, RENDER_BACKEND_HINT, IS_LOCAL_DEV } from './editor-logic.js';
import { handleFiles } from './image-handler.js';
import { initPasteHandler } from './paste-handler.js';
import { initTagEditor } from './tag-editor.js';
import { debounce } from '../utils/debounce.js';
import { openAndLoadDraft } from '../drafts/load-draft.js';
import { openFromSite } from '../drafts/open-from-site.js';
import { initEditorActions } from './editor-actions.js';
import { initEditor } from './editor-init.js';
import { initSectionBuilder } from './section-builder.js';
import { initEditingSurface } from './editing-surface.js';
import { attachMarkdownOverlay } from './markdown-overlay.js';
import { sync, renderList, loadDraft, applyPageType, applyBodyMode } from './editor-ui.js';

/**
 * Debounced version of updatePreview to prevent excessive re-renders.
 */
const debouncedPreview = debounce((id, ui) => updatePreview(id, drafts, ui), 300);

/**
 * Synchronizes the current draft data with the UI and updates the preview.
 */
const doSync = () => sync(ui, debouncedPreview, () => renderList(ui, doLoadDraft));
window.sync = doSync;

/**
 * Loads a draft by ID and refreshes the draft list.
 * @param {string} id - The draft ID.
 */
const doLoadDraft = (id) => {
  // Drop any pending preview for the outgoing draft: it captured the old id
  // and would re-render (and annotate) the old draft over the new one.
  debouncedPreview.cancel();
  return loadDraft(id, ui, () => renderList(ui, doLoadDraft), tagEditor);
};

/**
 * The tag editor component instance.
 */
const tagEditor = initTagEditor(ui, doSync);

ui.titleInput.oninput = () => {
  doSync();
  applyPageType(ui); // keep the destination hint in step with the slug
};
ui.descInput.oninput = doSync;
ui.dateInput.oninput = doSync;
if (ui.authorsSelect) {
  ui.authorsSelect.onchange = doSync;
}
for (const radio of ui.pageTypeRadios || []) {
  radio.onchange = () => {
    applyPageType(ui);
    doSync();
  };
}
if (ui.bodyModeToggle) {
  ui.bodyModeToggle.onchange = () => {
    applyBodyMode(ui);
    doSync();
  };
}
if (ui.hasHeroToggle) {
  ui.hasHeroToggle.onchange = doSync;
}
// Page meta fields all feed the same sync; the dismissible toggle is a change.
for (const el of [
  ui.socialImageInput,
  ui.canonicalUrlInput,
  ui.bodyClassesInput,
  ui.topMessageTextInput,
  ui.topMessageLinkUrlInput,
  ui.topMessageLinkLabelInput
]) {
  if (el) {
    el.oninput = doSync;
  }
}
if (ui.topMessageDismissibleToggle) {
  ui.topMessageDismissibleToggle.onchange = doSync;
}
if (ui.showInMenuToggle) {
  ui.showInMenuToggle.onchange = () => {
    applyPageType(ui); // reveal/hide the menu label + order
    doSync();
  };
  ui.navLabelInput.oninput = doSync;
  ui.navIndexInput.oninput = doSync;
}
if (ui.contentInput) {
  ui.contentInput.oninput = doSync;
  attachMarkdownOverlay(ui.contentInput, 'Page content');
}
window.addEventListener('classifier-updated', doSync);

ui.newDraftBtn.onclick = () => createNewDraft(ui, doLoadDraft, () => renderList(ui, doLoadDraft));
ui.loadDraftBtn.onclick = () => openAndLoadDraft(ui, doLoadDraft, () => renderList(ui, doLoadDraft));
if (ui.openSiteBtn) {
  ui.openSiteBtn.onclick = () => openFromSite(ui, doLoadDraft, () => renderList(ui, doLoadDraft));
}

initEditingSurface();

/**
 * Switches the preview pane between the rendered iframe and the YAML view.
 * The choice is remembered per browser. YAML stays useful as a debugging view
 * and as the fallback when the render endpoint is unreachable.
 */
function initPreviewModeToggle() {
  const { previewFrame, previewContent, previewModeRenderedBtn, previewModeYamlBtn } = ui;
  if (!previewFrame || !previewContent || !previewModeRenderedBtn || !previewModeYamlBtn) {
    return;
  }
  const apply = (mode, persist = true) => {
    const rendered = mode !== 'yaml';
    previewFrame.hidden = !rendered;
    previewContent.hidden = rendered;
    previewModeRenderedBtn.classList.toggle('is-active', rendered);
    previewModeYamlBtn.classList.toggle('is-active', !rendered);
    previewModeRenderedBtn.setAttribute('aria-pressed', String(rendered));
    previewModeYamlBtn.setAttribute('aria-pressed', String(!rendered));
    if (persist) {
      localStorage.setItem('editor-preview-mode', mode);
    }
  };
  // Guard the click with aria-disabled rather than the disabled attribute:
  // Chrome suppresses hover (and the title tooltip) on truly disabled buttons,
  // and this editor is Chrome-only, so the hint would never show.
  previewModeRenderedBtn.onclick = () => {
    if (previewModeRenderedBtn.getAttribute('aria-disabled') !== 'true') {
      apply('rendered');
    }
  };
  previewModeYamlBtn.onclick = () => apply('yaml');
  apply(localStorage.getItem('editor-preview-mode') === 'yaml' ? 'yaml' : 'rendered');

  // The rendered view needs the render backend, which only `netlify dev` serves
  // locally. Disabling the toggle with a "run netlify dev" hint only makes sense
  // for a developer, so gate it to localhost: on the deployed site the backend
  // is served by Netlify, an absent probe is more likely a transient blip than a
  // real outage, and a content editor cannot act on the hint anyway. In
  // production we leave Rendered enabled and let the plain-language in-frame
  // notice handle a genuine failure. Probe keeps the toggle hoverable (no
  // disabled attribute) so the hint shows in Chrome, and falls back to YAML
  // without overwriting the saved preference.
  if (IS_LOCAL_DEV) {
    probeRenderBackend().then((available) => {
      if (available) {
        return;
      }
      previewModeRenderedBtn.classList.add('is-disabled');
      previewModeRenderedBtn.setAttribute('aria-disabled', 'true');
      previewModeRenderedBtn.title = RENDER_BACKEND_HINT;
      apply('yaml', false);
    });
  }
}
initPreviewModeToggle();

initEditorActions(ui);
// Legacy body-textarea paths: only wire them if the markup still has the
// drop zone / upload button (removed when the section builder replaced
// the markdown body editor).
if (ui.dropZone && ui.contentInput) {
  initPasteHandler(ui, drafts, tagEditor, doSync);
}
if (ui.uploadBtn && ui.fileInput) {
  ui.uploadBtn.onclick = () => ui.fileInput.click();
  ui.fileInput.onchange = () =>
    handleFiles(ui.fileInput.files, localStorage.getItem('current-draft-id'), drafts, ui, doSync);
}

initSectionBuilder(ui, doSync);

initEditor(ui, doLoadDraft, () => renderList(ui, doLoadDraft), doSync, tagEditor);

export { doLoadDraft as loadDraft, renderList, doSync as sync, tagEditor };
