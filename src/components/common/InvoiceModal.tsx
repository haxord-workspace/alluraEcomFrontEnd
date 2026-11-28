import React, { useMemo, useState } from 'react';
import { Printer, Download, Loader2 } from 'lucide-react';
import { AlluraLogo } from './AlluraLogo';
import { useShop } from '../../context/ShopContext';
import type { Order } from '../../types';
import { buildInvoiceData, supportLine, type InvoiceTone } from '../../utils/invoice/invoiceData';
import { Modal } from './Modal';

const TONE_CLASSES: Record<InvoiceTone, string> = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
};

/** jsPDF + fonts are only fetched when someone downloads or prints */
const loadPdfModule = () => import('../../utils/invoice/invoicePdfBrowser');

interface InvoiceModalProps {
  /**
   * The order to show. Customer pages pass orders from the customer's own order API and the
   * admin page passes orders from the admin API, so access control stays with those endpoints.
   * Both sides render and download the invoice through the same shared template and generator.
   */
  order: Order | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  const { showToast, storeSettings } = useShop();
  const [busy, setBusy] = useState<'download' | 'print' | null>(null);
  const profile = storeSettings?.boutiqueProfile;

  // The single view-model for both the on-screen invoice and the PDF
  const invoice = useMemo(() => (order ? buildInvoiceData(order, profile) : null), [order, profile]);

  if (!order || !invoice) return null;

  const runPdf = async (kind: 'download' | 'print') => {
    if (busy) return;
    setBusy(kind);
    try {
      const pdf = await loadPdfModule();
      await (kind === 'download' ? pdf.downloadInvoicePdf(invoice) : pdf.printInvoicePdf(invoice));
    } catch (err) {
      console.error('Invoice PDF failed', err);
      showToast(
        kind === 'download'
          ? 'Could not create the invoice PDF. Please check your connection and try again.'
          : 'Could not prepare the invoice for printing. Please try again.',
        'error'
      );
    } finally {
      setBusy(null);
    }
  };

