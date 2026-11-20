// @tiptap/react re-exports @tiptap/core
import { Extension } from '@tiptap/react';
import type { Extensions } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color, BackgroundColor } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';

// -----------------------------------------------------------------------------
// ALL formatting output of the rich text editor is defined in this file:
// which extensions run, and how colors, highlights, alignment, list styles and
// links are written into the saved HTML.
//
// Current output (inline styles — see the audit; the storefront sanitizer keeps
// `style`, the backend allowlist is not documented):
//   text color   <span style="color: #561C08">
//   highlight    <span style="background-color: #F7E6C8">
//   alignment    <p style="text-align: center">           (paragraphs and headings)
//   list style   <ul style="list-style-type: square">      (ul and ol)
//   new-tab link <a href="…" target="_blank" rel="noopener noreferrer">
//
// If the backend turns out to strip `style`, switch to class-based output here
// (e.g. cms-color-brown, cms-align-center, cms-list-square) and define those
// classes in src/styles/cmsProse.ts. Nothing else needs to change.
// -----------------------------------------------------------------------------

export interface PaletteColor {
  name: string;
  value: string;
}

/**
 * Text colors. Every color is readable on the storefront content card (#FFFFFF) and on
 * every highlight below: WCAG contrast ≥ 4.8:1 (AA needs 4.5:1). Light colors are not offered.
 *   brown 13.4 · dark 17.5 · body 10.3 · gold 5.9 · grey 7.6 · red 6.5 · green 7.1 · blue 6.7 (vs white)
 */
export const TEXT_COLORS: PaletteColor[] = [
  { name: 'Brand brown', value: '#561C08' },
  { name: 'Dark text', value: '#1C1917' },
  { name: 'Body text', value: '#44403C' },
  { name: 'Gold accent', value: '#8A5A0B' },
  { name: 'Muted grey', value: '#57534E' },
  { name: 'Red', value: '#B91C1C' },
  { name: 'Green', value: '#166534' },
  { name: 'Blue', value: '#1D4ED8' },
];

/** Highlight (background) colors — light tints that keep all text colors above readable. */
export const HIGHLIGHT_COLORS: PaletteColor[] = [
  { name: 'Cream', value: '#F7E6C8' },
  { name: 'Yellow', value: '#FEF3C7' },
  { name: 'Green', value: '#DCFCE7' },
  { name: 'Rose', value: '#FFE4E6' },
  { name: 'Blue', value: '#DBEAFE' },
];

export const BULLET_STYLES = [
  { value: 'disc', label: 'Disc', marker: '•' },
  { value: 'circle', label: 'Circle', marker: '◦' },
  { value: 'square', label: 'Square', marker: '▪' },
] as const;

export const NUMBER_STYLES = [
  { value: 'decimal', label: 'Numbers', marker: '1. 2. 3.' },
  { value: 'lower-alpha', label: 'Letters', marker: 'a. b. c.' },
  { value: 'lower-roman', label: 'Roman', marker: 'i. ii. iii.' },
] as const;

const ALL_LIST_STYLES = new Set<string>([
  ...BULLET_STYLES.map(s => s.value),
  ...NUMBER_STYLES.map(s => s.value),
  'upper-alpha',
  'upper-roman',
]);

/** Legacy <ol type="…"> values, read as list styles. */
const LEGACY_OL_TYPES: Record<string, string> = {
  '1': 'decimal',
  a: 'lower-alpha',
  A: 'upper-alpha',
  i: 'lower-roman',
  I: 'upper-roman',
};

// ----------------------------------------------------------------------------- links

/** Only these link protocols are allowed. */
export const LINK_PROTOCOLS = ['http', 'https', 'mailto', 'tel'] as const;

export const isAllowedLinkUrl = (url: string): boolean => /^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:[+\d][\d\s().-]*)$/i.test(url.trim());

/**
 * Turns what the admin typed into a link URL: "example.com" → "https://example.com",
 * "name@example.com" → "mailto:…", "+91 98…" → "tel:…". Returns null when not allowed.
 */
export const normalizeLinkInput = (input: string): string | null => {
  let url = input.trim();
  if (!url) return null;
  if (/^[^\s@:/]+@[^\s@]+\.[^\s@]+$/.test(url)) url = `mailto:${url}`;
  else if (/^\+?\d[\d\s().-]{5,}$/.test(url)) url = `tel:${url.replace(/[\s().-]/g, '')}`;
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && /^[^\s/]+\.[^\s]+/.test(url)) url = `https://${url}`;
  return isAllowedLinkUrl(url) ? url : null;
};

/** Attributes to pass to setLink for a link that does / does not open in a new tab. */
export const linkAttributes = (href: string, newTab: boolean) =>
  newTab ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href, target: null, rel: null };

// ----------------------------------------------------------------------------- list style

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    listStyle: {
      /** Sets the marker style of the list around the cursor (only the innermost list). */
      setListStyle: (style: string | null) => ReturnType;
    };
  }
}

