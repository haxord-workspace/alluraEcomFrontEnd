import React, { useState, useEffect, useMemo } from 'react';
import { Package, X, Loader2, Search, Minus, Plus, ArrowRight, ChevronLeft, PackagePlus, PackageMinus, ClipboardCheck } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { getInventoryByVariant, stockIn, stockOut, adjustStock } from '../../service/adminInventory';
import type { InventoryRecord } from '../../service/adminInventory';

export type StockOperation = 'Add' | 'Remove' | 'Set';

interface StockAdjustModalProps {
  /** The variant to adjust. When null, the modal starts with a variant picker built from `candidates`. */
  record: InventoryRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onAdjusted?: (updated: InventoryRecord) => void;
  candidates?: InventoryRecord[];
  initialOperation?: StockOperation;
}

const OPERATIONS: { id: StockOperation; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'Add', label: 'Add Stock', desc: 'New arrivals, restock', icon: PackagePlus },
  { id: 'Remove', label: 'Remove Stock', desc: 'Damaged, lost, sold offline', icon: PackageMinus },
  { id: 'Set', label: 'Set Count', desc: 'After a physical count', icon: ClipboardCheck },
];

const REASONS: Record<StockOperation, string[]> = {
  Add: ['New stock arrival', 'Customer return restocked', 'Transfer in from another location'],
  Remove: ['Damaged / defective', 'Lost or missing', 'Sold offline / in store', 'Used as sample'],
  Set: ['Physical stock count', 'Audit correction'],
};
const OTHER_REASON = 'Other';

const QUICK_AMOUNTS = [1, 5, 10, 25, 50];

