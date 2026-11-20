import React, { Suspense, lazy, useState } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

// -----------------------------------------------------------------------------
// Rich text (WYSIWYG) editor for HTML content fields in the admin, e.g. the CMS
// "Editorial Content" field. Produces a single HTML string.
//
// - The Tiptap editor is loaded lazily (its own chunk), only when this renders.
// - While it loads, a skeleton of the same size is shown.
// - If it fails to load (or crashes), the plain textarea is shown instead, so the
//   admin can still edit the HTML and save.
// - Change `resetKey` to load other content (e.g. another page): the editor is
//   remounted, so no content or undo history carries over.
// -----------------------------------------------------------------------------

export interface RichTextEditorProps {
  /** id of the editable element (use it as the label's htmlFor) */
  id: string;
  value: string;
  onChange: (html: string) => void;
  /** Remount with fresh content and undo history when this changes */
  resetKey: string;
  disabled?: boolean;
  /** Error shown under the field (e.g. a backend validation message) */
  error?: string | null;
  placeholder?: string;
  /** id of the visible label element */
  labelledBy?: string;
  /** Page title for the Preview (optional) */
  previewTitle?: string;
}

const loadEditor = () => import('./TiptapEditor');

// React.lazy keeps a failed load, so "Try again" swaps in a new lazy component
let LazyTiptapEditor = lazy(loadEditor);
const retryLazyEditor = () => {
  LazyTiptapEditor = lazy(loadEditor);
};

const EditorSkeleton: React.FC = () => (
  <div className="bg-white border border-stone-200 rounded-xl animate-pulse" aria-busy="true" aria-label="Loading editor">
    <div className="flex items-center justify-between px-2 pt-2 md:px-3">
      <div className="h-10 md:h-9 w-40 bg-stone-100 rounded-lg" />
      <div className="h-3 w-20 bg-stone-100 rounded" />
    </div>
    <div className="mt-2 h-[50px] md:h-[42px] border-y border-stone-100 flex items-center gap-1.5 px-2">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-8 w-8 md:h-6 md:w-6 bg-stone-100 rounded-md shrink-0" />
      ))}
    </div>
    <div className="min-h-[18rem] px-4 py-5 sm:px-6 space-y-3">
      <div className="h-4 w-3/4 bg-stone-100 rounded" />
      <div className="h-4 w-full bg-stone-100 rounded" />
      <div className="h-4 w-5/6 bg-stone-100 rounded" />
    </div>
    <div className="h-[33px] border-t border-stone-100" />
  </div>
);

interface BoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

class EditorErrorBoundary extends React.Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[RichTextEditor] Falling back to the plain textarea:', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  value,
  onChange,
  resetKey,
  disabled,
  error,
  placeholder,
  labelledBy,
  previewTitle,
}) => {
  const [attempt, setAttempt] = useState(0);

  const errorId = `${id}-error`;

  const fallback = (
    <div className="space-y-2">
      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <TriangleAlert size={13} className="shrink-0" />
          The rich text editor could not be loaded. You can still edit the HTML below and save.
        </span>
        <button
          type="button"
          onClick={() => {
            retryLazyEditor();
            setAttempt(a => a + 1);
          }}
          className="shrink-0 inline-flex items-center gap-1 font-bold underline"
        >
          <RefreshCw size={12} />
          Try again
        </button>
      </div>
      {/* The original plain textarea */}
      <textarea
        id={id}
        rows={10}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        aria-labelledby={labelledBy}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs font-sans leading-relaxed text-stone-800"
      />
    </div>
  );

  return (
    <div>
      <EditorErrorBoundary key={attempt} fallback={fallback}>
        <Suspense fallback={<EditorSkeleton />}>
          <LazyTiptapEditor
            key={resetKey}
            id={id}
            initialValue={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            invalid={!!error}
            describedBy={error ? errorId : undefined}
            labelledBy={labelledBy}
            previewTitle={previewTitle}
          />
        </Suspense>
      </EditorErrorBoundary>
      {error && (
        <p id={errorId} className="mt-1 text-[11px] text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default RichTextEditor;
