import DOMPurify from 'dompurify';

export interface SanitizeHtmlOptions {
  /**
   * Keep `target` on links (needed for "open in new tab" links in CMS content).
   * Default false = the original behavior (DOMPurify strips `target`).
   * When true, links with a protocol other than http, https, mailto or tel lose their href,
   * and the hook below still forces rel="noopener noreferrer" on every target="_blank" link.
   */
  allowTarget?: boolean;
}

/** Link protocols kept on CMS links when `allowTarget` is on. Protocol-less (relative) URLs are kept. */
const CMS_LINK_PROTOCOL = /^(https?|mailto|tel):/i;
const HAS_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;

/** True only during a sanitize call made with `allowTarget: true` (sanitize is synchronous). */
let cmsLinkMode = false;

/**
 * Sanitizes HTML from the API before it is rendered with dangerouslySetInnerHTML.
 * Uses DOMPurify's default HTML profile (headings, paragraphs, lists, links, tables,
 * images, blockquotes, code…), so `.cms-prose` styling still applies, while scripts,
 * event handlers and javascript: URLs are stripped.
 */
export const sanitizeHtml = (html: string | null | undefined, options: SanitizeHtmlOptions = {}): string => {
  if (!html) return '';
  if (!options.allowTarget) {
    // Original behavior, unchanged
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  }
  cmsLinkMode = true;
  try {
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] });
  } finally {
    cmsLinkMode = false;
  }
};

// Links that open a new tab must not give the opened page access to window.opener
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
  // CMS links: only http, https, mailto and tel (or relative URLs, which cannot carry a script)
  if (cmsLinkMode && node.tagName === 'A') {
    const href = (node.getAttribute('href') || '').trim();
    if (href && HAS_PROTOCOL.test(href) && !CMS_LINK_PROTOCOL.test(href)) node.removeAttribute('href');
    const target = node.getAttribute('target');
    if (target && target !== '_blank') node.removeAttribute('target');
  }
});
