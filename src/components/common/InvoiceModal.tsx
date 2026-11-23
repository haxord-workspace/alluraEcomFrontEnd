import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { AlluraLogo } from './AlluraLogo';
import { useShop } from '../../context/ShopContext';
import { orderErrorMessage, type InvoiceDownload } from '../../service/orders';
import { saveBlob } from '../../utils/download';
import type { Order } from '../../types';
import { toReadableText, formatUserFacingPaymentStatus } from '../../utils/userFacingText';


const clean = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== 'string' ? trimmed : undefined;
};

const paymentTone = (status?: string): string => {
  const s = (status || '').toLowerCase();
  if (['paid', 'captured', 'success', 'completed'].includes(s)) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (['failed', 'cancelled'].includes(s)) return 'bg-rose-50 text-rose-800 border-rose-200';
  if (['refunded', 'partially refunded'].includes(s)) return 'bg-sky-50 text-sky-800 border-sky-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
};

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
  /** Lets the admin and customer pages share this modal while hitting their own endpoint */
  onDownload: (orderId: string, invoiceNumber?: string) => Promise<InvoiceDownload>;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose, onDownload }) => {
  const { formatExactPrice, showToast, storeSettings } = useShop();
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
      // Only visible controls (the action buttons are rendered twice: top bar on desktop, bottom bar on mobile)
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])')
      ).filter(el => el.offsetParent !== null);
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

  const items = (order.items || []).map(item => {
    const color = typeof item.selectedColor === 'object' ? item.selectedColor : undefined;
    const colorName = color ? color.name : (item.selectedColor as unknown as string | undefined);
    const unitPrice = item.unitPrice ?? 0;
    const qty = item.quantity ?? 1;
    return {
      name: item.product?.name || (item as any).name || 'Item',
      sku: item.sku,
      size: item.selectedSize,
      colorName: colorName || '',
      colorHex: color?.hex || '',
      qty,
      unitPrice,
      lineTotal: unitPrice * qty,
    };
  });
  const itemCount = items.reduce((n, i) => n + i.qty, 0);

  const address1 = [order.shippingAddress?.addressLine1, order.shippingAddress?.addressLine2].filter(Boolean).join(', ');
  const address2 = [
    [order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', '),
    order.shippingAddress?.postalCode,
  ]
    .filter(Boolean)
    .join(' - ');
  const phone = order.shippingAddress?.phone?.number
    ? `${order.shippingAddress.phone.countryCode || '+91'} ${order.shippingAddress.phone.number}`
    : order.customer?.phone;

  const meta: { label: string; value?: string; strong?: boolean }[] = [
    { label: 'Invoice No', value: order.invoiceNumber, strong: true },
    { label: 'Issued', value: order.invoiceIssuedAt },
    { label: 'Order No', value: order.orderNumber },
    { label: 'Order Date', value: order.date },
  ].filter(m => !!m.value);

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={handlePrint}
        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 rounded-lg border border-stone-200 bg-white text-sm sm:text-xs font-sans font-medium text-stone-700 hover:bg-stone-50 transition-colors"
      >
        <Printer size={15} />
        <span>Print</span>
      </button>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 rounded-lg bg-allura-darkBrown text-white text-sm sm:text-xs font-sans font-medium hover:bg-allura-softBrown transition-colors disabled:opacity-60"
      >
        {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        <span>{isDownloading ? 'Downloading…' : 'Download PDF'}</span>
      </button>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in print:static print:bg-transparent print:p-0"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-modal-title"
        onClick={e => e.stopPropagation()}
        className="bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[94dvh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-slide-up text-stone-800 print:max-h-none print:overflow-visible print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* Top bar (fixed; the invoice scrolls underneath it) */}
        <div className="flex-shrink-0 border-b border-stone-100 print:hidden">
          {/* Drag handle look on mobile sheets */}
          <div className="sm:hidden flex justify-center pt-2">
            <span className="h-1 w-10 rounded-full bg-stone-200" aria-hidden="true" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 sm:px-8 py-3 sm:py-4">
            <div className="min-w-0">
              <p id="invoice-modal-title" className="text-[11px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
                Invoice
              </p>
              <p className="text-xs font-sans text-stone-500 truncate">
                {order.invoiceNumber || order.orderNumber}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-2">{actionButtons}</div>
              <button
                type="button"
                ref={closeRef}
                onClick={onClose}
                aria-label="Close invoice"
                className="p-2 -mr-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable invoice body */}
        <div className="invoice-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8 print:max-h-none print:overflow-visible print:shadow-none">

          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-5">
            <div>
              <div className="mb-2">
                <AlluraLogo size="md" variant="dark" />
              </div>
              {tagline && <p className="text-xs text-stone-500 font-sans">{tagline}</p>}
            </div>

            <div className="sm:text-right">
              <p className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-wide mb-2">INVOICE</p>
              <dl className="grid grid-cols-2 sm:grid-cols-[auto_auto] gap-x-4 gap-y-2 sm:gap-y-1 text-xs font-sans">
                {meta.map(m => (
                  <div key={m.label} className="sm:contents">
                    <dt className="text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal text-stone-400 sm:text-stone-500">
                      {m.label}
                    </dt>
                    <dd className={`break-words ${m.strong ? 'font-bold text-allura-darkBrown' : 'font-medium text-stone-700'}`}>
                      {m.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Customer & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-sans">
            <section className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <h3 className="font-bold text-stone-500 uppercase tracking-wider text-[10px] mb-2">Billed &amp; Shipped To</h3>
              <p className="font-semibold text-sm text-stone-900">
                {order.shippingAddress?.fullName || order.customer?.name || 'Customer'}
              </p>
              <div className="mt-1 text-stone-600 leading-relaxed break-words">
                {address1 && <p>{address1}</p>}
                {address2 && <p>{address2}</p>}
                {order.shippingAddress?.country && <p>{order.shippingAddress.country}</p>}
              </div>
              {(phone || order.customer?.email) && (
                <div className="mt-2 pt-2 border-t border-stone-200/70 space-y-0.5 text-stone-600">
                  {phone && <p>Phone: <span className="text-stone-800">{phone}</span></p>}
                  {order.customer?.email && (
                    <p className="break-all">Email: <span className="text-stone-800">{order.customer.email}</span></p>
                  )}
                </div>
              )}
            </section>

            <section className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <h3 className="font-bold text-stone-500 uppercase tracking-wider text-[10px] mb-2">Payment</h3>
              <dl className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-stone-500">Method</dt>
                  <dd className="font-medium text-stone-800 text-right">{toReadableText(order.paymentMethod) || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-stone-500">Status</dt>
                  <dd>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${paymentTone(order.paymentStatus)}`}>
                      {formatUserFacingPaymentStatus(order.paymentStatus) || '—'}
                    </span>
                  </dd>
                </div>
                {order.transactionId && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-stone-500 shrink-0">Transaction ID</dt>
                    <dd className="font-mono text-[11px] text-stone-800 text-right break-all">{order.transactionId}</dd>
                  </div>
                )}
              </dl>
            </section>
          </div>

          {/* Items */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-bold text-stone-500 uppercase tracking-wider text-[10px] font-sans">Items</h3>
              <span className="text-[11px] font-sans text-stone-400">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Mobile: item cards */}
            <ul className="sm:hidden print:hidden space-y-2.5 font-sans">
              {items.map((item, idx) => (
                <li key={idx} className="rounded-xl border border-stone-200 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-900 leading-snug break-words">{item.name}</p>
                    <p className="text-sm font-bold text-stone-900 tabular-nums shrink-0">{formatExactPrice(item.lineTotal)}</p>
                  </div>
                  {(item.size || item.colorName || item.sku) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {item.size && (
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">Size {item.size}</span>
                      )}
                      {item.colorName && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {item.colorHex && (
                            <span className="w-2.5 h-2.5 rounded-full border border-stone-300" style={{ backgroundColor: item.colorHex }} />
                          )}
                          {item.colorName}
                        </span>
                      )}
                      {item.sku && <span className="font-mono text-stone-400 break-all">SKU {item.sku}</span>}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-stone-500 tabular-nums">
                    {item.qty} × {formatExactPrice(item.unitPrice)}
                  </p>
                </li>
              ))}
            </ul>

            {/* Tablet / desktop / print: table */}
            <div className="hidden sm:block print:block overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b-2 border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-3">Item</th>
                    <th className="py-2.5 pr-3">Size / Color</th>
                    <th className="py-2.5 pr-3 text-right">Qty</th>
                    <th className="py-2.5 pr-3 text-right whitespace-nowrap">Unit Price</th>
                    <th className="py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="align-top hover:bg-stone-50/50">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-stone-800">{item.name}</p>
                        {item.sku && <p className="mt-0.5 font-mono text-[10px] text-stone-400">SKU {item.sku}</p>}
                      </td>
                      <td className="py-3 pr-3 text-stone-600 text-[11px]">
                        {item.size || item.colorName ? (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {item.size && <span>{item.size}</span>}
                            {item.size && item.colorName && <span className="text-stone-300">/</span>}
                            {item.colorName && (
                              <span className="inline-flex items-center gap-1.5">
                                {item.colorHex && (
                                  <span className="w-2.5 h-2.5 rounded-full border border-stone-300" style={{ backgroundColor: item.colorHex }} />
                                )}
                                {item.colorName}
                              </span>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pr-3 text-right text-stone-800 tabular-nums">{item.qty}</td>
                      <td className="py-3 pr-3 text-right text-stone-800 tabular-nums whitespace-nowrap">{formatExactPrice(item.unitPrice)}</td>
                      <td className="py-3 text-right font-medium text-stone-900 tabular-nums whitespace-nowrap">{formatExactPrice(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Totals Breakdown */}
          <div className="flex sm:justify-end">
            <dl className="w-full sm:w-72 space-y-2 text-xs font-sans rounded-xl sm:rounded-none bg-stone-50 sm:bg-transparent border border-stone-100 sm:border-0 sm:border-t sm:border-stone-200 p-4 sm:px-0 sm:pt-4 sm:pb-0">
              <div className="flex justify-between text-stone-600">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatExactPrice(order.subtotal ?? 0)}</dd>
              </div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between gap-3 text-emerald-700 font-medium">
                  <dt className="break-words">Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                  <dd className="tabular-nums shrink-0">-{formatExactPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <dt>Tax</dt>
                <dd className="tabular-nums">{formatExactPrice(order.tax ?? 0)}</dd>
              </div>
              <div className="flex justify-between text-stone-600">
                <dt>Shipping</dt>
                <dd className="tabular-nums">{order.shippingFee === 0 ? 'Free' : formatExactPrice(order.shippingFee ?? 0)}</dd>
              </div>
              <div className="flex justify-between items-baseline text-base font-serif font-bold text-stone-900 pt-2.5 mt-1 border-t border-stone-200">
                <dt>Total</dt>
                <dd className="text-lg text-allura-goldDark tabular-nums">{formatExactPrice(order.total ?? 0)}</dd>
              </div>
            </dl>
          </div>

          {/* Footer */}
          <div className="pt-5 border-t border-dashed border-stone-200 text-[11px] sm:text-[10px] font-sans text-stone-500 space-y-1 break-words">
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

        {/* Mobile action bar, always reachable at the bottom of the sheet */}
        <div className="sm:hidden print:hidden flex-shrink-0 grid grid-cols-2 gap-2.5 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-stone-100 bg-white">
          {actionButtons}
        </div>
      </div>
    </div>
  );
};
