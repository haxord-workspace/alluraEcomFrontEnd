import DOMPurify from 'dompurify';

// -----------------------------------------------------------------------------
// HTML helpers for the rich text editor that do NOT depend on Tiptap, so the page
// component can use them without pulling the editor into the main bundle.
// -----------------------------------------------------------------------------

const parseBody = (html: string) =>
  new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html').body;

const isEmptyBlock = (el: Element) =>
  el.tagName === 'P' && !(el.textContent || '').trim() && !el.querySelector('img, hr, iframe, video');

/**
 * Normalizes editor output before it is stored in the form:
 * - trims, and drops empty trailing paragraphs (`<p></p>`, `<p><br></p>`)
 * - content made only of empty paragraphs becomes '' (counts as empty)
 * - every target="_blank" link gets rel="noopener noreferrer"
 */
export const normalizeEditorHtml = (html: string): string => {
  const trimmed = (html || '').trim();
  if (!trimmed || typeof DOMParser === 'undefined') return trimmed;
  const body = parseBody(trimmed);

  while (body.lastElementChild && isEmptyBlock(body.lastElementChild)) body.lastElementChild.remove();
  if (!(body.textContent || '').trim() && !body.querySelector('hr, img, iframe, video')) return '';

  body.querySelectorAll('a[target="_blank"]').forEach(a => a.setAttribute('rel', 'noopener noreferrer'));
  return body.innerHTML.trim();
};

export const countWords = (html: string): { words: number; characters: number } => {
  const text = (html || '')
    .replace(/<(br|\/p|\/li|\/h\d|\/blockquote)[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, 'x');
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return { words: trimmed ? trimmed.split(' ').length : 0, characters: trimmed.length };
};

// ----------------------------------------------------------------------------- post-save check

/**
 * Formatting written by editorExtensions.ts. If that output changes (for example to
 * classes), update these checks too.
 */
const FORMATTING_CHECKS: { label: string; count: (body: HTMLElement) => number }[] = [
  { label: 'text color', count: b => Array.from(b.querySelectorAll<HTMLElement>('[style]')).filter(e => e.style.color).length },
  { label: 'highlight', count: b => Array.from(b.querySelectorAll<HTMLElement>('[style]')).filter(e => e.style.backgroundColor).length },
  { label: 'alignment', count: b => Array.from(b.querySelectorAll<HTMLElement>('[style]')).filter(e => e.style.textAlign).length },
  { label: 'list style', count: b => Array.from(b.querySelectorAll<HTMLElement>('ul[style], ol[style]')).filter(e => e.style.listStyleType).length },
  { label: 'new-tab links', count: b => b.querySelectorAll('a[target]').length },
];

/**
 * Compares the HTML that was sent with the HTML the server saved and returns the kinds of
 * formatting the server removed (empty when nothing was lost).
 */
export const detectStrippedFormatting = (sent: string, saved: string): string[] => {
  if (typeof DOMParser === 'undefined' || !sent) return [];
  const a = parseBody(sent);
  const b = parseBody(saved);
  return FORMATTING_CHECKS.filter(check => check.count(a) > check.count(b)).map(check => check.label);
};

export const strippedFormattingMessage = (lost: string[]) =>
  `The server removed some formatting (${lost.join(' / ')}). The saved page may look different on the storefront.`;

// ----------------------------------------------------------------------------- Source view check

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
/** Tags whose closing tag HTML lets you leave out; not reported as unclosed. */
const OPTIONAL_CLOSE = new Set(['p', 'li', 'dt', 'dd', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'option']);
/** Tags the editor keeps; anything else is converted to plain text/paragraphs or removed. */
const EDITOR_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'a', 'ul', 'ol', 'li', 'blockquote', 'hr', 'br', 'span']);

/**
 * Checks HTML typed in the Source view before it goes back to the editor. Returns
 * human-readable problems; an empty list means the HTML is fine.
 */
export const validateSourceHtml = (html: string): string[] => {
  const issues: string[] = [];

  // 1. Unbalanced tags
  const stack: string[] = [];
  const tagRe = /<\/?([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) && issues.length < 4) {
    const [full, rawName, selfClose] = match;
    const name = rawName.toLowerCase();
    if (VOID_TAGS.has(name) || selfClose) continue;
    if (!full.startsWith('</')) {
      stack.push(name);
      continue;
    }
    const index = stack.lastIndexOf(name);
    if (index === -1) {
      issues.push(`Closing tag </${name}> has no matching <${name}>.`);
      continue;
    }
    const unclosed = stack.splice(index).slice(1).filter(t => !OPTIONAL_CLOSE.has(t));
    unclosed.forEach(t => issues.push(`<${t}> is not closed before </${name}>.`));
  }
  stack
    .filter(t => !OPTIONAL_CLOSE.has(t))
    .slice(0, 4)
    .forEach(t => issues.push(`<${t}> is never closed.`));

  // 2. Content the sanitizer removes (scripts, event handlers, javascript: links…)
  DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] });
  const removed = new Set<string>();
  for (const item of DOMPurify.removed as Array<{ element?: Element; attribute?: Attr | null }>) {
    if (item.attribute) removed.add(`the ${item.attribute.name} attribute`);
    else if (item.element?.nodeName && item.element.nodeName !== '#text') removed.add(`<${item.element.nodeName.toLowerCase()}>`);
  }
  if (removed.size) issues.push(`Not allowed and will be removed: ${[...removed].slice(0, 6).join(', ')}.`);

  // 3. Markup the editor does not support
  if (typeof DOMParser !== 'undefined') {
    const unsupported = new Set<string>();
    parseBody(html)
      .querySelectorAll('*')
      .forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (!EDITOR_TAGS.has(tag)) unsupported.add(`<${tag}>`);
      });
    if (unsupported.size) {
      issues.push(`Not supported by the editor (converted to plain text or removed): ${[...unsupported].slice(0, 6).join(', ')}.`);
    }
  }

  return issues;
};
