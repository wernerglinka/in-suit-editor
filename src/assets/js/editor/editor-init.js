/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: MIT
 */

import {
  drafts,
  createNewDraft,
  performHousekeeping,
} from '../drafts/draft-manager.js';
import { initIdentity } from './identity.js';
import { initAIToggle } from '../ai/ai-toggle.js';
import { initSettingsFileHandler } from './settings-file-handler.js';
import { initAITranslator } from '../ai/ai-translator.js';

/**
 * Initializes the editor and sets up essential UI features.
 * @param {Object} ui - The UI elements.
 * @param {Function} loadDraft - Function to load a draft.
 * @param {Function} renderList - Function to render the draft list.
 * @param {Function} sync - Function to sync editor content.
 * @param {Object} tagEditor - The tag editor component instance.
 */
export async function initEditor(ui, loadDraft, renderList, sync, tagEditor) {
  initIdentity(ui);

  if (drafts.length === 0) {
    await createNewDraft(ui, loadDraft, renderList);
  } else {
    await loadDraft(localStorage.getItem('current-draft-id') || drafts[0].id);
  }

  initAIToggle(ui);
  initSettingsFileHandler(ui);
  await initAITranslator(ui, sync);
  if (ui.aiFeaturesToggle.checked) {
    const { initAIFeatures } = await import('../ai/ai-init.js');
    await initAIFeatures(ui, sync, tagEditor);
  }
  await performHousekeeping();
}
