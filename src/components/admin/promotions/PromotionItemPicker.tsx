import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Plus, Search, X } from 'lucide-react';
import type { PickerOption, PickerStatus } from '../../../hooks/usePromotionPickerOptions';

// -----------------------------------------------------------------------------
// Searchable multi-select used by the admin promotion form (Applies to and
// Exclusions). Selected items are removable chips. Search is client-side over
// the loaded options; results are shown 50 at a time with "Show more".
// -----------------------------------------------------------------------------

const PAGE = 50;

interface PromotionItemPickerProps {
  id: string;
  label: string;
  /** e.g. { one: 'product', many: 'products' } */
  noun: { one: string; many: string };
  options: PickerOption[];
  status: PickerStatus;
  onRetry: () => void;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Options that may not be picked here (e.g. already chosen in the opposite include/exclude list) */
  hiddenIds?: string[];
  /** Validation error shown under the field */
  error?: string;
  hint?: string;
  disabled?: boolean;
}

export const PromotionItemPicker: React.FC<PromotionItemPickerProps> = ({
  id,
  label,
  noun,
  options,
  status,
  onRetry,
  selectedIds,
  onChange,
  hiddenIds,
  error,
  hint,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  const byId = useMemo(() => new Map(options.map(o => [o.id, o])), [options]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hiddenSet = useMemo(() => new Set(hiddenIds || []), [hiddenIds]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter(
      o =>
        !hiddenSet.has(o.id) &&
        (!q || o.label.toLowerCase().includes(q) || (o.sublabel || '').toLowerCase().includes(q))
    );
  }, [options, hiddenSet, query]);

  const toggle = (optionId: string) =>
    onChange(selectedSet.has(optionId) ? selectedIds.filter(x => x !== optionId) : [...selectedIds, optionId]);

  const chipLabel = (optionId: string) => {
    const option = byId.get(optionId);
    if (option) return option.label;
    if (status === 'ready') return 'Unknown item';
    if (status === 'error') return `#${optionId.slice(-6)}`;
    return 'Loading…';
  };

  const count = selectedIds.length;
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span id={`${id}-label`} className="block text-[10px] font-bold uppercase text-stone-500">
          {label}
        </span>
        {count > 0 && (
          <span className="text-[10px] font-semibold text-stone-500">
            {count} {count === 1 ? noun.one : noun.many} selected
            {!disabled && (
              <button type="button" onClick={() => onChange([])} className="ml-2 underline hover:text-stone-800">
                Clear
              </button>
            )}
          </span>
        )}
      </div>

      {count > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedIds.map(optionId => {
            const known = byId.has(optionId);
            return (
              <span
                key={optionId}
                className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full border text-[11px] font-semibold max-w-full ${
                  known || status !== 'ready'
                    ? 'border-allura-goldDark bg-allura-bgSecondary text-allura-goldDark'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
                title={known ? undefined : `Id ${optionId}`}
              >
                <span className="truncate">{chipLabel(optionId)}</span>
                <button
                  type="button"
                  onClick={() => toggle(optionId)}
                  disabled={disabled}
                  className="p-0.5 rounded-full hover:bg-black/5 disabled:opacity-50"
                  aria-label={`Remove ${chipLabel(optionId)}`}
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
        className={`w-full flex items-center justify-between p-2.5 bg-stone-50 border rounded-xl text-stone-600 hover:border-stone-400 disabled:opacity-50 ${
          error ? 'border-rose-300' : 'border-stone-200'
        }`}
        aria-describedby={error ? errorId : undefined}
      >
        <span className="flex items-center gap-1.5">
          <Plus size={13} />
          {count > 0 ? `Add or remove ${noun.many}` : `Choose ${noun.many}`}
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div id={`${id}-panel`} className="mt-1.5 border border-stone-200 rounded-xl bg-white overflow-hidden">
          <div className="relative border-b border-stone-100">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setVisible(PAGE); // new search starts from the first page of results
              }}
              placeholder={`Search ${noun.many}…`}
              aria-labelledby={`${id}-label`}
              className="w-full pl-8 pr-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <div className="max-h-56 overflow-y-auto" role="listbox" aria-multiselectable="true" aria-labelledby={`${id}-label`}>
            {status === 'loading' || status === 'idle' ? (
              <div className="p-4 flex items-center justify-center gap-2 text-stone-400">
                <Loader2 size={13} className="animate-spin" />
                <span>Loading {noun.many}…</span>
              </div>
            ) : status === 'error' ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-rose-700">Couldn't load {noun.many}.</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-3 py-1.5 border border-stone-200 rounded-lg font-bold text-stone-700 hover:bg-stone-50"
                >
                  Retry
                </button>
              </div>
            ) : matches.length === 0 ? (
              <p className="p-4 text-center text-stone-400">No {noun.many} found</p>
            ) : (
              <>
                {matches.slice(0, visible).map(option => {
                  const isSelected = selectedSet.has(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => toggle(option.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-stone-50 ${
                        isSelected ? 'bg-allura-bgSecondary/60' : ''
                      }`}
                    >
                      <span
                        className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-[#561C08] border-[#561C08] text-white' : 'border-stone-300'
                        }`}
                      >
                        {isSelected && <Check size={11} />}
                      </span>
                      {option.image && (
                        <img src={option.image} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-stone-800">{option.label}</span>
                        {option.sublabel && (
                          <span className="block truncate text-[10px] text-stone-400">{option.sublabel}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {matches.length > visible && (
                  <button
                    type="button"
                    onClick={() => setVisible(v => v + PAGE)}
                    className="w-full py-2 border-t border-stone-100 font-bold text-stone-600 hover:bg-stone-50"
                  >
                    Show more ({matches.length - visible} more)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {error ? (
        <p id={errorId} className="mt-1 text-[11px] text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-stone-400">{hint}</p>
      ) : null}
    </div>
  );
};

export default PromotionItemPicker;
