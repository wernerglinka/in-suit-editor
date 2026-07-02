/**
 * Section builder: the editor's left-column replacement for the markdown
 * body textarea. A draft holds a `sections` array.
 *
 * Every section is schema-driven: a library-shaped values object
 * materialized from the component schema and tagged with `sectionType`,
 * rendered generically by form-renderer.js and serialized generically by
 * schema/serializer.js (see docs/manifest-driven-editor.md). The add menu
 * offers every type in the loaded schema (populateAddMenu), so the editor
 * adapts to whatever components a site's manifests emit.
 */

import { getImage } from '../utils/db-storage.js';
import { processImage } from './image-handler.js';
import { loadSchema, getSectionFields, getSectionTypes } from './schema/schema-loader.js';
import { loadSiteData } from './schema/site-data-loader.js';
import { materializeDefaults } from './schema/field-utils.js';
import { renderFields } from './schema/form-renderer.js';
import { WRAPPER } from './schema/serializer.js';

/**
 * The card header label for a section type: its section name, title-cased
 * from the kebab type so it always matches the library (rich-text -> "Rich
 * Text", multi-media -> "Multi Media").
 * @param {string} type - The sectionType.
 * @return {string} The display label.
 */
function typeLabel(type) {
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Cache of imageId -> blob URL for thumbnails. */
const thumbCache = new Map();

let uiRef = null;
let onChangeRef = () => {};
let sections = [];
let currentDraft = null;

/** Sections whose form body is expanded. Keyed by the section object so the
 * state survives re-render and reorder; empty by default, so a freshly loaded
 * page renders with every section collapsed and the user sees the page's
 * makeup at a glance. */
const expanded = new WeakSet();

/**
 * Creates a new empty section of the given type by materializing its
 * defaults from the loaded schema. The schema must be loaded first (callers
 * await loadSchema()).
 * @param {string} type - A schema section type (a key in the loaded schema).
 * @return {Object} The section values object, tagged with sectionType.
 */
function newSection(type) {
  // Seed the per-type wrapper defaults (e.g. banner -> aside/cta-banner) over
  // the schema defaults; containerTag/id/classes are editable from there.
  return { sectionType: type, ...materializeDefaults(getSectionFields(type)), ...WRAPPER[type] };
}

/**
 * The editor context passed to the schema-driven form renderer, giving its
 * generic image widget access to the draft's image pipeline without coupling
 * the renderer to the DB or the upload code.
 * @return {Object} { processFile, resolveThumb, rerender }.
 */
function formContext() {
  return {
    /**
     * Uploads a picked file through the draft's image pipeline.
     * @param {File} file - The chosen image.
     * @return {Promise<Object|null>} { name, alt, caption } or null.
     */
    async processFile(file) {
      if (!currentDraft) {
        return null;
      }
      return processImage(file, currentDraft.id, currentDraft, uiRef);
    },
    /**
     * Resolves a stored image value to a thumbnail blob URL, matching it
     * against the draft's uploaded files by filename.
     * @param {string} value - The stored image value (filename or path).
     * @return {Promise<string|null>} A blob URL, or null.
     */
    async resolveThumb(value) {
      if (!value || !currentDraft) {
        return null;
      }
      const name = value.split('/').pop();
      const entry = (currentDraft.imageFiles || []).find((f) => f.name === name);
      if (!entry) {
        return null;
      }
      if (thumbCache.has(entry.id)) {
        return thumbCache.get(entry.id);
      }
      const data = await getImage(entry.id);
      if (!data) {
        return null;
      }
      const url = URL.createObjectURL(new Blob([data]));
      thumbCache.set(entry.id, url);
      return url;
    },
    /** Re-renders the section cards (after an upload fills sibling fields). */
    rerender() {
      render();
    }
  };
}

/**
 * Renders one section card.
 * @param {Object} section - The section state object.
 * @param {number} index - Position in the sections array.
 * @return {HTMLElement} The card element.
 */
function renderCard(section, index) {
  const kind = section.sectionType || section.type;
  const isOpen = expanded.has(section);
  const card = document.createElement('div');
  card.className = `section-card section-card-${kind}${isOpen ? '' : ' is-collapsed'}`;
  // The section's array index, so an inline edit in the rendered preview (keyed
  // by the same index) can find this card's controls by data-field-path.
  card.dataset.sectionIndex = String(index);

  // The whole header is the collapse toggle (like a <summary>); the controls
  // sit inside it and stop propagation so moving/removing never also toggles.
  const header = document.createElement('div');
  header.className = 'section-card-header';
  header.setAttribute('role', 'button');
  header.setAttribute('tabindex', '0');
  header.setAttribute('aria-expanded', String(isOpen));
  const typeEl = document.createElement('span');
  typeEl.className = 'section-card-type';
  const caret = document.createElement('span');
  caret.className = 'section-card-caret';
  caret.textContent = '▸';
  caret.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = typeLabel(kind);
  typeEl.append(caret, label);
  const toggle = () => {
    const nowOpen = !expanded.has(section);
    if (nowOpen) {
      expanded.add(section);
    } else {
      expanded.delete(section);
    }
    card.classList.toggle('is-collapsed', !nowOpen);
    header.setAttribute('aria-expanded', String(nowOpen));
  };
  header.onclick = toggle;
  header.onkeydown = (e) => {
    // Only the header itself, not its control buttons, toggles on key press.
    if (e.target === header && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      toggle();
    }
  };
  const controls = document.createElement('div');
  controls.className = 'section-card-controls';
  controls.onclick = (e) => e.stopPropagation();
  for (const [act, symbol, title] of [
    ['up', '↑', 'Move up'],
    ['down', '↓', 'Move down'],
    ['remove', '✕', 'Remove section']
  ]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'button secondary small section-card-control';
    b.textContent = symbol;
    b.title = title;
    b.disabled = (act === 'up' && index === 0) || (act === 'down' && index === sections.length - 1);
    b.onclick = () => {
      if (act === 'remove') {
        sections.splice(index, 1);
      } else {
        const to = act === 'up' ? index - 1 : index + 1;
        [sections[index], sections[to]] = [sections[to], sections[index]];
      }
      render();
      onChangeRef();
    };
    controls.append(b);
  }
  header.append(typeEl, controls);

  const body = document.createElement('div');
  body.className = 'section-card-body';
  const fields = section.sectionType ? getSectionFields(section.sectionType) : null;
  if (fields) {
    body.append(renderFields(fields, section, onChangeRef, formContext()));
  } else {
    // No schema for this type (an auto/chrome or hand-authored section the
    // editor does not own). It is preserved as-is on save, not editable here.
    const note = document.createElement('p');
    note.className = 'field-hint';
    note.textContent = `This “${kind}” section isn’t editable here; it’s preserved unchanged when you save.`;
    body.append(note);
  }

  card.append(header, body);
  return card;
}

/**
 * Re-renders all section cards into the container.
 */
function render() {
  if (!uiRef || !uiRef.sectionsList) {
    return;
  }
  uiRef.sectionsList.replaceChildren(...sections.map((s, i) => renderCard(s, i)));
  if (sections.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'field-hint sections-empty';
    empty.textContent = 'No sections yet. Add one below.';
    uiRef.sectionsList.append(empty);
  }
}

/**
 * Loads a draft's sections into the builder.
 * @param {Object} draft - The draft object (mutated in place).
 */
export function loadSections(draft) {
  currentDraft = draft;
  if (!Array.isArray(draft.sections)) {
    draft.sections = [];
  }
  // Bind synchronously: any sync firing before the schema resolves reads
  // ui.getSections(), and a stale binding here would overwrite — and persist —
  // this draft's sections with the previous draft's array (or the initial []).
  sections = draft.sections;
  // Schema-driven types need the schema loaded before they can render, and
  // source-backed fields need the site data; warm both before rendering.
  Promise.all([loadSchema(), loadSiteData()])
    .then(() => {
      // Only render if this draft is still the loaded one.
      if (currentDraft !== draft) {
        return;
      }
      render();
      // Re-emit now that the schema is loaded: the first preview may have
      // run through the schema-less fallback (bare image paths, no defaults).
      onChangeRef();
    })
    .catch(() => {
      if (currentDraft === draft) {
        render();
      }
    });
}

/**
 * Wires the add-section buttons and exposes the sections getter on ui.
 * Call once at startup, before the first draft is loaded.
 * @param {Object} ui - The UI elements.
 * @param {Function} onChange - Called after any section edit (the sync fn).
 */
export function initSectionBuilder(ui, onChange) {
  uiRef = ui;
  onChangeRef = onChange;
  ui.getSections = () => sections;
  const addSelect = document.getElementById('section-add-select');
  // Warm the schema cache, then fill the add menu from it so the offered
  // sections are exactly whatever the site's manifests emitted. Warm the site
  // data too so a newly added section's source-backed selects have options.
  loadSiteData();
  loadSchema()
    .then(() => populateAddMenu(addSelect))
    .catch((err) => console.error('schema load failed', err));
  if (addSelect) {
    addSelect.onchange = async () => {
      const type = addSelect.value;
      addSelect.value = ''; // snap back to the placeholder for the next add
      if (!type) {
        return;
      }
      await loadSchema();
      const added = newSection(type);
      expanded.add(added); // open the new section so the user can fill it in
      sections.push(added);
      render();
      onChangeRef();
    };
  }
}

/**
 * Fills the add-section <select> with one option per schema section type,
 * labelled the same way the card headers are. Idempotent: clears any prior
 * options (keeping the placeholder) before repopulating.
 * @param {HTMLSelectElement|null} addSelect - The add-section select.
 */
function populateAddMenu(addSelect) {
  if (!addSelect) {
    return;
  }
  const placeholder = addSelect.querySelector('option[value=""]');
  addSelect.replaceChildren();
  if (placeholder) {
    addSelect.append(placeholder);
  }
  for (const type of getSectionTypes()) {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = typeLabel(type);
    addSelect.append(opt);
  }
}
