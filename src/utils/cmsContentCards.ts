// -----------------------------------------------------------------------------
// Splits CMS page HTML (ALREADY SANITIZED) into cards for the storefront page viewer:
//
// - Content with headings (h1–h3): one "section" card per heading; the heading is the
//   card title and everything up to the next heading is its body. Content before the
//   first heading becomes an intro card without a title.
// - Content without headings: one "point" card per top-level block. Each item of a
//   bullet / numbered list becomes its own card, labelled with its number in the list's
//   style (1, a, i…). Legacy <ol>text</ol> blocks (no <li>) are numbered in sequence.
//
// A leading <h1> that repeats the page title is dropped (the page already shows it).
// Empty paragraphs and top-level dividers are skipped. Nothing is re-sanitized here:
// callers must pass the output of prepareCmsHtml / sanitizeHtml.
// -----------------------------------------------------------------------------

export interface CmsCard {
  key: string;
  kind: 'section' | 'point';
  /** Section heading text */
  title?: string;
  /** Label shown in the badge: list number ("1", "b", "iv") or section number */
  marker?: string;
  /** true for an item of a bullet list (shown with a dot instead of a number) */
  bullet?: boolean;
  /** Sanitized HTML of the card body ('' for a heading-only section) */
  html: string;
}

const HEADINGS = new Set(['H1', 'H2', 'H3']);

const toAlpha = (n: number) => {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(97 + ((x - 1) % 26)) + s;
  return s;
};

const toRoman = (n: number) => {
  const table: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
  let s = '';
  let x = n;
  for (const [value, numeral] of table) while (x >= value) { s += numeral; x -= value; }
  return s;
};

const LEGACY_TYPES: Record<string, string> = { a: 'lower-alpha', A: 'upper-alpha', i: 'lower-roman', I: 'upper-roman' };

/** The number of the n-th item (1-based) of an ordered list, in the list's own style. */
const listMarker = (list: HTMLElement, n: number): string => {
  const style = list.style.listStyleType || LEGACY_TYPES[list.getAttribute('type') || ''] || 'decimal';
  switch (style) {
    case 'lower-alpha':
    case 'lower-latin':
      return toAlpha(n);
    case 'upper-alpha':
    case 'upper-latin':
      return toAlpha(n).toUpperCase();
    case 'lower-roman':
      return toRoman(n);
    case 'upper-roman':
      return toRoman(n).toUpperCase();
    default:
      return String(n);
  }
};

const isBlank = (el: Element) =>
  (el.tagName === 'P' || el.tagName === 'DIV') && !(el.textContent || '').trim() && !el.querySelector('img, video, iframe, hr, table');

const normalizeTitle = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

export const splitCmsContent = (safeHtml: string, pageTitle?: string): CmsCard[] => {
  if (!safeHtml || typeof DOMParser === 'undefined') return [];
  const body = new DOMParser().parseFromString(`<body>${safeHtml}</body>`, 'text/html').body;

  // Top-level blocks; stray inline content is wrapped in a paragraph
  const blocks: HTMLElement[] = [];
  let loose: HTMLElement | null = null;
  for (const node of Array.from(body.childNodes)) {
    const isElement = node.nodeType === Node.ELEMENT_NODE;
    const el = node as HTMLElement;
    const inline = !isElement || ['A', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SPAN', 'MARK', 'BR', 'CODE', 'SMALL', 'SUB', 'SUP'].includes(el.tagName);
    if (inline) {
      if (!isElement && !(node.textContent || '').trim()) continue;
      if (!loose) {
        loose = body.ownerDocument.createElement('p');
        blocks.push(loose);
      }
      loose.appendChild(node.cloneNode(true));
      continue;
    }
    loose = null;
    if (isBlank(el)) continue;
    blocks.push(el);
  }

  // A first <h1> that repeats the page title is already shown above the cards
  if (blocks[0]?.tagName === 'H1' && pageTitle && normalizeTitle(blocks[0].textContent || '') === normalizeTitle(pageTitle)) {
    blocks.shift();
  }

  const cards: CmsCard[] = [];

  // --- Section mode
  if (blocks.some(b => HEADINGS.has(b.tagName))) {
    let current: CmsCard | null = null;
    let sectionNo = 0;
    for (const block of blocks) {
      if (HEADINGS.has(block.tagName)) {
        sectionNo += 1;
        const text = (block.textContent || '').replace(/\s+/g, ' ').trim();
        // "1. Delivery" / "2) Returns" / "IV. Terms" / "2.1. Fees": the heading's own number becomes
        // the badge. The number must end with "." or ")" so "3 days delivery" stays a plain title.
        const ownNumber = text.match(/^((?:\d{1,3}|[ivxlc]{1,6})(?:\.\d{1,3})*)[.)]\s+(.+)$/i);
        current = {
          key: `s${sectionNo}`,
          kind: 'section',
          title: ownNumber ? ownNumber[2] : text,
          marker: ownNumber ? (/^\d+$/.test(ownNumber[1]) ? ownNumber[1].padStart(2, '0') : ownNumber[1].toUpperCase()) : String(sectionNo).padStart(2, '0'),
          html: '',
        };
        cards.push(current);
        continue;
      }
      if (!current) {
        current = { key: 'intro', kind: 'section', html: '' };
        cards.push(current);
      }
      current.html += block.outerHTML;
    }
    return cards;
  }

  // --- Point mode
  let legacyNumber = 0;
  blocks.forEach((block, i) => {
    const tag = block.tagName;
    if (tag === 'HR') {
      legacyNumber = 0;
      return;
    }
    if (tag === 'UL' || tag === 'OL') {
      const items = Array.from(block.children).filter(c => c.tagName === 'LI') as HTMLElement[];
      if (items.length === 0) {
        // Legacy list without <li>: keep its text as one point, numbered in sequence for <ol>
        if (!(block.textContent || '').trim()) return;
        if (tag === 'OL') legacyNumber += 1;
        cards.push({
          key: `b${i}`,
          kind: 'point',
          marker: tag === 'OL' ? String(legacyNumber) : undefined,
          bullet: tag === 'UL',
          html: `<p>${block.innerHTML}</p>`,
        });
        return;
      }
      legacyNumber = 0;
      const start = Number(block.getAttribute('start')) || 1;
      items.forEach((item, n) => {
        cards.push({
          key: `b${i}-${n}`,
          kind: 'point',
          marker: tag === 'OL' ? listMarker(block, start + n) : undefined,
          bullet: tag === 'UL',
          html: item.innerHTML,
        });
      });
      return;
    }
    legacyNumber = 0;
    cards.push({ key: `b${i}`, kind: 'point', html: block.outerHTML });
  });
  return cards;
};
