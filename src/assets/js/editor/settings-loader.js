/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: MIT
 */

import { refreshAIVisibility } from '../ai/ai-toggle.js';

/**
 * Applies a settings object to the application state.
 * @param {Object} settings - The settings object.
 * @param {Object} ui - The UI elements.
 * @return {Promise<void>}
 */
export async function applySettings(settings, ui) {
  const toggles = {
    'ai-features-enabled': 'aiFeaturesToggle',
    'ai-only-existing-tags': 'aiOnlyExistingTagsToggle',
  };
  Object.entries(toggles).forEach(([key, uiKey]) => {
    if (settings[key] !== undefined) {
      localStorage.setItem(key, settings[key]);
      ui[uiKey].checked = settings[key];
    }
  });

  refreshAIVisibility(ui);

  if (ui.aiFeaturesToggle.checked) {
    const { initAIFeatures } = await import('../ai/ai-init.js');
    const { sync } = await import('./create-post.js');
    const { renderPills } = await import('./tag-editor.js');
    await initAIFeatures(ui, sync, { renderPills });
    window.dispatchEvent(
      new CustomEvent('ai-features-toggled', { detail: true }),
    );
  }
}
