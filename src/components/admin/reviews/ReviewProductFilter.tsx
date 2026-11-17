import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Loader2, Package, Search, X } from 'lucide-react';
import { useAdminProductOptions } from '../../../hooks/useAdminProductOptions';

const DEBOUNCE_MS = 400;
const MAX_RESULTS = 20;

interface ReviewProductFilterProps {
  productId?: string;
  onChange: (productId: string | undefined) => void;
}

/**
 * Product filter for the admin reviews list. Search is debounced (~400ms) over the
 * catalogue from the existing admin products service. The selected product is
 * shown as a removable chip.
 */
export const ReviewProductFilter: React.FC<ReviewProductFilterProps> = ({ productId, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const optionId = (index: number) => `${listId}-opt-${index}`;

  // Load when the picker is used, or to resolve the name of an already-selected product
  const { options, status, retry } = useAdminProductOptions(open || !!productId);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim().toLowerCase()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    if (!debounced) return options.slice(0, MAX_RESULTS);
    return options
      .filter(o => o.name.toLowerCase().includes(debounced) || o.sku?.toLowerCase().includes(debounced))
      .slice(0, MAX_RESULTS);
  }, [options, debounced]);

  const selected = productId ? options.find(o => o.id === productId) : undefined;
  const isSearching = query.trim().toLowerCase() !== debounced;

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
    setDebounced('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(i => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && open && results[activeIndex]) {
      e.preventDefault();
      choose(results[activeIndex].id);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (productId) {
    return (
      <span className="inline-flex items-center gap-2 max-w-full min-h-10 pl-2 pr-1 bg-stone-100 border border-stone-200 rounded-xl text-xs font-sans text-stone-800">
        {selected?.image ? (
          <img src={selected.image} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
        ) : (
          <Package size={14} className="text-stone-400 flex-shrink-0" />
        )}
        <span className="truncate">
          <span className="text-stone-400">Product:</span>{' '}
          <span className="font-semibold">
            {selected?.name || (status === 'loading' ? 'Loading…' : `#${productId.slice(-6)}`)}
          </span>
        </span>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200 flex-shrink-0"
          aria-label="Remove product filter"
        >
          <X size={14} />
        </button>
      </span>
    );
  }

  return (
    <div className="relative w-full sm:w-72">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[activeIndex] ? optionId(activeIndex) : undefined}
        aria-label="Filter reviews by product"
        placeholder="Filter by product…"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="w-full min-h-10 pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
      />
      {(isSearching || (open && status === 'loading')) && (
        <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Products"
          // Keep focus in the input while clicking an option
          onMouseDown={e => e.preventDefault()}
          className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-stone-200 rounded-xl shadow-lg py-1 text-xs font-sans"
        >
          {status === 'loading' && <li className="px-3 py-3 text-stone-400">Loading products…</li>}
          {status === 'error' && (
            <li className="px-3 py-3 text-rose-700 flex items-center justify-between gap-2">
              <span>Couldn't load products.</span>
              <button type="button" onClick={retry} className="font-bold underline">
                Retry
              </button>
            </li>
          )}
          {status === 'ready' && results.length === 0 && !isSearching && (
            <li className="px-3 py-3 text-stone-400">No products match "{query.trim()}".</li>
          )}
          {status === 'ready' &&
            results.map((option, index) => (
              <li
                key={option.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                onClick={() => choose(option.id)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex items-center gap-2.5 px-3 min-h-11 cursor-pointer ${index === activeIndex ? 'bg-stone-100' : ''}`}
              >
                {option.image ? (
                  <img src={option.image} alt="" loading="lazy" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                ) : (
                  <span className="w-7 h-7 rounded bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <Package size={13} className="text-stone-400" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-stone-900 font-medium">{option.name}</span>
                  {option.sku && <span className="block truncate text-[10px] text-stone-400 font-mono">{option.sku}</span>}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};
