import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Check,
  ChevronDown,
  CodeXml,
  Eye,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  PenLine,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  TriangleAlert,
  Underline,
  Undo2,
  Unlink,
  X,
} from 'lucide-react';
import {
  BULLET_STYLES,
  HIGHLIGHT_COLORS,
  NUMBER_STYLES,
  TEXT_COLORS,
  cleanPastedHtml,
  createEditorExtensions,
  linkAttributes,
  normalizeLinkInput,
} from './editorExtensions';
import { countWords, normalizeEditorHtml, validateSourceHtml } from './normalizeHtml';
import { CMS_PROSE_CSS, prepareCmsHtml } from '../../../styles/cmsProse';
import { CmsContentCards } from '../../content/CmsContentCards';

// -----------------------------------------------------------------------------
// Tiptap editor + toolbar. Loaded lazily by ./RichTextEditor.tsx — do not import
// this file directly, so Tiptap stays out of the main bundle.
// -----------------------------------------------------------------------------

export interface TiptapEditorProps {
  id: string;
  /** Content at mount. Later changes are ignored: remount (key) to load other content. */
  initialValue: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  labelledBy?: string;
  /** Page title for the Preview (a first <h1> repeating it is hidden, as on the storefront) */
  previewTitle?: string;
}

type Mode = 'write' | 'source' | 'preview';
type MenuName = 'heading' | 'color' | 'highlight' | 'bullets' | 'numbers' | 'link';

/** Height of the sticky admin header (AdminHeader: h-16). */
const HEADER_OFFSET = 64;

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = IS_MAC ? '⌘' : 'Ctrl';

// ----------------------------------------------------------------------------- viewport hooks

const MOBILE_QUERY = '(max-width: 767px)';
const subscribeMobile = (cb: () => void) => {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
};
const useIsMobile = () =>
  useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);

const subscribeViewport = (cb: () => void) => {
  const vv = window.visualViewport;
  vv?.addEventListener('resize', cb);
  vv?.addEventListener('scroll', cb);
  window.addEventListener('resize', cb);
  return () => {
    vv?.removeEventListener('resize', cb);
    vv?.removeEventListener('scroll', cb);
    window.removeEventListener('resize', cb);
  };
};
/** Space taken by the on-screen keyboard at the bottom of the layout viewport. */
const useKeyboardInset = () =>
  useSyncExternalStore(
    subscribeViewport,
    () => {
      const vv = window.visualViewport;
      return vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
    },
    () => 0
  );
const useVisibleHeight = () =>
  useSyncExternalStore(subscribeViewport, () => Math.round(window.visualViewport?.height ?? window.innerHeight), () => 800);

// ----------------------------------------------------------------------------- small parts

/** Keeps the editor's selection and the on-screen keyboard when a control is pressed. */
const keepFocus = (e: React.MouseEvent | React.PointerEvent) => e.preventDefault();

interface ToolbarButtonProps {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  popup?: boolean;
  expanded?: boolean;
  wide?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ label, shortcut, active, disabled, onClick, children, popup, expanded, wide }) => (
  <button
    type="button"
    data-tb=""
    title={shortcut ? `${label} (${shortcut})` : label}
    aria-label={label}
    aria-pressed={popup || active === undefined ? undefined : active}
    aria-haspopup={popup ? 'dialog' : undefined}
    aria-expanded={popup ? !!expanded : undefined}
    disabled={disabled}
    onMouseDown={keepFocus}
    onClick={onClick}
    className={`shrink-0 inline-flex items-center justify-center gap-0.5 h-11 md:h-8 ${
      wide ? 'min-w-11 md:min-w-8 px-2.5 md:px-2' : 'w-11 md:w-8'
    } rounded-lg text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#561C08]/50 disabled:opacity-35 disabled:pointer-events-none ${
      active ? 'bg-[#561C08] text-white' : expanded ? 'bg-stone-200 text-stone-900' : 'text-stone-700 hover:bg-stone-100'
    }`}
  >
    {children}
  </button>
);

const Divider = () => <span aria-hidden="true" className="shrink-0 w-px h-6 md:h-5 bg-stone-200 mx-1" />;

interface MenuProps {
  open: boolean;
  title: string;
  isMobile: boolean;
  alignRight: boolean;
  onClose: () => void;
  children: React.ReactNode;
  panelRef: React.RefObject<HTMLDivElement | null>;
  /** Width on desktop */
  width?: number;
}

