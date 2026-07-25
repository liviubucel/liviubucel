// Romania Cyber Monitor - HTML sanitisation for upstream descriptions
// (e.g. HIBP breach descriptions) before they are ever stored or rendered.

import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'];

/**
 * Sanitises third-party HTML for safe storage/rendering. Links are
 * intentionally stripped down to plain text - public pages must never
 * contain a direct hyperlink sourced from untrusted upstream HTML.
 */
export function sanitizeUpstreamHtml(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    allowedSchemes: [],
    // Strip <a> tags but keep their text content instead of dropping it.
    nonTextTags: ['style', 'script', 'textarea', 'option'],
  }).trim();
}
