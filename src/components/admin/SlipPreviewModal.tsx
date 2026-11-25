import React, { useEffect, useState } from 'react';
import { Loader2, Printer, X } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import {
  getAdminOrderAddressLabelPreview,
  openAdminOrderAddressLabel,
  describeAddressLabelError,
  PdfDocumentError,
} from '../../service/addressLabels';
import type { AddressLabelPreview, AddressLabelSize } from '../../types/addressLabel';

interface SlipPreviewModalProps {
  orderId: string;
  onClose: () => void;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const SlipPreviewModal: React.FC<SlipPreviewModalProps> = ({ orderId, onClose }) => {
  const { showToast } = useShop();
  const [preview, setPreview] = useState<AddressLabelPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [printing, setPrinting] = useState<AddressLabelSize | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await getAdminOrderAddressLabelPreview(orderId);
        if (!cancelled) setPreview(data);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof PdfDocumentError ? describeAddressLabelError(err, 'admin') : 'Could not load the preview.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const print = async (size: AddressLabelSize) => {
    if (printing) return;
    setPrinting(size);
    try {
      const { opened } = await openAdminOrderAddressLabel(orderId, size);
      if (!opened) showToast('Pop-up was blocked, so the slip downloaded instead.', 'info');
    } catch (err) {
      showToast(err instanceof PdfDocumentError ? describeAddressLabelError(err, 'admin') : 'Could not create the address slip.', 'error');
    } finally {
      setPrinting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="slip-preview-title"
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 id="slip-preview-title" className="font-serif text-lg text-stone-900">Slip preview</h3>
          <button onClick={onClose} aria-label="Close preview" className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs font-sans">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-stone-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}

          {!isLoading && loadError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">{loadError}</div>
          )}

          {!isLoading && preview && (
            <>
              <div className="flex items-center justify-between text-stone-500">
                <span>{preview.orderNumber}</span>
                <span>{formatDate(preview.orderDate)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <section className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                  <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px] mb-1.5">From</h4>
                  <p className="font-semibold text-stone-900">{preview.from.name}</p>
                  {preview.from.addressLines.map(line => (
                    <p key={line} className="text-stone-600">{line}</p>
                  ))}
                </section>
                <section className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                  <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px] mb-1.5">To</h4>
                  <p className="font-semibold text-stone-900">{preview.to.name}</p>
                  {preview.to.addressLines.map(line => (
                    <p key={line} className="text-stone-600">{line}</p>
                  ))}
                </section>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-stone-100">
                <span className="text-stone-500">{preview.itemCount} item{preview.itemCount === 1 ? '' : 's'}</span>
                {preview.payment.mode === 'COD' && preview.payment.amountToCollect !== null ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
                    COD: {inr(preview.payment.amountToCollect)}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                    Prepaid
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {!isLoading && preview && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => print('4x6')}
              disabled={!!printing}
              className="px-3.5 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-sans font-semibold flex items-center gap-1.5 disabled:opacity-60"
            >
              {printing === '4x6' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              <span>4×6</span>
            </button>
            <button
              type="button"
              onClick={() => print('A4')}
              disabled={!!printing}
              className="px-3.5 py-2 bg-allura-darkBrown text-white hover:bg-allura-softBrown rounded-xl text-xs font-sans font-semibold flex items-center gap-1.5 disabled:opacity-60"
            >
              {printing === 'A4' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              <span>Print A4</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