/** Desktop: dropdown under the button. Mobile: bottom sheet that stays above the keyboard. */
const Menu: React.FC<MenuProps> = ({ open, title, isMobile, alignRight, onClose, children, panelRef, width = 240 }) => {
  const keyboardInset = useKeyboardInset();
  if (!open) return null;

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[80]" role="presentation">
        <div className="absolute inset-0 bg-stone-950/30" onMouseDown={e => { e.preventDefault(); onClose(); }} />
        <div
          ref={panelRef}
          role="dialog"
          aria-label={title}
          className="absolute inset-x-0 bg-white rounded-t-2xl shadow-bottom-sheet border-t border-stone-200 max-h-[70dvh] overflow-y-auto overscroll-contain"
          style={{ bottom: keyboardInset }}
        >
          <div className="sticky top-0 bg-white flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{title}</span>
            <button
              type="button"
              onMouseDown={keepFocus}
              onClick={onClose}
              aria-label="Close"
              className="w-11 h-11 -mr-2 inline-flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      className={`absolute top-full mt-1.5 z-40 bg-white border border-stone-200 rounded-xl shadow-lg p-2 ${alignRight ? 'right-0' : 'left-0'}`}
      style={{ width, maxWidth: 'calc(100vw - 1.5rem)' }}
    >
      {children}
    </div>
  );
};

const MenuItem: React.FC<{ selected?: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }> = ({
  selected,
  onClick,
  children,
  disabled,
}) => (
  <button
    type="button"
    role="menuitemradio"
    aria-checked={!!selected}
    disabled={disabled}
    onMouseDown={keepFocus}
    onClick={onClick}
    className={`w-full flex items-center justify-between gap-3 px-3 min-h-11 md:min-h-9 rounded-lg text-left text-sm text-stone-800 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#561C08]/40 disabled:opacity-60 ${
      selected ? 'bg-stone-100' : ''
    }`}
  >
    <span className="min-w-0">{children}</span>
    {selected && <Check size={15} className="shrink-0 text-[#561C08]" />}
  </button>
);

const Swatches: React.FC<{
  colors: { name: string; value: string }[];
  current: string | null;
  kind: 'text' | 'highlight';
  onPick: (value: string) => void;
}> = ({ colors, current, kind, onPick }) => (
  <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
    {colors.map(color => {
      const selected = (current || '').toLowerCase() === color.value.toLowerCase();
      return (
        <button
          key={color.value}
          type="button"
          title={color.name}
          aria-label={color.name}
          aria-pressed={selected}
          onMouseDown={keepFocus}
          onClick={() => onPick(color.value)}
          className={`h-11 md:h-9 rounded-lg border flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#561C08]/50 ${
            selected ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200'
          }`}
          style={kind === 'text' ? { color: color.value } : { backgroundColor: color.value, color: '#1C1917' }}
        >
          {selected ? <Check size={15} /> : <span className="text-sm font-bold">A</span>}
        </button>
      );
    })}
  </div>
);

// ----------------------------------------------------------------------------- link form