const ListStyle = Extension.create({
  name: 'listStyle',

  addGlobalAttributes() {
    return [
      {
        types: ['bulletList', 'orderedList'],
        attributes: {
          listStyleType: {
            default: null,
            parseHTML: element => {
              const fromStyle = element.style.listStyleType;
              if (fromStyle && ALL_LIST_STYLES.has(fromStyle)) return fromStyle;
              const legacyType = element.tagName === 'OL' ? element.getAttribute('type') : null;
              return (legacyType && LEGACY_OL_TYPES[legacyType]) || null;
            },
            renderHTML: attributes =>
              attributes.listStyleType ? { style: `list-style-type: ${attributes.listStyleType}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setListStyle:
        style =>
        ({ state, tr, dispatch }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
              if (dispatch) {
                const attrs: Record<string, unknown> = { ...node.attrs, listStyleType: style };
                if (node.type.name === 'orderedList' && 'type' in attrs) attrs.type = null; // listStyleType replaces the legacy type
                tr.setNodeMarkup($from.before(depth), undefined, attrs);
              }
              return true;
            }
          }
          return false;
        },
    };
  },
});

// ----------------------------------------------------------------------------- extensions

export const createEditorExtensions = (): Extensions => [
  StarterKit.configure({
    // H1 stays parseable so legacy content keeps its headings; the toolbar only offers H2 and H3
    heading: { levels: [1, 2, 3] },
    code: false,
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: 'https',
      protocols: ['mailto', 'tel'],
      isAllowedUri: url => isAllowedLinkUrl(url),
      // No default target/rel: they are set per link from the link dialog
      HTMLAttributes: { target: null, rel: null, class: null },
    },
  }),
  TextStyle,
  Color.configure({ types: ['textStyle'] }),
  BackgroundColor.configure({ types: ['textStyle'] }),
  TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
  ListStyle,
];

// ----------------------------------------------------------------------------- paste

const DROP_ON_PASTE = 'script,style,meta,link,title,head,xml,template,iframe,object,embed,img,video,audio,svg,canvas,form,input,button,select,textarea';
/** Wrappers whose content is kept but whose element is removed. */
const UNWRAP_ON_PASTE = new Set(['FONT', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'NAV', 'CENTER', 'SMALL', 'BIG', 'SUP', 'SUB', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR']);
const BLOCKS_FROM_CELLS = new Set(['TD', 'TH', 'CAPTION', 'DT', 'DD']);
const BLOCK_WRAPPERS = new Set(['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'NAV', 'CENTER']);
const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR', 'PRE', 'TABLE', 'TR', 'TD', 'TH', ...BLOCK_WRAPPERS]);

/**
 * Cleans HTML pasted from Word, Google Docs or websites: keeps bold/italic/underline/
 * strikethrough, headings, lists, quotes and links; removes fonts, sizes, colors,
 * classes, ids and other inline styles. h1 becomes h2 and h4–h6 become h3.
 */
export const cleanPastedHtml = (html: string): string => {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;

  body.querySelectorAll(DROP_ON_PASTE).forEach(el => el.remove());
  // Word's <o:p> and other namespaced tags
  body.querySelectorAll('*').forEach(el => {
    if (el.tagName.includes(':')) el.replaceWith(...Array.from(el.childNodes));
  });

  const rename = (el: Element, tag: string) => {
    const next = doc.createElement(tag);
    while (el.firstChild) next.appendChild(el.firstChild);
    for (const attr of Array.from(el.attributes)) next.setAttribute(attr.name, attr.value);
    el.replaceWith(next);
    return next;
  };

  // Google Docs wraps the whole paste in <b style="font-weight:normal" id="docs-internal-guid-…">
  body.querySelectorAll('b[id^="docs-internal-guid"]').forEach(el => el.replaceWith(...Array.from(el.childNodes)));

  // Formatting that Docs/Word express only as inline styles → semantic tags
  body.querySelectorAll<HTMLElement>('span[style], p[style], li[style]').forEach(el => {
    const s = el.style;
    const wrap = (tag: string) => {
      const w = doc.createElement(tag);
      while (el.firstChild) w.appendChild(el.firstChild);
      el.appendChild(w);
    };
    const weight = s.fontWeight;
    if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) wrap('strong');
    if (s.fontStyle === 'italic') wrap('em');
    const decoration = `${s.textDecoration} ${s.textDecorationLine}`;
    if (decoration.includes('underline')) wrap('u');
    if (decoration.includes('line-through')) wrap('s');
  });

  body.querySelectorAll('h1').forEach(el => rename(el, 'h2'));
  body.querySelectorAll('h4, h5, h6').forEach(el => rename(el, 'h3'));
  body.querySelectorAll('b').forEach(el => rename(el, 'strong'));
  body.querySelectorAll('i').forEach(el => rename(el, 'em'));
  body.querySelectorAll('strike, del').forEach(el => rename(el, 's'));
  body.querySelectorAll('td, th, caption, dt, dd').forEach(el => {
    if (BLOCKS_FROM_CELLS.has(el.tagName)) rename(el, 'p');
  });

  body.querySelectorAll('*').forEach(original => {
    let el: Element = original;
    if (UNWRAP_ON_PASTE.has(el.tagName)) {
      // A div/section holding only inline content becomes a paragraph (keeps line breaks
      // between pasted blocks); one that holds blocks is unwrapped
      const hasBlockChild = Array.from(el.children).some(child => BLOCK_TAGS.has(child.tagName));
      if (BLOCK_WRAPPERS.has(el.tagName) && !hasBlockChild && el.textContent?.trim()) {
        el = rename(el, 'p');
        for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
      } else {
        el.replaceWith(...Array.from(el.childNodes));
      }
      return;
    }
    for (const attr of Array.from(el.attributes)) {
      const keep = el.tagName === 'A' && attr.name === 'href';
      if (!keep) el.removeAttribute(attr.name);
    }
    if (el.tagName === 'A') {
      const href = el.getAttribute('href') || '';
      if (!isAllowedLinkUrl(href)) el.replaceWith(...Array.from(el.childNodes));
    }
  });

  // Spans without attributes are noise
  body.querySelectorAll('span').forEach(el => el.replaceWith(...Array.from(el.childNodes)));
  return body.innerHTML;
};

// The post-save "server removed formatting" check is in ./normalizeHtml.ts, because the
// page component imports it and this file must stay inside the lazily loaded editor chunk.
// If the output above changes (e.g. to classes), update FORMATTING_CHECKS there too.
