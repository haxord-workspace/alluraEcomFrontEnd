import React, { useId, useState } from 'react';
import { Search } from 'lucide-react';
import { LabelDialogShell, dialogCancelClass, dialogPrimaryClass } from './LabelDialogShell';
import type { BulkPrintProduct } from './BulkPrintDialog';
import { plural } from './labelOptions';

export interface PickerProduct extends BulkPrintProduct {
  sku: string;
  status: string;
}

interface ProductPickerDialogProps {
  products: PickerProduct[];
  onClose: () => void;
  onConfirm: (products: BulkPrintProduct[]) => void;
}

/** "Print by product": choose products; every variant of each is printed */
export const ProductPickerDialog: React.FC<ProductPickerDialogProps> = ({ products, onClose, onConfirm }) => {
  const id = useId();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const q = query.trim().toLowerCase();
  const visible = q ? products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : products;
  const allVisibleSelected = visible.length > 0 && visible.every(p => selected.has(p.id));
  const someVisibleSelected = visible.some(p => selected.has(p.id));

  const toggle = (productId: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });

  const toggleAllVisible = () =>
    setSelected(prev => {
      const next = new Set(prev);
      visible.forEach(p => (allVisibleSelected ? next.delete(p.id) : next.add(p.id)));
      return next;
    });

  const chosen = products.filter(p => selected.has(p.id));
  const variantTotal = chosen.reduce((sum, p) => sum + p.variantCount, 0);

  return (
    <LabelDialogShell
      title="Print by product"
      subtitle="Prints every variant of the chosen products, product by product, in size order."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={dialogCancelClass}>Cancel</button>
          <button
            type="button"
            onClick={() => onConfirm(chosen.map(({ id: productId, name, variantCount }) => ({ id: productId, name, variantCount })))}
            disabled={chosen.length === 0}
            className={dialogPrimaryClass}
          >
            Continue{chosen.length > 0 ? ` (${chosen.length})` : ''}
          </button>
        </>
      }
    >
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true" />
        <input
          type="search"
          data-autofocus
          aria-label="Search products"
          placeholder="Search product name or SKU..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-stone-600 cursor-pointer">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={el => {
              if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
            }}
            disabled={visible.length === 0}
            onChange={toggleAllVisible}
            aria-label={q ? 'Select all matching products' : 'Select all products'}
            className="h-3.5 w-3.5 accent-[#561C08]"
          />
          <span className="font-semibold">{q ? 'Select all matching' : 'Select all'}</span>
        </label>
        <span className="text-[11px] text-stone-500" aria-live="polite">
          {chosen.length > 0 ? `${plural(chosen.length, 'product')} · ${plural(variantTotal, 'variant')}` : 'Nothing selected'}
        </span>
      </div>

      <ul id={`${id}-list`} className="max-h-[45vh] overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl">
        {visible.map(p => (
          <li key={p.id}>
            <label className="px-3 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-stone-50">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="h-3.5 w-3.5 accent-[#561C08] flex-shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-stone-900 truncate">{p.name}</span>
                <span className="block text-[11px] text-stone-500 font-mono truncate">
                  {p.sku}
                  {p.status !== 'ACTIVE' && <span className="font-sans text-amber-700"> · {p.status.toLowerCase()}</span>}
                </span>
              </span>
              <span className="text-[11px] text-stone-500 flex-shrink-0">{plural(p.variantCount, 'variant')}</span>
            </label>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="p-8 text-center text-stone-500">{products.length === 0 ? 'No products found.' : 'No products match your search.'}</li>
        )}
      </ul>
    </LabelDialogShell>
  );
};