const LinkForm: React.FC<{
  editor: Editor;
  onDone: () => void;
}> = ({ editor, onDone }) => {
  const existing = editor.getAttributes('link') as { href?: string; target?: string | null };
  const isLink = editor.isActive('link');
  const needsText = editor.state.selection.empty && !isLink;
  const [url, setUrl] = useState(existing.href || '');
  const [text, setText] = useState('');
  const [newTab, setNewTab] = useState(existing.target === '_blank');
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    const href = normalizeLinkInput(url);
    if (!href) {
      setError('Enter a web address (https://…), an email address or a phone number.');
      return;
    }
    const attrs = linkAttributes(href, newTab);
    if (needsText) {
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text: text.trim() || href.replace(/^(mailto:|tel:)/, ''), marks: [{ type: 'link', attrs }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink(attrs).run();
    }
    onDone();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onDone();
  };

  // Enter applies the link instead of submitting the page form around the editor
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      apply();
    }
  };

  const inputClass =
    'w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-base md:text-sm text-stone-900 focus:outline-none focus:border-stone-800';

  return (
    <div className="space-y-3 md:p-1">
      <div>
        <label htmlFor="rte-link-url" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
          Link address
        </label>
        <input
          id="rte-link-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          autoFocus
          value={url}
          onChange={e => {
            setUrl(e.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="https://example.com"
          aria-invalid={!!error}
          aria-describedby={error ? 'rte-link-error' : undefined}
          className={inputClass}
        />
        {error && (
          <p id="rte-link-error" className="mt-1 text-[11px] text-rose-600">
            {error}
          </p>
        )}
      </div>
      {needsText && (
        <div>
          <label htmlFor="rte-link-text" className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
            Text to show (optional)
          </label>
          <input id="rte-link-text" type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={onKeyDown} className={inputClass} />
        </div>
      )}
      <label className="flex items-center gap-2.5 min-h-11 md:min-h-8 text-sm text-stone-700 cursor-pointer">
        <input type="checkbox" checked={newTab} onChange={e => setNewTab(e.target.checked)} className="w-4 h-4 accent-[#561C08]" />
        Open in a new tab
      </label>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={apply}
          className="flex-1 md:flex-none px-4 min-h-11 md:min-h-9 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
        >
          {isLink ? 'Update link' : 'Add link'}
        </button>
        {isLink && (
          <button
            type="button"
            onClick={remove}
            className="px-3 min-h-11 md:min-h-9 border border-stone-200 rounded-xl font-bold text-xs uppercase tracking-wider text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5"
          >
            <Unlink size={13} />
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------- editor

const EDITOR_CSS = `
  .rte-toolbar { scrollbar-width: none; }
  .rte-toolbar::-webkit-scrollbar { display: none; }
  .rte-content .ProseMirror { outline: none; min-height: 18rem; }
  .rte-content .ProseMirror a { cursor: text; }
  .rte-content .ProseMirror hr.ProseMirror-selectednode { outline: 2px solid rgba(86, 28, 8, 0.35); outline-offset: 2px; }
  .rte-content .ProseMirror ::selection { background: rgba(86, 28, 8, 0.16); }
`;

const HEADING_LABELS: Record<number, string> = { 0: 'Paragraph', 1: 'Heading 1 (legacy)', 2: 'Heading 2', 3: 'Heading 3' };
const HEADING_SHORT: Record<number, string> = { 0: 'P', 1: 'H1', 2: 'H2', 3: 'H3' };

const pretty = (html: string) => html.replace(/(<\/(p|h[1-6]|li|ul|ol|blockquote)>|<hr>)(?!\n)/g, '$1\n').trim();

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  id,
  initialValue,
  onChange,
  disabled = false,
  placeholder = 'Start writing…',
  invalid = false,
  describedBy,
  labelledBy,
  previewTitle,
}) => {
  const isMobile = useIsMobile();
  const visibleHeight = useVisibleHeight();

  // Content at mount; when the editor output equals its own first rendering of this value,
  // the original string is reported back unchanged, so opening a page never rewrites it.
  const [initial] = useState(initialValue);
  const baselineRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [mode, setMode] = useState<Mode>('write');
  const [value, setValue] = useState(initial);
  const [sourceText, setSourceText] = useState('');
  const [sourceIssues, setSourceIssues] = useState<{ issues: string[]; next: Mode } | null>(null);
  const [menu, setMenu] = useState<{ name: MenuName; alignRight: boolean } | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openLinkRef = useRef<() => void>(() => {});
  const sourceEditedRef = useRef(false);

  const emit = useCallback((html: string) => {
    const normalized = normalizeEditorHtml(html);
    const next = normalized === baselineRef.current ? initial : normalized;
    setValue(next);
    onChangeRef.current(next);
  }, [initial]);

  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: initial,
    editable: !disabled,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        ...(labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': 'Page content' }),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        class: 'cms-prose text-base font-sans text-stone-800 leading-relaxed px-4 py-4 sm:px-6 sm:py-5',
      },
      transformPastedHTML: html => cleanPastedHtml(html),
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          // Inside the editor Ctrl/Cmd+K means "link", not the admin command search (a window listener)
          event.stopPropagation();
          openLinkRef.current();
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor: created }) => {
      baselineRef.current = normalizeEditorHtml(created.getHTML());
    },
    onUpdate: ({ editor: updated }) => emit(updated.getHTML()),
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  // The view may not be mounted yet (and React re-runs effects in development), so these
  // run now if the editor is ready and otherwise when it is created
  useEffect(() => {
    if (!editor) return;
    const apply = () => {
      if (editor.isDestroyed || !editor.isInitialized) return;
      if (editor.isEditable === disabled) editor.setEditable(!disabled, false);
      editor.view.dom.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    };
    apply();
    editor.on('create', apply);
    return () => {
      editor.off('create', apply);
    };
  }, [editor, disabled, invalid]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const { $from } = e.state.selection;
      let listType: 'bulletList' | 'orderedList' | null = null;
      let listStyle: string | null = null;
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
          listType = node.type.name;
          listStyle = (node.attrs.listStyleType as string | null) || null;
          break;
        }
      }
      const textStyle = e.getAttributes('textStyle') as { color?: string; backgroundColor?: string };
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        heading: [1, 2, 3].find(level => e.isActive('heading', { level })) ?? 0,
        color: textStyle.color || null,
        highlight: textStyle.backgroundColor || null,
        align: (['center', 'right', 'justify'] as const).find(a => e.isActive({ textAlign: a })) ?? 'left',
        listType,
        listStyle,
        link: e.isActive('link'),
        blockquote: e.isActive('blockquote'),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        canIndent: e.can().sinkListItem('listItem'),
        canOutdent: e.can().liftListItem('listItem'),
        isEmpty: e.isEmpty,
      };
    },
  });

  // ---------------------------------------------------------------- menus

  const closeMenu = useCallback(() => setMenu(null), []);

  const toggleMenu = (name: MenuName, e: React.MouseEvent<HTMLButtonElement>, width = 240) => {
    if (menu?.name === name) return setMenu(null);
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ name, alignRight: rect.left + width > window.innerWidth - 12 });
  };

  // Ctrl/Cmd+K opens the link dialog (the editor's key handler calls the latest version)
  useEffect(() => {
    openLinkRef.current = () => {
      if (disabled || mode !== 'write') return;
      const button = toolbarRef.current?.querySelector<HTMLElement>('[data-menu="link"]');
      const rect = button?.getBoundingClientRect();
      setMenu({ name: 'link', alignRight: rect ? rect.left + 300 > window.innerWidth - 12 : false });
    };
  }, [disabled, mode]);

  // Desktop dropdowns: close on outside click and Escape
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as Element).closest?.(`[data-menu="${menu.name}"]`)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMenu(null);
        editor?.commands.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [menu, editor]);

  // ---------------------------------------------------------------- toolbar keyboard navigation (roving tabindex)

  const rovingIndex = useRef(0);
  const toolbarItems = () =>
    Array.from(toolbarRef.current?.querySelectorAll<HTMLButtonElement>('[data-tb]:not(:disabled)') || []);
  useLayoutEffect(() => {
    const items = toolbarItems();
    if (rovingIndex.current >= items.length) rovingIndex.current = 0;
    items.forEach((item, index) => {
      item.tabIndex = index === rovingIndex.current ? 0 : -1;
    });
  });
  const onToolbarFocus = (e: React.FocusEvent) => {
    const index = toolbarItems().indexOf(e.target as HTMLButtonElement);
    if (index >= 0) rovingIndex.current = index;
  };
  const onToolbarKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.target as HTMLElement).hasAttribute?.('data-tb')) return;
    const items = toolbarItems();
    const current = items.indexOf(e.target as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowRight') next = (current + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    items.forEach((item, index) => {
      item.tabIndex = index === next ? 0 : -1;
    });
    rovingIndex.current = next;
    items[next].focus();
    items[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  // ---------------------------------------------------------------- mobile: keep the toolbar visible above the keyboard

  useEffect(() => {
    if (!isMobile || !isFocused || mode !== 'write') return;
    const t = window.setTimeout(() => {
      const shell = shellRef.current;
      if (!shell) return;
      const top = shell.getBoundingClientRect().top;
      if (top < HEADER_OFFSET - 1 || top > HEADER_OFFSET + 8) {
        window.scrollTo({ top: window.scrollY + top - HEADER_OFFSET, behavior: 'smooth' });
      }
      editor?.commands.scrollIntoView();
    }, 320); // after the keyboard has opened
    return () => window.clearTimeout(t);
  }, [isMobile, isFocused, mode, editor]);

  const toolbarHeight = isMobile ? 48 : 0;
  const mobileContentMax =
    isMobile && isFocused && mode === 'write' ? Math.max(160, visibleHeight - HEADER_OFFSET - toolbarHeight - 12) : undefined;

  // ---------------------------------------------------------------- modes

  const enterSource = () => {
    if (!editor) return;
    setMenu(null);
    setSourceText(pretty(value));
    sourceEditedRef.current = false;
    setMode('source');
  };

  const leaveSource = (next: Mode, force = false) => {
    if (!editor) return;
    if (!force) {
      const issues = validateSourceHtml(sourceText);
      if (issues.length) {
        setSourceIssues({ issues, next });
        return;
      }
    }
    setSourceIssues(null);
    if (sourceEditedRef.current) {
      sourceEditedRef.current = false;
      editor.commands.setContent(sourceText, { emitUpdate: true });
    }
    setMode(next);
    if (next === 'write') window.setTimeout(() => editor.commands.focus(), 0);
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (mode === 'source') return leaveSource(next);
    setMenu(null);
    if (next === 'source') return enterSource();
    setMode(next);
  };

  if (!editor || !state) return null;

  const run = (fn: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => fn(editor.chain().focus()).run();
  const formatDisabled = disabled || mode !== 'write';

  const setListStyleFor = (list: 'bulletList' | 'orderedList', style: string) => {
    const defaultStyle = list === 'bulletList' ? 'disc' : 'decimal';
    const styleValue = style === defaultStyle ? null : style;
    run(chain => {
      const next = state.listType === list ? chain : list === 'bulletList' ? chain.toggleBulletList() : chain.toggleOrderedList();
      return next.setListStyle(styleValue);
    });
    setMenu(null);
  };

  const stats = countWords(value);
  const menuOpen = (name: MenuName) => menu?.name === name;
  const currentBullet = state.listType === 'bulletList' ? state.listStyle || 'disc' : null;
  const currentNumber = state.listType === 'orderedList' ? state.listStyle || 'decimal' : null;

  return (
    <div
      ref={shellRef}
      className={`rte-shell bg-white border rounded-xl transition-shadow ${
        invalid ? 'border-rose-300' : 'border-stone-200'
      } ${isFocused ? 'ring-2 ring-[#561C08]/15 border-stone-400' : ''}`}
      style={{ scrollMarginTop: HEADER_OFFSET }}
    >
      <style>{CMS_PROSE_CSS + EDITOR_CSS}</style>

      {/* Write / Preview */}
      <div className="flex items-center justify-between gap-2 px-2 pt-2 md:px-3">
        <div role="tablist" aria-label="Editor view" className="inline-flex bg-stone-100 rounded-lg p-0.5">
          {(
            [
              ['write', 'Write', PenLine],
              ['preview', 'Preview', Eye],
            ] as const
          ).map(([tab, label, Icon]) => {
            const selected = tab === 'write' ? mode !== 'preview' : mode === 'preview';
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => switchMode(tab === 'write' && mode === 'source' ? 'source' : tab)}
                className={`inline-flex items-center gap-1.5 px-3 min-h-10 md:min-h-8 rounded-md text-[11px] font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#561C08]/40 ${
                  selected ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>
        <span className="text-[10px] text-stone-400 tabular-nums whitespace-nowrap" aria-live="polite">
          {stats.words} {stats.words === 1 ? 'word' : 'words'} · {stats.characters} chars
        </span>
      </div>

      {mode !== 'preview' && (
        <div
          ref={toolbarRef}
          role="toolbar"
          aria-label="Formatting"
          aria-controls={id}
          onFocus={onToolbarFocus}
          onKeyDown={onToolbarKeyDown}
          className="rte-toolbar sticky z-20 mt-2 bg-white/95 backdrop-blur-sm border-y border-stone-100 flex flex-nowrap md:flex-wrap items-center gap-0.5 px-1.5 py-1 overflow-x-auto md:overflow-visible"
          style={{ top: HEADER_OFFSET }}
        >
          <ToolbarButton label="Undo" shortcut={`${MOD}+Z`} disabled={formatDisabled || !state.canUndo} onClick={() => run(c => c.undo())}>
            <Undo2 size={16} />
          </ToolbarButton>
          <ToolbarButton label="Redo" shortcut={IS_MAC ? '⌘+Shift+Z' : 'Ctrl+Y'} disabled={formatDisabled || !state.canRedo} onClick={() => run(c => c.redo())}>
            <Redo2 size={16} />
          </ToolbarButton>
          <Divider />

          {/* Headings */}
          <div className="relative shrink-0" data-menu="heading">
            <ToolbarButton
              label={`Text style: ${HEADING_LABELS[state.heading]}`}
              popup
              expanded={menuOpen('heading')}
              disabled={formatDisabled}
              wide
              onClick={e => toggleMenu('heading', e, 220)}
            >
              <span className="md:hidden">{HEADING_SHORT[state.heading]}</span>
              <span className="hidden md:inline min-w-[5.5rem] text-left text-xs">{HEADING_LABELS[state.heading].replace(' (legacy)', '')}</span>
              <ChevronDown size={13} />
            </ToolbarButton>
            <Menu open={menuOpen('heading')} title="Text style" isMobile={isMobile} alignRight={!!menu?.alignRight} onClose={closeMenu} panelRef={panelRef} width={220}>
              <div role="menu" aria-label="Text style" className="space-y-0.5">
                <MenuItem selected={state.heading === 0} onClick={() => { run(c => c.setParagraph()); closeMenu(); }}>
                  Paragraph
                </MenuItem>
                <MenuItem selected={state.heading === 2} onClick={() => { run(c => c.setHeading({ level: 2 })); closeMenu(); }}>
                  <span className="text-lg font-semibold">Heading 2</span>
                </MenuItem>
                <MenuItem selected={state.heading === 3} onClick={() => { run(c => c.setHeading({ level: 3 })); closeMenu(); }}>
                  <span className="text-base font-semibold">Heading 3</span>
                </MenuItem>
                {state.heading === 1 && (
                  <MenuItem selected disabled onClick={() => {}}>
                    <span className="text-stone-500">Heading 1 (legacy — the page title is already the H1)</span>
                  </MenuItem>
                )}
              </div>
            </Menu>
          </div>
          <Divider />

          <ToolbarButton label="Bold" shortcut={`${MOD}+B`} active={state.bold} disabled={formatDisabled} onClick={() => run(c => c.toggleBold())}>
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton label="Italic" shortcut={`${MOD}+I`} active={state.italic} disabled={formatDisabled} onClick={() => run(c => c.toggleItalic())}>
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton label="Underline" shortcut={`${MOD}+U`} active={state.underline} disabled={formatDisabled} onClick={() => run(c => c.toggleUnderline())}>
            <Underline size={16} />
          </ToolbarButton>
          <ToolbarButton label="Strikethrough" shortcut={`${MOD}+Shift+S`} active={state.strike} disabled={formatDisabled} onClick={() => run(c => c.toggleStrike())}>
            <Strikethrough size={16} />
          </ToolbarButton>
          <Divider />

          {/* Colors */}
          <div className="relative shrink-0" data-menu="color">
            <ToolbarButton label="Text color" popup expanded={menuOpen('color')} disabled={formatDisabled} onClick={e => toggleMenu('color', e, 220)}>
              <span className="flex flex-col items-center leading-none">
                <Baseline size={16} />
                <span className="block w-4 h-[3px] rounded-full -mt-0.5" style={{ backgroundColor: state.color || '#44403C' }} />
              </span>
            </ToolbarButton>
            <Menu open={menuOpen('color')} title="Text color" isMobile={isMobile} alignRight={!!menu?.alignRight} onClose={closeMenu} panelRef={panelRef} width={220}>
              <Swatches colors={TEXT_COLORS} current={state.color} kind="text" onPick={v => { run(c => c.setColor(v)); closeMenu(); }} />
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => { run(c => c.unsetColor()); closeMenu(); }}
                className="mt-2 w-full min-h-11 md:min-h-9 rounded-lg border border-stone-200 text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50"
              >
                Reset color
              </button>
            </Menu>
          </div>
          <div className="relative shrink-0" data-menu="highlight">
            <ToolbarButton label="Highlight" popup expanded={menuOpen('highlight')} disabled={formatDisabled} onClick={e => toggleMenu('highlight', e, 220)}>
              <span className="flex flex-col items-center leading-none">
                <Highlighter size={16} />
                <span className="block w-4 h-[3px] rounded-full -mt-0.5 border border-stone-200" style={{ backgroundColor: state.highlight || 'transparent' }} />
              </span>
            </ToolbarButton>
            <Menu open={menuOpen('highlight')} title="Highlight" isMobile={isMobile} alignRight={!!menu?.alignRight} onClose={closeMenu} panelRef={panelRef} width={220}>
              <Swatches colors={HIGHLIGHT_COLORS} current={state.highlight} kind="highlight" onPick={v => { run(c => c.setBackgroundColor(v)); closeMenu(); }} />
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => { run(c => c.unsetBackgroundColor()); closeMenu(); }}
                className="mt-2 w-full min-h-11 md:min-h-9 rounded-lg border border-stone-200 text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50"
              >
                No highlight
              </button>
            </Menu>
          </div>
          <Divider />

          {/* Lists — each list button stays on the same row as its style arrow */}
          <div className="shrink-0 flex items-center">
          <ToolbarButton label="Bullet list" active={state.listType === 'bulletList'} disabled={formatDisabled} onClick={() => run(c => c.toggleBulletList())}>
            <List size={16} />
          </ToolbarButton>
          <div className="relative shrink-0 -ml-0.5" data-menu="bullets">
            <ToolbarButton label="Bullet style" popup expanded={menuOpen('bullets')} disabled={formatDisabled} onClick={e => toggleMenu('bullets', e, 200)}>
              <ChevronDown size={13} />
            </ToolbarButton>
            <Menu open={menuOpen('bullets')} title="Bullet style" isMobile={isMobile} alignRight={!!menu?.alignRight} onClose={closeMenu} panelRef={panelRef} width={200}>
              <div role="menu" aria-label="Bullet style" className="space-y-0.5">
                {BULLET_STYLES.map(s => (
                  <MenuItem key={s.value} selected={currentBullet === s.value} onClick={() => setListStyleFor('bulletList', s.value)}>
                    <span className="inline-block w-6 text-center text-lg leading-none">{s.marker}</span> {s.label}
                  </MenuItem>
                ))}
              </div>
            </Menu>
          </div>
          </div>
          <div className="shrink-0 flex items-center">
          <ToolbarButton label="Numbered list" active={state.listType === 'orderedList'} disabled={formatDisabled} onClick={() => run(c => c.toggleOrderedList())}>
            <ListOrdered size={16} />
          </ToolbarButton>
          <div className="relative shrink-0 -ml-0.5" data-menu="numbers">
            <ToolbarButton label="Number style" popup expanded={menuOpen('numbers')} disabled={formatDisabled} onClick={e => toggleMenu('numbers', e, 210)}>
              <ChevronDown size={13} />
            </ToolbarButton>
            <Menu open={menuOpen('numbers')} title="Number style" isMobile={isMobile} alignRight={!!menu?.alignRight} onClose={closeMenu} panelRef={panelRef} width={210}>
              <div role="menu" aria-label="Number style" className="space-y-0.5">
                {NUMBER_STYLES.map(s => (
                  <MenuItem key={s.value} selected={currentNumber === s.value} onClick={() => setListStyleFor('orderedList', s.value)}>
                    <span className="inline-block w-16 text-stone-500 font-mono text-xs">{s.marker}</span> {s.label}
                  </MenuItem>
                ))}
              </div>
            </Menu>
          </div>
          </div>
          <ToolbarButton label="Decrease indent" shortcut="Shift+Tab" disabled={formatDisabled || !state.canOutdent} onClick={() => run(c => c.liftListItem('listItem'))}>
            <IndentDecrease size={16} />
          </ToolbarButton>
          <ToolbarButton label="Increase indent" shortcut="Tab" disabled={formatDisabled || !state.canIndent} onClick={() => run(c => c.sinkListItem('listItem'))}>
            <IndentIncrease size={16} />
          </ToolbarButton>
          <Divider />

          {/* Alignment */}
          <ToolbarButton label="Align left" active={state.align === 'left'} disabled={formatDisabled} onClick={() => run(c => c.unsetTextAlign())}>
            <AlignLeft size={16} />
          </ToolbarButton>
          <ToolbarButton label="Align center" active={state.align === 'center'} disabled={formatDisabled} onClick={() => run(c => c.setTextAlign('center'))}>
            <AlignCenter size={16} />
          </ToolbarButton>
          <ToolbarButton label="Align right" active={state.align === 'right'} disabled={formatDisabled} onClick={() => run(c => c.setTextAlign('right'))}>
            <AlignRight size={16} />
          </ToolbarButton>
          <ToolbarButton label="Justify" active={state.align === 'justify'} disabled={formatDisabled} onClick={() => run(c => c.setTextAlign('justify'))}>
            <AlignJustify size={16} />
          </ToolbarButton>
          <Divider />

          {/* Extras */}
          <div className="relative shrink-0" data-menu="link">
            <ToolbarButton
              label={state.link ? 'Edit link' : 'Add link'}
              shortcut={`${MOD}+K`}
              popup
              expanded={menuOpen('link')}
              disabled={formatDisabled}
              onClick={e => toggleMenu('link', e, 300)}
            >
              <Link2 size={16} className={state.link ? 'text-[#561C08]' : undefined} />
            </ToolbarButton>
            <Menu open={menuOpen('link')} title={state.link ? 'Edit link' : 'Add link'} isMobile={isMobile} alignRight={!!menu?.alignRight} onClose={closeMenu} panelRef={panelRef} width={300}>
              <LinkForm editor={editor} onDone={closeMenu} />
            </Menu>
          </div>
          <ToolbarButton label="Quote" active={state.blockquote} disabled={formatDisabled} onClick={() => run(c => c.toggleBlockquote())}>
            <Quote size={16} />
          </ToolbarButton>
          <ToolbarButton label="Divider" disabled={formatDisabled} onClick={() => run(c => c.setHorizontalRule())}>
            <Minus size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Clear formatting"
            disabled={formatDisabled}
            onClick={() => run(c => c.unsetAllMarks().clearNodes().unsetTextAlign())}
          >
            <RemoveFormatting size={16} />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            label={mode === 'source' ? 'Back to the visual editor' : 'Edit HTML source'}
            active={mode === 'source'}
            disabled={disabled}
            wide
            onClick={() => (mode === 'source' ? switchMode('write') : switchMode('source'))}
          >
            <CodeXml size={16} />
            <span className="text-[11px] font-bold">HTML</span>
          </ToolbarButton>
        </div>
      )}

      {/* Write */}
      <div className={mode === 'write' ? 'relative' : 'hidden'}>
        {state.isEmpty && (
          <p aria-hidden="true" className="pointer-events-none absolute left-4 top-4 sm:left-6 sm:top-5 text-base text-stone-400 select-none">
            {placeholder}
          </p>
        )}
        <div className="rte-content" style={mobileContentMax ? { maxHeight: mobileContentMax, overflowY: 'auto' } : undefined}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Source */}
      {mode === 'source' && (
        <div className="p-2 md:p-3 space-y-2">
          <textarea
            aria-label="HTML source"
            spellCheck={false}
            value={sourceText}
            onChange={e => {
              setSourceText(e.target.value);
              setSourceIssues(null);
              sourceEditedRef.current = true;
              // Saving while in the source view saves exactly what is typed here
              const raw = e.target.value.trim();
              setValue(raw);
              onChangeRef.current(raw);
            }}
            className="w-full min-h-[18rem] p-3 bg-stone-50 border border-stone-200 rounded-lg font-mono text-base md:text-xs leading-relaxed text-stone-800 focus:outline-none focus:border-stone-800"
          />
          {sourceIssues && (
            <div role="alert" className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <TriangleAlert size={14} />
                Check the HTML before switching back
              </p>
              <ul className="list-disc pl-5 space-y-0.5">
                {sourceIssues.issues.map(issue => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSourceIssues(null)}
                  className="px-3 min-h-10 md:min-h-8 bg-white border border-amber-300 rounded-lg font-bold uppercase tracking-wider text-[10px]"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={() => leaveSource(sourceIssues.next, true)}
                  className="px-3 min-h-10 md:min-h-8 bg-amber-900 text-white rounded-lg font-bold uppercase tracking-wider text-[10px]"
                >
                  Continue anyway
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview — same sanitizer, prose styles and content cards as the storefront page */}
      {mode === 'preview' && (
        <div className="p-2 md:p-3">
          <div className="bg-allura-bg rounded-2xl p-3 sm:p-5">
            {value.trim() ? (
              <CmsContentCards html={prepareCmsHtml(value)} pageTitle={previewTitle} idPrefix={`${id}-preview`} />
            ) : (
              <p className="text-sm text-stone-500 text-center py-10">Nothing to preview yet.</p>
            )}
          </div>
        </div>
      )}

      <p className="px-3 py-2 border-t border-stone-100 text-[10px] text-stone-400">
        {mode === 'source'
          ? 'HTML is checked when you switch back. Scripts and unsupported tags are removed.'
          : mode === 'preview'
            ? 'Preview uses the storefront styles and sanitizer.'
            : 'Tab / Shift+Tab indents list items. Pasted text keeps bold, italic, lists and links only.'}
      </p>
    </div>
  );
};

export default TiptapEditor;
