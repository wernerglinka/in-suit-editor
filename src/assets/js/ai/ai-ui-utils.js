/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: MIT
 */

import { customAlert } from '../utils/dialog-utils.js';

/**
 * Creates a monitor for model download progress.
 * @param {Object} ui - The UI elements.
 * @param {string} lang - The language code.
 * @param {string} modelName - The name of the model being downloaded.
 * @return {Object} The monitor object.
 */
export const getMonitor = (ui, lang, modelName) => ({
  monitor(m) {
    m.addEventListener('downloadprogress', (e) => {
      ui.aiStatus.style.display = 'flex';
      ui.aiDownloadProgress.value = e.loaded;
      ui.aiDownloadProgress.max = e.total;
      ui.aiStatusText.textContent = `Downloading ${modelName} (${lang}): ${Math.round((e.loaded / e.total) * 100)}%`;
      if (e.loaded === e.total) {
        setTimeout(() => {
          ui.aiStatus.style.display = 'none';
        }, 2000);
      }
    });
  },
});

/**
 * Executes an AI action with UI feedback (loading state).
 * @param {Object} ui - The UI elements.
 * @param {HTMLButtonElement} btn - The button that triggered the action.
 * @param {Function} actionFn - The asynchronous function containing the AI logic.
 * @param {Function} updateCallback - Callback for UI updates.
 * @return {Promise<void>}
 */
export async function runAIAction(ui, btn, actionFn, updateCallback) {
  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = '⏳';
  ui.activeAiStreams++;
  try {
    await actionFn();
  } catch (err) {
    console.error(err);
    customAlert(ui, 'AI Action failed.', err.message || String(err));
  } finally {
    ui.activeAiStreams--;
    btn.disabled = false;
    btn.textContent = oldText === '⏳' ? '✨' : oldText;
    if (typeof updateCallback === 'function') {
      updateCallback();
    }
  }
}

/**
 * Refreshes the visibility of AI features based on availability and enabled state.
 * @param {Object} ui - The UI elements.
 */
export function refreshAIVisibility(ui) {
  const aiEnabled = ui.aiFeaturesToggle.checked;
  const translateEnabled = ui.aiTranslateToggle.checked;
  const aiButtons = Array.from(document.querySelectorAll('.ai-button'));

  if (ui.aiWriterSection) {
    ui.aiWriterSection.style.display = aiEnabled ? 'block' : 'none';
  }
  if (ui.aiRewriterSection) {
    ui.aiRewriterSection.style.display = aiEnabled ? 'block' : 'none';
  }
  if (ui.aiClassifierSection) {
    ui.aiClassifierSection.style.display =
      aiEnabled && !ui.aiClassifierSection.hidden ? 'block' : 'none';
  }
  if (ui.aiTranslationSection) {
    ui.aiTranslationSection.style.display = translateEnabled ? 'block' : 'none';
  }
  if (!aiEnabled && ui.aiStatus) {
    ui.aiStatus.style.display = 'none';
  }

  aiButtons.forEach((btn) => {
    if (btn) {
      const isAvailable = btn.getAttribute('data-ai-available') === 'true';
      const isTranslateBtn =
        btn.classList.contains('translate-btn') ||
        btn.id === 'ai-translate-all-btn';
      const shouldShow =
        isAvailable && (isTranslateBtn ? translateEnabled : aiEnabled);
      btn.style.display = shouldShow ? 'flex' : 'none';
      if (btn.parentElement?.classList.contains('input-with-action')) {
        btn.parentElement.style.display = shouldShow ? 'flex' : 'block';
      }
    }
  });
}
