import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { AlluraLogo } from './AlluraLogo';
import { useShop } from '../../context/ShopContext';
import { orderErrorMessage, type InvoiceDownload } from '../../service/orders';
import { saveBlob } from '../../utils/download';
import type { Order } from '../../types';


const clean = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== 'string' ? trimmed : undefined;
};

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
  /** Lets the admin and customer pages share this modal while hitting their own endpoint */
  onDownload: (orderId: string, invoiceNumber?: string) => Promise<InvoiceDownload>;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose, onDownload }) => {
  const { showToast, storeSettings } = useShop();
  const [isDownloading, setIsDownloading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const profile = storeSettings?.boutiqueProfile;

  const tagline = clean(profile?.tagline);
  const supportPhone = clean(profile?.whatsappNumber);
  const address = clean(profile?.address);
  const supportEmail = clean(profile?.supportEmail);
  const gstin = clean(profile?.gstin);
  // Lock the background page scroll while the modal is open
  useEffect(() => {
    if (!order) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [order]);

  // Esc to close, initial focus, and a Tab focus trap while open
  useEffect(() => {
    if (!order) return;
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [order, onClose]);

  if (!order) return null;

  const fmtAmount = (n: number) => {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: order.currency || 'INR',
        maximumFractionDigits: 2,
      }).format(n || 0);
    } catch {
      return `${order.currency || 'INR'} ${(n || 0).toLocaleString('en-IN')}`;
    }
  };

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const { blob, filename } = await onDownload(order.id, order.invoiceNumber);
      saveBlob(blob, filename);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        status === 401
          ? 'Your session has expired. Please sign in again to download the invoice.'
          : status === 403
            ? "You don't have permission to download this invoice."
            : status === 404
              ? 'Invoice not found for this order.'
              : orderErrorMessage(err, 'Could not download the invoice. Please try again.');
      showToast(message, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in print:static print:bg-transparent print:p-0"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-modal-title"
        onClick={e => e.stopPropagation()}
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-slide-up text-stone-800 print:max-h-none print:overflow-visible print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* Actions Bar (sticky; the invoice scrolls underneath it) */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 sm:px-8 py-4 border-b border-stone-100 print:hidden">
          <span id="invoice-modal-title" className="text-[11px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            INVOICE
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-stone-200 text-xs font-sans text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-allura-darkBrown text-white text-xs font-sans hover:bg-allura-softBrown transition-colors disabled:opacity-60"
            >
              {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="text-stone-400 hover:text-stone-700 p-1 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable invoice body */}
        <div className="invoice-scroll flex-1 overflow-y-auto px-6 sm:px-8 py-6 sm:py-8 space-y-8 print:max-h-none print:overflow-visible print:shadow-none">

          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
            <div>
              <div className="mb-3">
                <AlluraLogo size="md" variant="dark" />
              </div>
              {tagline && <p className="text-xs text-stone-500 font-sans">{tagline}</p>}
            </div>

            <div className="text-right space-y-1 w-full sm:w-auto">
              <p className="font-serif text-2xl font-bold text-stone-900 tracking-wide">INVOICE</p>
              {order.invoiceNumber && (
                <p className="text-xs text-stone-500">
                  Invoice No: <strong className="text-allura-darkBrown">{order.invoiceNumber}</strong>
                </p>
              )}
              {order.invoiceIssuedAt && <p className="text-xs text-stone-500">Invoice Date & Time: {order.invoiceIssuedAt}</p>}
              <p className="text-xs text-stone-500">
                Order No: <strong className="text-stone-700">{order.orderNumber}</strong>
              </p>
              <p className="text-xs text-stone-500">Order Date: {order.date}</p>
            </div>
          </div>

          {/* Customer & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-stone-50 border border-stone-100 text-xs font-sans">
            <div>
              <p className="font-bold text-stone-900 uppercase tracking-wider text-[11px] mb-1">Billed & Shipped To</p>
              <p className="font-semibold text-stone-800">{order.shippingAddress?.fullName || order.customer?.name || 'Customer'}</p>
              <p className="text-stone-600 leading-relaxed">
                {order.shippingAddress?.addressLine1}
                {order.shippingAddress?.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
                {order.shippingAddress?.city && (
                  <>
                    <br />
                    {[order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(', ')}
                    {order.shippingAddress.postalCode && ` - ${order.shippingAddress.postalCode}`}
                  </>
                )}
                {order.shippingAddress?.country && (
                  <>
                    <br />
                    {order.shippingAddress.country}
                  </>
                )}
                {(order.shippingAddress?.phone?.number || order.customer?.phone) && (
                  <>
                    <br />
                    Phone: {order.shippingAddress?.phone?.number
                      ? `${order.shippingAddress.phone.countryCode || '+91'} ${order.shippingAddress.phone.number}`
                      : order.customer?.phone}
                  </>
                )}
              </p>
              {order.customer?.email && <p className="text-stone-600 mt-1">Email: {order.customer.email}</p>}
            </div>

            <div>
              <p className="font-bold text-stone-900 uppercase tracking-wider text-[11px] mb-1">Payment</p>
              <p className="text-stone-600">Method: {order.paymentMethod || '—'}</p>
              <p className="text-stone-600">Status: {order.paymentStatus || '—'}</p>
              {order.transactionId && <p className="text-stone-600">Transaction ID: {order.transactionId}</p>}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b-2 border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5">Item</th>
                  <th className="py-2.5">SKU</th>
                  <th className="py-2.5">Size / Color</th>
                  <th className="py-2.5 text-right">Qty</th>
                  <th className="py-2.5 text-right">Unit Price</th>
                  <th className="py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(order.items || []).map((item, idx) => {
                  const colorName = typeof item.selectedColor === 'object' ? item.selectedColor?.name : item.selectedColor;
                  const variantLabel = [item.selectedSize, colorName].filter(Boolean).join(' / ') || '—';
                  const unitPrice = item.unitPrice ?? 0;
                  const qty = item.quantity ?? 1;
                  return (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-3 pr-2 font-medium text-stone-800">{item.product?.name || (item as any).name || 'Item'}</td>
                      <td className="py-3 text-stone-600 font-mono text-[11px]">{item.sku || '—'}</td>
                      <td className="py-3 text-stone-600 text-[11px]">{variantLabel}</td>
                      <td className="py-3 text-right text-stone-800 tabular-nums">{qty}</td>
                      <td className="py-3 text-right text-stone-800 tabular-nums">{fmtAmount(unitPrice)}</td>
                      <td className="py-3 text-right font-medium text-stone-900 tabular-nums">{fmtAmount(unitPrice * qty)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end pt-4 border-t border-stone-200">
            <div className="w-full sm:w-64 space-y-2 text-xs font-sans">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{fmtAmount(order.subtotal ?? 0)}</span>
              </div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                  <span className="tabular-nums">-{fmtAmount(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Tax</span>
                <span className="tabular-nums">{fmtAmount(order.tax ?? 0)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping</span>
                <span className="tabular-nums">{order.shippingFee === 0 ? 'Free' : fmtAmount(order.shippingFee ?? 0)}</span>
              </div>
              <div className="flex justify-between text-base font-serif font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Total</span>
                <span className="text-allura-goldDark tabular-nums">{fmtAmount(order.total ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-dashed border-stone-200 text-[10px] font-sans text-stone-500 space-y-1">
            {gstin && <p>GSTIN: {gstin}</p>}
            {address && <p>{address}</p>}
            {(supportEmail || supportPhone) && (
              <p>
                Support: {[supportEmail, supportPhone].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="pt-2 text-stone-400 italic">Thank you for shopping with us.</p>
          </div>

        </div>
      </div>
    </div>
  );
};
