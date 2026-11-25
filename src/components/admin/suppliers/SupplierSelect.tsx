import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { getSupplierSelection, isRequestAborted, toSupplierApiError } from '../../../service/adminSuppliers';
import { formatSupplierOption } from '../../../utils/supplierFormat';
import { SupplierStatusBadge } from './SupplierStatusBadge';
import type { ProductSupplierRef, SupplierSelectionItem } from '../../../types/suppliers';

type Option = SupplierSelectionItem & { status?: ProductSupplierRef['status'] };

interface SupplierSelectProps {
  id?: string;
  /** Selected supplier id; '' means "No supplier" */
  value: string;
  onChange: (supplierId: string, supplier?: ProductSupplierRef) => void;
  /**
   * The supplier the product had when the form opened. It is shown (with its status)
   * even when it is INACTIVE/BLOCKED and therefore missing from the ACTIVE-only list.
   */
  currentSupplier?: ProductSupplierRef | null;
  error?: string;
  /** Change this number to reload the options (e.g. after INVALID_SUPPLIER) */
  reloadToken?: number;
  disabled?: boolean;
}

/**
 * Searchable supplier picker for the product form.
 * Options come from GET /admin/suppliers/selection (ACTIVE only), searched as the user types.
 * Not gated by the Suppliers view permission: anyone who can create/edit products may use it.
 */
export const SupplierSelect: React.FC<SupplierSelectProps> = ({
  id,
  value,
  onChange,
  currentSupplier,
  error,
  reloadToken = 0,
  disabled = false,
}) => {
  const generatedId = useId();
  const buttonId = id || generatedId;
  const listId = `${buttonId}-list`;
  const errorId = `${buttonId}-error`;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [result, setResult] = useState<{ key: string; options: SupplierSelectionItem[]; error?: string } | null>(null);
  // Remembers the last picked option so its label survives a new search
  const [picked, setPicked] = useState<SupplierSelectionItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce typing by ~300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Load options: on mount (to resolve the label), on search, and on reloadToken
  const requestKey = `${debouncedQuery}#${reloadToken}`;
  useEffect(() => {
    const controller = new AbortController();
    getSupplierSelection({ search: debouncedQuery || undefined, limit: 20 }, { signal: controller.signal })
      .then(list => setResult({ key: requestKey, options: list }))
      .catch(err => {
        if (isRequestAborted(err)) return;
        setResult({ key: requestKey, options: [], error: toSupplierApiError(err, 'Could not load suppliers').message });
      });
    return () => controller.abort();
  }, [debouncedQuery, requestKey]);

  const isLoading = result?.key !== requestKey;
  // Keep showing the previous options while a new search loads
  const options = useMemo(() => result?.options ?? [], [result]);
  const loadError = isLoading ? null : result?.error ?? null;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // current supplier (if not in the fetched list) + fetched options
  const allOptions = useMemo<Option[]>(() => {
    const list: Option[] = options.map(o => ({ ...o, status: 'ACTIVE' as const }));
    if (currentSupplier && !options.some(o => o._id === currentSupplier._id)) {
      const q = debouncedQuery.toLowerCase();
      const matches =
        !q ||
        [currentSupplier.name, currentSupplier.supplierCode, currentSupplier.companyName, currentSupplier.contactPerson]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q));
      if (matches) list.unshift(currentSupplier);
    }
    return list;
  }, [options, currentSupplier, debouncedQuery]);

  const selected: Option | null = useMemo(() => {
    if (!value) return null;
    if (currentSupplier?._id === value) return currentSupplier;
    return allOptions.find(o => o._id === value) ?? (picked?._id === value ? picked : null);
  }, [value, currentSupplier, allOptions, picked]);

  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [disabled]);

  const choose = (option: Option | null) => {
    setPicked(option);
    onChange(option?._id ?? '', option ? { ...option, status: option.status ?? 'ACTIVE' } : undefined);
    setQuery('');
    setIsOpen(false);
  };

  const triggerLabel = selected ? formatSupplierOption(selected) : value ? 'Loading supplier…' : 'No supplier';
  const showSelectedStatus = selected?.status && selected.status !== 'ACTIVE';

  return (
    <div ref={containerRef} className="relative">
      <button
        id={buttonId}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={e => {
          if (e.key === 'Escape') setIsOpen(false);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`w-full p-2.5 bg-stone-50 border rounded-xl text-left flex items-center justify-between gap-2 focus:outline-none focus:border-stone-800 disabled:opacity-60 ${
          error ? 'border-rose-400' : 'border-stone-200'
        }`}
      >
        <span className={`flex items-center gap-2 min-w-0 ${selected ? 'text-stone-900' : 'text-stone-400'}`}>
          <span className="truncate" title={triggerLabel}>{triggerLabel}</span>
          {showSelectedStatus && selected?.status && <SupplierStatusBadge status={selected.status} />}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Remove supplier"
              onClick={e => {
                e.stopPropagation();
                choose(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  choose(null);
                }
              }}
              className="text-stone-400 hover:text-stone-700 p-0.5"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} className="text-stone-400" />
        </span>
      </button>

      {showSelectedStatus && !error && (
        <p className="mt-1 text-[10px] text-stone-500">
          This supplier is {selected?.status === 'BLOCKED' ? 'blocked' : 'inactive'}. You can keep it, but it can't be
          picked for other products.
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[11px] text-rose-600">
          {error}
        </p>
      )}

      {isOpen && (
        <div
          className="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden"
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              document.getElementById(buttonId)?.focus();
            }
          }}
        >
          <div className="relative p-2 border-b border-stone-100">
            <Search size={13} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, code, company..."
              aria-label="Search suppliers"
              className="w-full pl-7 pr-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-800"
            />
          </div>

          <ul id={listId} role="listbox" aria-label="Suppliers" className="max-h-56 overflow-y-auto">
            <li role="option" aria-selected={!value}>
              <button
                type="button"
                onClick={() => choose(null)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 ${
                  !value ? 'bg-stone-100 font-semibold text-stone-900' : 'text-stone-500 italic'
                }`}
              >
                No supplier
              </button>
            </li>
            {isLoading ? (
              <li className="p-4 flex items-center justify-center gap-2 text-stone-400 text-[11px]">
                <Loader2 size={13} className="animate-spin" />
                Loading...
              </li>
            ) : loadError ? (
              <li className="p-4 text-center text-rose-600 text-[11px]">{loadError}</li>
            ) : allOptions.length === 0 ? (
              <li className="p-4 text-center text-stone-400 text-[11px]">No active suppliers found.</li>
            ) : (
              allOptions.map(option => (
                <li key={option._id} role="option" aria-selected={option._id === value}>
                  <button
                    type="button"
                    onClick={() => choose(option)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 flex items-center justify-between gap-2 ${
                      option._id === value ? 'bg-stone-100 font-semibold text-stone-900' : 'text-stone-700'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate" title={formatSupplierOption(option)}>{formatSupplierOption(option)}</span>
                      {option.contactPerson && (
                        <span className="block text-[10px] text-stone-400 truncate">{option.contactPerson}</span>
                      )}
                    </span>
                    {option.status && option.status !== 'ACTIVE' && <SupplierStatusBadge status={option.status} />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
