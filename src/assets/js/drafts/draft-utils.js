/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: MIT
 */

/**
 * Gathers translations from the UI and updates the draft.
 * @param {Object} draft - The draft to update.
 * @param {Object} ui - The UI elements.
 */
export function updateDraftTranslations(draft, ui) {
  if (!ui.aiTranslationsContainer) {return;}
  // The translation panels are only authoritative while they are live: without
  // the Translator API, or with the translate toggle off, the container is
  // empty by design and reading it back would wipe the draft's saved
  // translations.
  if (!('Translator' in self)) {return;}
  if (!ui.aiTranslateToggle || !ui.aiTranslateToggle.checked) {return;}

  const existing = draft.translations || {};
  const next = {};
  const slug = ui.getSlug(ui.titleInput.value);
  ui.aiTranslationsContainer
    .querySelectorAll('details[data-locale]')
    .forEach((details) => {
      const locale = details.getAttribute('data-locale');
      const el = details.querySelector('.translation-markdown');
      if (!el) {return;}

      const title =
        details.querySelector('.translation-title')?.value.trim() || '';
      const description =
        details.querySelector('.translation-description')?.value.trim() || '';
      const tags =
        details.querySelector('.translation-tags-hidden')?.value.trim() || '';

      if (el.value.trim() || title) {
        const localizedPath = `content/${locale}/blog/${slug}/${slug}.md`;
        next[locale] = {
          title,
          description,
          tags,
          content: el.value.trim(),
          path: localizedPath,
        };
      } else if (existing[locale]) {
        // An enabled locale whose panel is still empty (translation pending or
        // UI freshly rebuilt): keep what the draft already holds.
        next[locale] = existing[locale];
      }
    });
  // Locales with no panel were explicitly unchecked; they drop out here.
  draft.translations = next;
}