  const { company, payment } = invoice;
  const support = supportLine(company);

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={() => runPdf('print')}
        disabled={!!busy}
        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 rounded-lg border border-stone-200 bg-white text-sm sm:text-xs font-sans font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-60"
      >
        {busy === 'print' ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
        <span>{busy === 'print' ? 'Preparing…' : 'Print'}</span>
      </button>
      <button
        type="button"
        onClick={() => runPdf('download')}
        disabled={!!busy}
        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 rounded-lg bg-allura-darkBrown text-white text-sm sm:text-xs font-sans font-medium hover:bg-allura-softBrown transition-colors disabled:opacity-60"
      >
        {busy === 'download' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        <span>{busy === 'download' ? 'Downloading…' : 'Download PDF'}</span>
      </button>
    </>
  );

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      isBusy={!!busy}
      isDirty={false}
      labelledBy="invoice-modal-title"
      backdropClassName="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in"
      panelClassName="relative bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[94dvh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-slide-up text-stone-800 focus:outline-none"
      closeButtonClassName="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-10 h-10 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-40"
    >
      {/* Top bar (fixed; the invoice scrolls underneath it) */}
      <div className="flex-shrink-0 border-b border-stone-100">
        {/* Drag handle look on mobile sheets */}
        <div className="sm:hidden flex justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-stone-200" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-8 py-3 sm:py-4 pr-14 sm:pr-16">
          <div className="min-w-0">
            <p id="invoice-modal-title" className="text-[11px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
              Invoice
            </p>
            <p className="text-xs font-sans text-stone-500 truncate">
              {invoice.invoiceNumber || invoice.orderNumber}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">{actionButtons}</div>
        </div>
      </div>

      {/* Scrollable invoice body */}
      <div className="invoice-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">

        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-5">
          <div>
            <div className="mb-2">
              <AlluraLogo size="md" variant="dark" />
            </div>
            {company.tagline && <p className="text-xs text-stone-500 font-sans">{company.tagline}</p>}
          </div>

          <div className="sm:text-right">
            <p className="font-serif text-xl sm:text-2xl font-bold text-allura-darkBrown tracking-wide mb-2">{invoice.title}</p>
            <dl className="grid grid-cols-2 sm:grid-cols-[auto_auto] gap-x-4 gap-y-2 sm:gap-y-1 text-xs font-sans">
              {invoice.meta.map(m => (
                <div key={m.label} className="sm:contents">
                  <dt className="text-[10px] sm:text-xs uppercase sm:normal-case tracking-wider sm:tracking-normal text-stone-400 sm:text-stone-500 sm:text-left">
                    {m.label}
                  </dt>
                  <dd className={`break-words ${m.strong ? 'font-bold text-allura-darkBrown' : 'font-semibold text-stone-800'}`}>
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Customer & Payment */}
        <div className={`grid grid-cols-1 gap-3 sm:gap-4 text-xs font-sans ${invoice.parties.length > 1 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {invoice.parties.map(party => (
            <section key={party.title} className="p-4 rounded-xl bg-stone-50 border border-stone-100">
              <h3 className="font-bold text-stone-500 uppercase tracking-wider text-[10px] mb-2">{party.title}</h3>
              <p className="font-semibold text-sm text-stone-900 break-words">{party.name}</p>
              {party.lines.length > 0 && (
                <div className="mt-1 text-stone-600 leading-relaxed break-words">
                  {party.lines.map(line => <p key={line}>{line}</p>)}
                </div>
              )}
              {party.contacts.length > 0 && (
                <div className="mt-2 pt-2 border-t border-stone-200/70 space-y-0.5 text-stone-600">
                  {party.contacts.map(c => (
                    <p key={c.label} className="break-all">
                      {c.label}: <span className="text-stone-800">{c.value}</span>
                    </p>
                  ))}
                </div>
              )}
            </section>
          ))}

          <section className="p-4 rounded-xl bg-stone-50 border border-stone-100">
            <h3 className="font-bold text-stone-500 uppercase tracking-wider text-[10px] mb-2">Payment</h3>
            <dl className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">Method</dt>
                <dd className="font-medium text-stone-800 text-right">{payment.method}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">Status</dt>
                <dd>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${TONE_CLASSES[payment.tone]}`}>
                    {payment.status}
                  </span>
                </dd>
              </div>
              {payment.transactionId && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-stone-500 shrink-0">Transaction ID</dt>
                  <dd className="text-[11px] text-stone-800 text-right break-all">{payment.transactionId}</dd>
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
              {invoice.itemCount} {invoice.itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Mobile: item cards */}
          <ul className="sm:hidden space-y-2.5 font-sans">
            {invoice.items.map((item, idx) => (
              <li key={idx} className="rounded-xl border border-stone-200 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-stone-900 leading-snug break-words">{item.name}</p>
                  <p className="text-sm font-bold text-stone-900 tabular-nums shrink-0">{item.lineTotal}</p>
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
                    {item.sku && <span className="text-stone-400 break-all">{item.sku}</span>}
                  </div>
                )}
                <p className="mt-2 text-xs text-stone-500 tabular-nums">
                  {item.qty} × {item.unitPrice}
                </p>
              </li>
            ))}
          </ul>

          {/* Tablet / desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-[#FBF2E4] text-allura-darkBrown text-[11px]">
                  <th className="py-2.5 px-3 font-semibold rounded-l-lg">Item</th>
                  <th className="py-2.5 px-3 font-semibold">Size / Color</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                  <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Unit price</th>
                  <th className="py-2.5 px-3 font-semibold text-right rounded-r-lg">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="align-top hover:bg-stone-50/50">
                    <td className="py-3 px-3">
                      <p className="font-medium text-stone-800">{item.name}</p>
                      {item.sku && <p className="mt-0.5 text-[10px] text-stone-400 break-all">{item.sku}</p>}
                    </td>
                    <td className="py-3 px-3 text-stone-600 text-[11px]">
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
                    <td className="py-3 px-3 text-right text-stone-800 tabular-nums">{item.qty}</td>
                    <td className="py-3 px-3 text-right text-stone-800 tabular-nums whitespace-nowrap">{item.unitPrice}</td>
                    <td className="py-3 px-3 text-right font-medium text-stone-900 tabular-nums whitespace-nowrap">{item.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Totals Breakdown */}
        <div className="flex sm:justify-end">
          <dl className="w-full sm:w-72 space-y-2 text-xs font-sans rounded-xl bg-stone-50 border border-stone-200/70 p-4">
            {invoice.totals.map(row => (
              <div
                key={row.label}
                className={`flex justify-between gap-3 ${row.kind === 'discount' ? 'text-emerald-700 font-medium' : 'text-stone-600'}`}
              >
                <dt className="break-words">{row.label}</dt>
                <dd className="tabular-nums shrink-0">{row.value}</dd>
              </div>
            ))}
            <div className="flex justify-between items-baseline font-bold text-allura-darkBrown rounded-lg bg-allura-goldLight px-3 py-2.5 !mt-3">
              <dt className="text-sm">Total</dt>
              <dd className="text-base tabular-nums">{invoice.grandTotal}</dd>
            </div>
          </dl>
        </div>

        {/* Terms */}
        <section className="font-sans">
          <h3 className="font-bold text-stone-500 uppercase tracking-wider text-[10px] mb-1.5">Terms &amp; Conditions</h3>
          <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-stone-600">
            {invoice.terms.map(term => <li key={term}>{term}</li>)}
          </ol>
        </section>

        {/* Footer */}
        <div className="pt-5 border-t border-dashed border-stone-200 text-[11px] sm:text-[10px] font-sans text-stone-500 space-y-1 break-words">
          <p className="font-semibold text-stone-800 text-xs sm:text-[11px]">{company.name}</p>
          {/* {company.gstin && <p>GSTIN: {company.gstin}</p>} */}
          {company.address && <p>{company.address}</p>}
          {support && <p>{support}</p>}
          <p className="pt-2 font-medium text-allura-darkBrown text-xs">{invoice.thankYou}</p>
        </div>

      </div>

      {/* Mobile action bar, always reachable at the bottom of the sheet */}
      <div className="sm:hidden flex-shrink-0 grid grid-cols-2 gap-2.5 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-stone-100 bg-white">
        {actionButtons}
      </div>
    </Modal>
  );
};
