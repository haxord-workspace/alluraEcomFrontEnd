import { sanitizeHtml } from '../utils/sanitizeHtml';

// -----------------------------------------------------------------------------
// Scoped styles for CMS page content (`.cms-prose`), shared by the storefront page
// viewer (src/pages/customer/CMSPageViewer.tsx) and the admin rich text editor's
// Write and Preview views, so the editor shows content the way the storefront does.
//
// CMS_PROSE_BASE_CSS is the viewer's original inline <style> block, moved here
// unchanged (same output). CMS_PROSE_EXTRA_CSS only adds rules for markup the
// editor can produce (lists inside lists, list styles, dividers, highlights,
// alignment, focus states) and for mobile wrapping; it does not change how the
// existing pages (h1 / p / ol) render, except where noted on the mobile heading sizes.
// -----------------------------------------------------------------------------

/** The original `.cms-prose` rules from CMSPageViewer, unchanged. */
export const CMS_PROSE_BASE_CSS = `
        .cms-prose h1, .cms-prose h2, .cms-prose h3, .cms-prose h4 {
          font-family: 'Quicksand', sans-serif;
          color: #1c1917;
          font-weight: 600;
          letter-spacing: -0.01em;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
        }
        .cms-prose h1 { font-size: 1.75rem; }
        .cms-prose h2 { font-size: 1.35rem; border-bottom: 1px solid rgba(86, 28, 8, 0.1); padding-bottom: 0.35rem; }
        .cms-prose h3 { font-size: 1.15rem; }
        .cms-prose h4 { font-size: 1rem; }
        .cms-prose p {
          margin-bottom: 1.25rem;
          line-height: 1.75;
          color: #44403c;
        }
        .cms-prose ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1.25rem;
          space-y: 0.5rem;
        }
        .cms-prose ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1.25rem;
        }
        .cms-prose li {
          margin-bottom: 0.5rem;
          color: #44403c;
        }
        .cms-prose a {
          color: #561C08;
          text-decoration: underline;
          text-underline-offset: 3px;
          font-weight: 500;
        }
        .cms-prose a:hover {
          color: #000000;
        }
        .cms-prose blockquote {
          border-left: 3px solid #561C08;
          padding-left: 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #57534e;
          background: rgba(86, 28, 8, 0.03);
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          border-radius: 0 0.5rem 0.5rem 0;
        }
        .cms-prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1.5rem 0;
          box-shadow: 0 4px 20px -2px rgba(44, 41, 38, 0.08);
        }
        .cms-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          font-size: 0.875rem;
        }
        .cms-prose th, .cms-prose td {
          border: 1px solid rgba(86, 28, 8, 0.15);
          padding: 0.75rem 1rem;
          text-align: left;
        }
        .cms-prose th {
          background-color: #f5f5f4;
          font-weight: 600;
          color: #1c1917;
        }
        .cms-prose code {
          background-color: #f5f5f4;
          padding: 0.15rem 0.35rem;
          border-radius: 0.25rem;
          font-size: 0.85em;
          font-family: monospace;
          color: #561C08;
        }
      `;

/** New rules for markup produced by the admin rich text editor, plus mobile wrapping. */
export const CMS_PROSE_EXTRA_CSS = `
        /* Long words and URLs wrap instead of causing horizontal scrolling */
        .cms-prose { overflow-wrap: anywhere; min-width: 0; }

        /* Paragraphs inside list items and quotes (the editor wraps their text in <p>) */
        .cms-prose li > p { margin-bottom: 0; }
        .cms-prose blockquote > p:last-child { margin-bottom: 0; }

        /* Nested lists: indent levels with their own markers (an inline list-style-type still wins) */
        .cms-prose li > ul, .cms-prose li > ol { margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .cms-prose ul ul { list-style-type: circle; }
        .cms-prose ul ul ul { list-style-type: square; }
        .cms-prose ol ol { list-style-type: lower-alpha; }
        .cms-prose ol ol ol { list-style-type: lower-roman; }

        /* Legacy <ol type="…"> attributes (the base "ol { decimal }" rule would otherwise hide them) */
        .cms-prose ol[type="a"] { list-style-type: lower-alpha; }
        .cms-prose ol[type="A"] { list-style-type: upper-alpha; }
        .cms-prose ol[type="i"] { list-style-type: lower-roman; }
        .cms-prose ol[type="I"] { list-style-type: upper-roman; }

        /* An empty paragraph is a blank line, as in the editor */
        .cms-prose p:empty { min-height: 1.75em; }

        /* Divider */
        .cms-prose hr {
          border: 0;
          border-top: 1px solid rgba(86, 28, 8, 0.18);
          margin: 2rem 0;
        }

        /* Text decorations */
        .cms-prose u { text-underline-offset: 3px; }
        .cms-prose s { text-decoration-thickness: 1px; }

        /* Highlight (span with an inline background-color, or <mark>) */
        .cms-prose span[style*="background-color"], .cms-prose mark {
          padding: 0.05em 0.2em;
          border-radius: 0.2em;
          -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
        }
        .cms-prose mark { background-color: #F7E6C8; color: inherit; }

        /* Links: visible keyboard focus */
        .cms-prose a:focus-visible {
          outline: 2px solid #561C08;
          outline-offset: 2px;
          border-radius: 2px;
          color: #000000;
        }

        /* Media and wide blocks scale to the width; tables scroll inside their wrapper */
        .cms-prose video, .cms-prose iframe { max-width: 100%; }
        .cms-prose pre { max-width: 100%; overflow-x: auto; white-space: pre-wrap; }
        .cms-prose .cms-table-wrap {
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 1.5rem 0;
        }
        .cms-prose .cms-table-wrap > table { margin: 0; }

        /* Small screens: headings scale down a little */
        @media (max-width: 639px) {
          .cms-prose h1 { font-size: 1.5rem; }
          .cms-prose h2 { font-size: 1.25rem; }
          .cms-prose h3 { font-size: 1.1rem; }
        }
      `;

/** Everything the viewer and the editor inject. */
export const CMS_PROSE_CSS = CMS_PROSE_BASE_CSS + CMS_PROSE_EXTRA_CSS;

/**
 * Wraps every <table> in a `.cms-table-wrap` div so wide tables scroll inside the
 * content card instead of the whole page. Run it on HTML that is already sanitized.
 */
export const wrapCmsTables = (html: string): string => {
  if (!html || !/<table[\s>]/i.test(html) || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  doc.body.querySelectorAll('table').forEach(table => {
    if (table.parentElement?.classList.contains('cms-table-wrap')) return;
    const wrap = doc.createElement('div');
    wrap.className = 'cms-table-wrap';
    table.replaceWith(wrap);
    wrap.appendChild(table);
  });
  return doc.body.innerHTML;
};

/**
 * Sanitize (keeping new-tab links, see sanitizeHtml's allowTarget) + table wrapping:
 * exactly what the storefront renders. Used by the viewer and the editor's Preview.
 */
export const prepareCmsHtml = (html: string | null | undefined): string =>
  wrapCmsTables(sanitizeHtml(html, { allowTarget: true }));
