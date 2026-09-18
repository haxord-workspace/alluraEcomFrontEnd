import React, { useState } from 'react';
import { Package, X } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { Product } from '../../types';

interface StockAdjustModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { adjustStock } = useAdmin();

  const [operation, setOperation] = useState<'Add' | 'Remove' | 'Set'>('Add');
  const [quantity, setQuantity] = useState<number>(5);
  const [reason, setReason] = useState<string>('New handcrafted batch received from Perinthalmanna artisans');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen || !product) return null;

  const currentStock = product.stockCount ?? (product.inStock ? 10 : 0);

  let newCalculatedStock = currentStock;
  if (operation === 'Add') newCalculatedStock = currentStock + Number(quantity || 0);
  else if (operation === 'Remove') newCalculatedStock = Math.max(0, currentStock - Number(quantity || 0));
  else if (operation === 'Set') newCalculatedStock = Math.max(0, Number(quantity || 0));

  const reasonsList = [
    'New handcrafted batch received from Perinthalmanna artisans',
    'Customer return inspected & restocked',
    'Physical boutique inventory cycle count audit',
    'Damaged fabric / sampling write-off',
    'Reserved for bespoke VIP bridal alteration',
    'Other custom adjustment',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = reason === 'Other custom adjustment' ? customReason || 'Manual adjustment' : reason;
    adjustStock(product.id, operation, Number(quantity), finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-allura-card border border-allura-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-5 animate-slide-up">
        {/* Header */}
        <div className="p-4 bg-allura-bgSecondary/80 border-b border-allura-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-allura-goldDark" />
            <h3 className="font-serif text-lg text-allura-text font-normal">
              Adjust Inventory Stock
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-allura-muted hover:text-allura-text rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product Details Header */}
        <div className="px-6 flex items-center gap-3">
          <img
            src={product.images.primary}
            alt={product.name}
            className="w-14 h-18 object-cover rounded-lg bg-stone-100"
          />
          <div className="text-xs font-sans space-y-1">
            <h4 className="font-serif text-base font-medium text-allura-text">{product.name}</h4>
            <p className="text-allura-muted font-mono">SKU: {product.sku}</p>
            <p className="text-allura-muted">
              Current Available Stock: <strong className="text-allura-darkBrown">{currentStock} units</strong>
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5 text-xs font-sans">
          
          {/* Operation type pills */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-2">
              Adjustment Operation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Add', label: '+ Add Stock', desc: 'New arrivals' },
                { id: 'Remove', label: '- Remove Stock', desc: 'Damaged / sold' },
                { id: 'Set', label: '= Set Absolute', desc: 'Cycle count' },
              ].map(op => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setOperation(op.id as any)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    operation === op.id
                      ? 'border-allura-gold bg-allura-gold/15 font-bold text-allura-goldDark shadow-xs'
                      : 'border-allura-border text-allura-muted hover:border-allura-darkBrown'
                  }`}
                >
                  <p className="text-xs">{op.label}</p>
                  <p className="text-[10px] text-allura-muted/80">{op.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Stock Preview */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                Quantity Units
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl font-bold text-sm text-allura-text focus:outline-none focus:border-allura-gold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                Resulting Available Stock
              </label>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl font-serif text-base font-bold text-emerald-900">
                {newCalculatedStock} units
              </div>
            </div>
          </div>

          {/* Reason code */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
              Audit & Ledger Reason
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
            >
              {reasonsList.map((r, i) => (
                <option key={i} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reason === 'Other custom adjustment' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
                Specify Custom Reason
              </label>
              <input
                type="text"
                required
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="E.g. Relocated to Kochi Trunk Show"
                className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text"
              />
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-allura-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-allura-border rounded-xl text-allura-muted hover:text-allura-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white rounded-xl font-bold uppercase tracking-wider transition-colors shadow-sm"
            >
              Confirm Adjustment
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
