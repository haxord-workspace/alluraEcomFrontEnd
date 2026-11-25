import React, { useState } from 'react';
import { Printer, X, Loader2 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { printBulkAdminAddressLabels, describeAddressLabelError, PdfDocumentError, MAX_BULK_ADDRESS_LABELS } from '../../service/addressLabels';
import type { AddressLabelSize } from '../../types/addressLabel';

interface BulkSlipBarProps {
  orderIds: string[];
  onClear: () => void;
}

/** Bar shown above the admin orders table once at least one order row is checked. */
export const BulkSlipBar: React.FC<BulkSlipBarProps> = ({ orderIds, onClear }) => {
  const { showToast } = useShop();
  const [busySize, setBusySize] = useState<AddressLabelSize | null>(null);
  const tooMany = orderIds.length > MAX_BULK_ADDRESS_LABELS;

  const print = async (size: AddressLabelSize) => {
    if (busySize || tooMany) return;
    setBusySize(size);
    try {
      const { opened, result } = await printBulkAdminAddressLabels(orderIds, size);
      if (!opened) showToast('Pop-up was blocked, so the slips downloaded instead.', 'info');
      if (result.ordersNotFound && result.ordersNotFound.length > 0) {
        const printedCount = result.labelCount ?? orderIds.length - result.ordersNotFound.length;
        showToast(`Printed ${printedCount} slip${printedCount === 1 ? '' : 's'}. ${result.ordersNotFound.length} order${result.ordersNotFound.length === 1 ? '' : 's'} were not found.`, 'info');
      }
    } catch (err) {
      showToast(err instanceof PdfDocumentError ? describeAddressLabelError(err, 'admin') : 'Could not create the address slips. Please try again.', 'error');
    } finally {
      setBusySize(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-sans">
      <div className="flex items-center gap-2 text-stone-700 font-semibold">
        <span>{orderIds.length} selected</span>
        {tooMany && (
          <span className="text-rose-700 font-normal" title={`Select up to ${MAX_BULK_ADDRESS_LABELS} orders per print`}>
            (max {MAX_BULK_ADDRESS_LABELS} per print)
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => print('4x6')}
          disabled={!!busySize || tooMany}
          title={tooMany ? `Select up to ${MAX_BULK_ADDRESS_LABELS} orders per print` : undefined}
          className="px-3.5 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          {busySize === '4x6' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
          <span>Print slips (4×6)</span>
        </button>
        <button
          type="button"
          onClick={() => print('A4')}
          disabled={!!busySize || tooMany}
          title={tooMany ? `Select up to ${MAX_BULK_ADDRESS_LABELS} orders per print` : undefined}
          className="px-3.5 py-2 border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          {busySize === 'A4' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
          <span>Print slips (A4)</span>
        </button>
        <button
          type="button"
          onClick={onClear}
          className="px-2.5 py-2 text-stone-500 hover:text-stone-800 flex items-center gap-1"
        >
          <X size={14} />
          <span>Clear selection</span>
        </button>
      </div>
    </div>
  );
};
