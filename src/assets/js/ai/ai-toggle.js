/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: MIT
 */

import { refreshAIVisibility } from './ai-ui-utils.js';

/**
 * Triggers the initialization of AI features.
 * @param {Object} ui - The UI elements.
 * @return {Promise<void>}
 */
const triggerAIInit = async (ui) => {
  const { initAIFeatures } = await import('./ai-init.js');
  const { sync } = await import('../editor/create-post.js');
  const { renderPills } = await import('../editor/tag-editor.js');
  await initAIFeatures(ui, sync, { renderPills });
};

/**
 * Initializes the AI toggle and related settings.
 * @param {Object} ui - The UI elements.
 */
export function initAIToggle(ui) {
  ui.aiFeaturesToggle.checked =
    localStorage.getItem('ai-features-enabled') === 'true';
  ui.aiOnlyExistingTagsToggle.checked =
    localStorage.getItem('ai-only-existing-tags') === 'true';
  refreshAIVisibility(ui);

  ui.aiFeaturesToggle.addEventListener('change', async () => {
    localStorage.setItem('ai-features-enabled', ui.aiFeaturesToggle.checked);
    if (ui.aiFeaturesToggle.checked) {
      await triggerAIInit(ui);
    }
    refreshAIVisibility(ui);
    window.dispatchEvent(
      new CustomEvent('ai-features-toggled', {
        detail: ui.aiFeaturesToggle.checked,
      }),
    );
  });

  ui.aiOnlyExistingTagsToggle.addEventListener('change', () => {
    localStorage.setItem(
      'ai-only-existing-tags',
      ui.aiOnlyExistingTagsToggle.checked,
    );
  });
}

export { refreshAIVisibility };
