/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: MIT
 */

import { loadPages, listPages } from './pages-loader.js';
import { draftFromMetadata } from './load-draft.js';
import { drafts, saveDrafts, setCurrentDraftId } from './draft-manager.js';
import { customAlert } from '../utils/dialog-utils.js';
import { loadSchema } from '../editor/schema/schema-loader.js';

/**
 * Maps a page's source path to its published URL the way metalsmith-permalinks
 * does: drop the `.md`, collapse `index` to its folder, and wrap in slashes.
 * Used as the anchors' href so a modified click can open the live page.
 * @param {string} path - The source path, e.g. `blog/hello.md`.
 * @return {string} The published URL, e.g. `/blog/hello/`.
 */
function pageUrl(path) {
  const slug = path.replace(/\.md$/, '').replace(/\/?index$/, '');
  return slug ? `/${slug}/` : '/';
}

/**
 * Renders the page list into the picker dialog and resolves with the chosen
 * source path, or null if the dialog is dismissed. Posts and pages are shown
 * in two labelled groups, matching how the editor treats them on open. Each
 * row is a link to the published page; a plain click opens it in the editor,
 * while a modified click (new tab/window) follows the href to the live page.
 * @param {Object} ui - The UI elements.
 * @param {Array} items - The list from listPages().
 * @return {Promise<string|null>} The chosen page path, or null.
 */
function pickPage(ui, items) {
  const list = ui.openSiteList;
  list.innerHTML = '';

  const groups = [
    { type: 'post', label: 'Posts' },
    { type: 'page', label: 'Pages' }
  ];
  for (const group of groups) {
    const groupItems = items.filter((i) => i.pageType === group.type);
    if (!groupItems.length) {
      continue;
    }
    const heading = document.createElement('li');
    heading.className = 'open-site-group';
    heading.textContent = group.label;
    list.appendChild(heading);

    for (const item of groupItems) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'open-site-item';
      link.dataset.path = item.path;
      link.href = pageUrl(item.path);
      const title = document.createElement('span');
      title.className = 'open-site-item-title';
      title.textContent = item.title;
      link.append(title);
      li.appendChild(link);
      list.appendChild(li);
    }
  }

  return new Promise((resolve) => {
    const onClick = (e) => {
      const link = e.target.closest('.open-site-item');
      if (!link) {
        return;
      }
      // Let modified clicks (new tab/window) follow the href to the live page.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      e.preventDefault();
      ui.openSiteDialog.close(link.dataset.path);
    };
    list.addEventListener('click', onClick);
    ui.openSiteDialog.addEventListener(
      'close',
      () => {
        list.removeEventListener('click', onClick);
        const val = ui.openSiteDialog.returnValue;
        resolve(val && val !== 'cancel' ? val : null);
      },
      { once: true }
    );
    // Esc leaves returnValue untouched; clear the previous pick so dismissing
    // the dialog can't silently reopen the last-chosen page.
    ui.openSiteDialog.returnValue = '';
    ui.openSiteDialog.showModal();
  });
}

/**
 * Opens a published page from the build artifact into a new draft. Fetches
 * pages.json, shows the picker, and on selection hydrates the chosen page's
 * frontmatter through the same path as a loaded .md file. The schema is loaded
 * first so hydration can fill section defaults.
 * @param {Object} ui - The UI elements.
 * @param {Function} loadDraftFn - Function to load a draft by id.
 * @param {Function} renderListFn - Function to render the drafts list.
 * @return {Promise<void>}
 */
export async function openFromSite(ui, loadDraftFn, renderListFn) {
  try {
    await loadSchema().catch(() => {});
    const pages = await loadPages();
    const items = listPages(pages);
    if (!items.length) {
      customAlert(ui, 'No published pages found in the site artifact.');
      return;
    }

    const path = await pickPage(ui, items);
    if (!path) {
      return;
    }

    const entry = pages[path];
    const id = Date.now().toString();
    const newDraft = draftFromMetadata(entry.frontmatter, entry.content || '', id);
    // Remember where the page came from so the slug/destination round-trips.
    newDraft.sourcePath = path;
    drafts.unshift(newDraft);
    setCurrentDraftId(id);
    saveDrafts();
    await loadDraftFn(id);
    renderListFn();
  } catch (err) {
    console.error(err);
    customAlert(ui, 'Failed to load pages from the site.', err.message || String(err));
  }
}
