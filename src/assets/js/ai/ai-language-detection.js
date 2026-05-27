/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: MIT
 */

/**
 * Detects the language of a given text using the Language Detector API.
 * @param {string} text - The text to detect the language for.
 * @return {Promise<string>} The detected language code (defaults to 'en').
 */
export async function detectLanguage(text) {
  if (!('LanguageDetector' in self)) {
    return 'en';
  }

  try {
    const status = await LanguageDetector.availability();
    if (status === 'unavailable') {
      return 'en';
    }

    const detector = await LanguageDetector.create();
    const results = await detector.detect(text);

    return results.length > 0 ? results[0].detectedLanguage : 'en';
  } catch (e) {
    console.warn('Language detection failed', e);
    return 'en';
  }
}
