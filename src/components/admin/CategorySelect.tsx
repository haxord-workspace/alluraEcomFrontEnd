import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Search, X, Loader2 } from 'lucide-react';
import { getCategories } from '../../service/category';
import type { Category } from '../../types';

interface CategorySelectProps {
  value: string;
  onChange: (categoryId: string, category?: Category) => void;
  placeholder?: string;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  placeholder = 'Select a category',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve the label for a pre-existing selected categoryId (edit mode)
  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }
    const match = categories.find(c => c.id === value);
    if (match) setSelectedLabel(match.name);
  }, [value, categories]);

  // Initial load — full category list
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getCategories()
      .then(data => { if (!cancelled) setCategories(data); })
      .catch(() => { if (!cancelled) setCategories([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Search-as-you-type — debounced backend call
  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setIsLoading(true);
      getCategories(query.trim() || undefined)
        .then(data => setCategories(data))
        .catch(() => setCategories([]))
        .finally(() => setIsLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  const handleSelect = (cat: Category) => {
    setSelectedLabel(cat.name);
    onChange(cat.id, cat);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLabel('');
    onChange('', undefined);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-left flex items-center justify-between gap-2 focus:outline-none focus:border-stone-800"
      >
        <span className={selectedLabel ? 'text-stone-900' : 'text-stone-400'}>
          {selectedLabel || placeholder}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {selectedLabel && (
            <X
              size={13}
              className="text-stone-400 hover:text-stone-700"
              onClick={handleClear}
            />
          )}
          <ChevronDown size={14} className="text-stone-400" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
          <div className="relative p-2 border-b border-stone-100">
            <Search size={13} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-7 pr-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-800"
            />
          </div>

          <div className="max-h-52 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 flex items-center justify-center gap-2 text-stone-400 text-[11px]">
                <Loader2 size={13} className="animate-spin" />
                Loading...
              </div>
            ) : categories.length === 0 ? (
              <div className="p-4 text-center text-stone-400 text-[11px]">
                No categories found.
              </div>
            ) : (
              categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 flex items-center justify-between ${
                    cat.id === value ? 'bg-stone-100 font-semibold text-stone-900' : 'text-stone-700'
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.status && cat.status !== 'ACTIVE' && (
                    <span className="text-[9px] uppercase text-stone-400">{cat.status}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
