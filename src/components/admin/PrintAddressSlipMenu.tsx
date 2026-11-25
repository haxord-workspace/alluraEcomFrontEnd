import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, Loader2, Minus, Plus, Printer, Info } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { openAdminOrderAddressLabel, describeAddressLabelError, PdfDocumentError } from '../../service/addressLabels';
import type { AddressLabelSize } from '../../types/addressLabel';
import { SlipPreviewModal } from './SlipPreviewModal';

interface PrintAddressSlipMenuProps {
  orderId: string;
}

/**
 * "Print address slip" button + menu for the admin order detail header. Admin can print
 * a slip for any order status/payment state, so this is never hidden or disabled by
 * eligibility (unlike the customer-facing buttons in addressSlipEligibility.ts).
 */
export const PrintAddressSlipMenu: React.FC<PrintAddressSlipMenuProps> = ({ orderId }) => {
  const { showToast } = useShop();
  const [isOpen, setIsOpen] = useState(false);
  const [copies, setCopies] = useState(1);
  const [busySize, setBusySize] = useState<AddressLabelSize | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const print = async (size: AddressLabelSize) => {
    if (busySize) return;
    setBusySize(size);
    try {
      const { opened } = await openAdminOrderAddressLabel(orderId, size, copies);
      if (!opened) showToast('Pop-up was blocked, so the slip downloaded instead.', 'info');
      setIsOpen(false);
    } catch (err) {
      const message =
        err instanceof PdfDocumentError
          ? describeAddressLabelError(err, 'admin')
          : 'Could not create the address slip. Please try again.';
      showToast(message, 'error');
    } finally {
      setBusySize(null);
    }
  };

  return (
    <>
      <div className="relative" ref={wrapperRef}>
        <button
          type="button"
          onClick={() => setIsOpen(v => !v)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className="px-3.5 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-sans font-semibold flex items-center gap-1.5"
        >
          <Printer size={14} />
          <span>Print address slip</span>
          <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-1.5 w-64 rounded-xl border border-stone-200 bg-white shadow-lg py-2 text-xs font-sans"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => print('4x6')}
              disabled={!!busySize}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              {busySize === '4x6' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              <span>Label printer (4×6)</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => print('A4')}
              disabled={!!busySize}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              {busySize === 'A4' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              <span>A4 printer</span>
            </button>

            <div className="flex items-center justify-between px-3.5 py-2 border-t border-stone-100 mt-1">
              <span className="text-stone-500">Copies</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Fewer copies"
                  onClick={() => setCopies(c => Math.max(1, c - 1))}
                  disabled={copies <= 1}
                  className="p-1 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
                >
                  <Minus size={12} />
                </button>
                <span className="w-4 text-center text-stone-800 font-semibold">{copies}</span>
                <button
                  type="button"
                  aria-label="More copies"
                  onClick={() => setCopies(c => Math.min(4, c + 1))}
                  disabled={copies >= 4}
                  className="p-1 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsPreviewOpen(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-stone-700 hover:bg-stone-50 border-t border-stone-100"
            >
              <Eye size={14} />
              <span>Preview slip</span>
            </button>

            <div className="flex items-start gap-1.5 px-3.5 pt-2 text-[11px] text-stone-400 leading-snug">
              <Info size={12} className="shrink-0 mt-0.5" />
              <span>
                4×6: set paper size 4×6 in, scale Actual size, margins None. A4: Actual size, then cut along the
                dashed line. Never use "Fit to page".
              </span>
            </div>
          </div>
        )}
      </div>

      {isPreviewOpen && <SlipPreviewModal orderId={orderId} onClose={() => setIsPreviewOpen(false)} />}
    </>
  );
};
