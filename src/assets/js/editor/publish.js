/**
 * Browser-side publish. Calls /.netlify/functions/publish with the
 * signed-in user's Netlify Identity JWT; the function holds the
 * server-side GitHub PAT and decides what the user is allowed to do.
 */

import { generateMarkdown } from '../utils/markdown-utils.js';
import { customAlert } from '../utils/dialog-utils.js';
import { getImage } from '../utils/db-storage.js';
import { bufferToBase64 } from '../utils/base64-utils.js';
import { accessToken, currentUser, userRoles } from './identity.js';
import { ensureAllTranslationsReady } from '../ai/ai-translator.js';

/**
 * @param {Object} ui - UI element references.
 * @param {Object} draft - The active draft object.
 * @param {'pr'|'direct'} mode - Publish mode.
 */
export async function publish(ui, draft, mode) {
  if (!currentUser()) {
    customAlert(ui, 'Please sign in first.');
    return;
  }
  if (mode === 'direct' && !userRoles().includes('admin')) {
    customAlert(ui, 'Direct publish requires admin role.');
    return;
  }

  const btn = mode === 'direct' ? ui.publishDirectBtn : ui.publishPrBtn;
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = mode === 'direct' ? '⏳ Publishing...' : '⏳ Creating PR...';

  try {
    const { sync } = await import('./create-post.js');
    await ensureAllTranslationsReady(ui, sync);

    const slug = ui.getSlug(ui.titleInput.value);
    const classifierResults = window.getSelectedClassifierResults
      ? window.getSelectedClassifierResults()
      : [];
    const markdown = generateMarkdown(
      draft,
      ui.titleInput.value,
      ui.descInput.value,
      ui.dateInput.value,
      ui.tagsInput.value,
      ui.contentInput.value,
      classifierResults,
    );

    const images = [];
    for (const img of draft.imageFiles || []) {
      const data = await getImage(img.id);
      if (!data) continue;
      images.push({ name: img.name, base64: await bufferToBase64(data) });
    }

    const res = await fetch('/.netlify/functions/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken()}`,
      },
      body: JSON.stringify({ mode, slug, markdown, images }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `${res.status} ${res.statusText}`);
    }

    customAlert(
      ui,
      mode === 'pr' ? 'PR created successfully!' : 'Published to main.',
    );
    if (data.url) {
      window.open(data.url, '_blank');
    }
  } catch (err) {
    console.error(err);
    customAlert(ui, `Publish failed: ${err.message || String(err)}`);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}