const variantLabel = (r: InventoryRecord) => [r.attributes?.color, r.attributes?.size].filter(Boolean).join(' / ');

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  record,
  isOpen,
  onClose,
  onAdjusted,
  candidates = [],
  initialOperation = 'Add',
}) => {
  const { showToast } = useShop();
  const [selected, setSelected] = useState<InventoryRecord | null>(record);
  const [liveRecord, setLiveRecord] = useState<InventoryRecord | null>(record);
  const [pickerQuery, setPickerQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [operation, setOperation] = useState<StockOperation>(initialOperation);
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>(REASONS[initialOperation][0]);
  const [customReason, setCustomReason] = useState('');

  // Reset the form each time the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSelected(record);
    setPickerQuery('');
    setOperation(initialOperation);
    setQuantity(initialOperation === 'Set' ? record?.quantityOnHand ?? 0 : 1);
    setReason(REASONS[initialOperation][0]);
    setCustomReason('');
  }, [isOpen, record, initialOperation]);

  // Pull the latest figures for the chosen variant
  useEffect(() => {
    setLiveRecord(selected);
    if (!isOpen || !selected?.variantId || selected.isTracked === false) return;
    let cancelled = false;
    getInventoryByVariant(selected.variantId)
      .then(fresh => {
        if (cancelled) return;
        setLiveRecord({
          ...selected,
          ...fresh,
          productName: fresh.productName || selected.productName,
          image: fresh.image || selected.image,
          sku: fresh.sku || selected.sku,
          attributes: fresh.attributes || selected.attributes,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, selected]);

  const pickerResults = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const list = q
      ? candidates.filter(c =>
          [c.productName, c.sku, variantLabel(c)].some(v => (v || '').toLowerCase().includes(q))
        )
      : candidates;
    return list.slice(0, 50);
  }, [candidates, pickerQuery]);

  if (!isOpen) return null;

  const chooseOperation = (op: StockOperation) => {
    setOperation(op);
    setReason(REASONS[op][0]);
    setQuantity(op === 'Set' ? liveRecord?.quantityOnHand ?? 0 : 1);
  };

  const currentStock = liveRecord?.quantityOnHand ?? 0;
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));

  let newStock = currentStock;
  if (operation === 'Add') newStock = currentStock + qty;
  else if (operation === 'Remove') newStock = Math.max(0, currentStock - qty);
  else newStock = qty;

  const delta = newStock - currentStock;
  const removeTooMuch = operation === 'Remove' && qty > currentStock;
  const canSubmit = !!liveRecord && !isSubmitting && !removeTooMuch && (operation === 'Set' ? delta !== 0 : qty > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveRecord || !canSubmit) return;
    const finalReason = reason === OTHER_REASON ? customReason.trim() || 'Manual adjustment' : reason;

    setIsSubmitting(true);
    try {
      const updated =
        operation === 'Add'
          ? await stockIn(liveRecord.variantId, { quantity: qty, reason: finalReason })
          : operation === 'Remove'
          ? await stockOut(liveRecord.variantId, { quantity: qty, reason: finalReason })
          : // "Set Count" is sent to /adjust as the difference from the current on-hand count
            await adjustStock(liveRecord.variantId, {
              quantity: Math.abs(delta),
              direction: delta > 0 ? 'IN' : 'OUT',
              reason: finalReason,
            });

      // Some endpoints may not echo the record back; fall back to the locally computed value
      const merged: InventoryRecord = updated?.variantId
        ? {
            ...liveRecord,
            ...updated,
            productName: liveRecord.productName,
            image: liveRecord.image,
            sku: updated.sku || liveRecord.sku,
            attributes: updated.attributes || liveRecord.attributes,
          }
        : {
            ...liveRecord,
            isTracked: true,
            quantityOnHand: newStock,
            quantityAvailable: Math.max(0, newStock - liveRecord.quantityReserved),
          };

      onAdjusted?.(merged);
      showToast(`${liveRecord.sku || liveRecord.productName || 'Variant'}: ${currentStock} → ${newStock} units`, 'success');
      onClose();
    } catch (error: any) {
      const body = error.response?.data;
      showToast(body?.error?.details?.[0]?.message || body?.message || 'Failed to update stock', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-allura-card border border-allura-border rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-allura-bgSecondary/80 border-b border-allura-border flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {!record && selected && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1 -ml-1 text-allura-muted hover:text-allura-text rounded-md"
                aria-label="Choose a different variant"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <Package size={18} className="text-allura-goldDark" />
            <h3 className="font-serif text-lg text-allura-text font-normal">
              {selected ? 'Update Stock' : 'Choose a Variant'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-allura-muted hover:text-allura-text rounded-md" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Step 1: pick a variant */}
        {!selected && (
          <div className="p-5 space-y-3 text-xs font-sans">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-allura-muted" />
              <input
                autoFocus
                type="text"
                value={pickerQuery}
                onChange={e => setPickerQuery(e.target.value)}
                placeholder="Search by product name, SKU, colour or size…"
                className="w-full pl-10 pr-4 py-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs text-allura-text focus:outline-none focus:border-allura-gold"
              />
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-allura-border/60 border border-allura-border rounded-xl">
              {pickerResults.length === 0 ? (
                <p className="p-6 text-center text-allura-muted">No variants match “{pickerQuery}”.</p>
              ) : (
                pickerResults.map(c => (
                  <button
                    key={c.variantId}
                    type="button"
                    onClick={() => setSelected(c)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-allura-bgSecondary/60 transition-colors"
                  >
                    {c.image ? (
                      <img src={c.image} alt="" className="w-9 h-11 object-cover rounded bg-stone-100 shrink-0" />
                    ) : (
                      <div className="w-9 h-11 rounded bg-stone-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-allura-text truncate">{c.productName || 'Unnamed product'}</p>
                      <p className="text-[10px] text-allura-muted font-mono truncate">
                        {c.sku || '—'}{variantLabel(c) && ` · ${variantLabel(c)}`}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-allura-muted shrink-0">
                      {c.isTracked === false ? 'Not stocked' : `${c.quantityOnHand} on hand`}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: the adjustment form */}
        {selected && liveRecord && (
          <form onSubmit={handleSubmit} className="p-5 space-y-5 text-xs font-sans">
            {/* Variant summary */}
            <div className="flex items-center gap-3">
              {liveRecord.image ? (
                <img src={liveRecord.image} alt="" className="w-12 h-15 object-cover rounded-lg bg-stone-100" />
              ) : (
                <div className="w-12 h-15 rounded-lg bg-stone-100" />
              )}
              <div className="flex-1 min-w-0 space-y-0.5">
                <h4 className="font-serif text-base font-medium text-allura-text truncate">
                  {liveRecord.productName || 'Unnamed product'}
                </h4>
                <p className="text-allura-muted font-mono text-[11px]">
                  {liveRecord.sku || '—'}{variantLabel(liveRecord) && ` · ${variantLabel(liveRecord)}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-allura-muted font-bold">On hand</p>
                <p className="font-serif text-2xl font-bold text-allura-darkBrown leading-none">{currentStock}</p>
                {liveRecord.quantityReserved > 0 && (
                  <p className="text-[10px] text-amber-700">{liveRecord.quantityReserved} reserved</p>
                )}
              </div>
            </div>

            {/* What do you want to do? */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-2">
                What do you want to do?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {OPERATIONS.map(op => {
                  const Icon = op.icon;
                  const active = operation === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => chooseOperation(op.id)}
                      className={`p-3 rounded-xl border text-center transition-all space-y-1 ${
                        active
                          ? 'border-allura-gold bg-allura-gold/15 text-allura-goldDark shadow-xs'
                          : 'border-allura-border text-allura-muted hover:border-allura-darkBrown'
                      }`}
                    >
                      <Icon size={18} className="mx-auto" />
                      <p className={`text-xs ${active ? 'font-bold' : 'font-semibold'}`}>{op.label}</p>
                      <p className="text-[10px] text-allura-muted/80 leading-tight">{op.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-2">
                {operation === 'Set' ? 'Actual count on the shelf' : operation === 'Add' ? 'How many units to add?' : 'How many units to remove?'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(0, qty - 1))}
                  className="w-11 h-11 flex items-center justify-center rounded-xl border border-allura-border text-allura-text hover:border-allura-darkBrown"
                  aria-label="Decrease"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  onFocus={e => e.target.select()}
                  className="flex-1 h-11 text-center bg-allura-bg border border-allura-border rounded-xl font-bold text-lg text-allura-text focus:outline-none focus:border-allura-gold"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(qty + 1)}
                  className="w-11 h-11 flex items-center justify-center rounded-xl border border-allura-border text-allura-text hover:border-allura-darkBrown"
                  aria-label="Increase"
                >
                  <Plus size={16} />
                </button>
              </div>
              {operation !== 'Set' && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_AMOUNTS.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuantity(n)}
                      className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                        qty === n
                          ? 'bg-allura-darkBrown text-white border-allura-darkBrown'
                          : 'border-allura-border text-allura-muted hover:border-allura-darkBrown hover:text-allura-text'
                      }`}
                    >
                      {operation === 'Add' ? '+' : '−'}{n}
                    </button>
                  ))}
                </div>
              )}
              {removeTooMuch && (
                <p className="mt-2 text-[11px] text-rose-700">
                  Only {currentStock} units are on hand, so you can remove at most {currentStock}.
                </p>
              )}
            </div>

            {/* Before → after preview */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-allura-bgSecondary/60 border border-allura-border">
              <div className="text-center flex-1">
                <p className="text-[10px] uppercase tracking-wider text-allura-muted font-bold">Now</p>
                <p className="font-serif text-xl font-bold text-allura-text">{currentStock}</p>
              </div>
              <div className="flex flex-col items-center px-2">
                <ArrowRight size={16} className="text-allura-muted" />
                {delta !== 0 && (
                  <span className={`text-[11px] font-bold ${delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] uppercase tracking-wider text-allura-muted font-bold">After</p>
                <p className={`font-serif text-xl font-bold ${newStock === 0 ? 'text-rose-700' : 'text-emerald-800'}`}>{newStock}</p>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-2">
                Reason <span className="normal-case font-normal tracking-normal">(saved to the stock history)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[...REASONS[operation], OTHER_REASON].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`px-3 py-1.5 rounded-full border text-[11px] transition-colors ${
                      reason === r
                        ? 'bg-allura-gold/15 border-allura-gold text-allura-goldDark font-bold'
                        : 'border-allura-border text-allura-muted hover:border-allura-darkBrown hover:text-allura-text'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {reason === OTHER_REASON && (
                <input
                  type="text"
                  required
                  autoFocus
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Describe the reason"
                  className="mt-2 w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs text-allura-text focus:outline-none focus:border-allura-gold"
                />
              )}
            </div>

            {/* Actions */}
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
                disabled={!canSubmit}
                className="px-6 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white rounded-xl font-bold uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                {operation === 'Add' ? `Add ${qty} units` : operation === 'Remove' ? `Remove ${qty} units` : `Set to ${qty} units`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
