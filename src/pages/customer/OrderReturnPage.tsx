import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Info } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useCustomerOrder } from '../../hooks/useCustomerOrder';
import { ItemVariantMeta } from '../../components/common/ItemVariantMeta';
import { useExchangeEligibility } from '../../hooks/useExchangeEligibility';
import {
  EXCHANGE_WINDOW_DAYS,
  formatExchangeDeadline,
  getExchangeEligibility,
} from '../../utils/exchangeEligibility';
import { normalizeWhatsAppNumber, openWhatsApp } from '../../utils/whatsapp';
import { buildReturnWhatsAppUrl, getItemDisplayPrice } from '../../utils/buildReturnWhatsAppMessage';

const EXCHANGE_REASONS = [
  'Size issue',
  'Wrong item received',
  'Damaged / defective',
  'Color different from image',
  'Quality not as expected',
  'Changed my mind',
  'Other',
] as const;

const WHATSAPP_UNAVAILABLE = 'WhatsApp support is not available right now, please try again later';

const labelClass = 'block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-2';
const errorClass = 'text-[11px] font-sans text-rose-700 mt-1.5';

type Field = 'reason' | 'comments';

export const OrderReturnPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const { storeSettings, showToast, formatExactPrice } = useShop();
  const { order, isLoading: isLoadingOrder } = useCustomerOrder(orderId);

  // The product comes from the "Exchange" button it was opened from (?item=<index>)
  const itemParam = searchParams.get('item');
  const itemIndex = itemParam !== null && /^\d+$/.test(itemParam) ? Number(itemParam) : -1;
  const item = order?.items[itemIndex];

  /** Quantity to exchange; null until changed, meaning the full ordered quantity */
  const [quantity, setQuantity] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [preferredVariant, setPreferredVariant] = useState('');
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});

  const touch = (field: Field) => setTouched(prev => (prev[field] ? prev : { ...prev, [field]: true }));

  const errors = useMemo(() => {
    const e: Partial<Record<Field, string>> = {};
    if (!reason) e.reason = 'Choose a reason.';
    if (reason === 'Other' && !comments.trim()) e.comments = 'Please tell us more when the reason is "Other".';
    return e;
  }, [reason, comments]);
  const isValid = Object.keys(errors).length === 0;
  // Re-evaluated live: the form closes itself when the 7-day window ends while it is open
  const eligibility = useExchangeEligibility(order);

  if (isLoadingOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-allura-muted">
        <div className="w-7 h-7 border-2 border-allura-goldDark border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-sans uppercase tracking-widest">Loading order…</p>
      </div>
    );
  }

  if (!order || !eligibility) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl text-allura-text">Order Not Found</h2>
        <Link to="/account/orders" className="text-xs font-sans text-allura-goldDark underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  const header = (
    <div>
      <Link
        to={`/account/orders/${order.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-sans text-allura-muted hover:text-allura-text transition-colors mb-2"
      >
        <ArrowLeft size={14} />
        <span>Back to Order {order.orderNumber}</span>
      </Link>
      <h1 className="font-serif text-2xl sm:text-4xl text-allura-text font-normal">Exchange Request</h1>
      <p className="text-xs font-sans text-allura-muted mt-1">
        Exchanges are available within {EXCHANGE_WINDOW_DAYS} days of delivery. Our team will continue with you on WhatsApp.
      </p>
    </div>
  );

  if (!eligibility.eligible) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-6">
        {header}
        <div className="bg-allura-card border border-allura-border rounded-2xl p-5 sm:p-6 shadow-subtle flex items-start gap-3 text-xs font-sans text-allura-text">
          <Info size={18} className="text-allura-goldDark shrink-0 mt-0.5" />
          <div className="space-y-3">
            <p>{eligibility.reason}</p>
            <Link
              to={`/account/orders/${order.id}`}
              className="inline-block px-5 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors"
            >
              Back to Order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No (or an unknown) product picked: send them back to choose one on the order page
  if (!item) {
    return <Navigate to={`/account/orders/${order.id}`} replace />;
  }

  const selectedQty = Math.min(Math.max(quantity ?? item.quantity, 1), item.quantity);

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ reason: true, comments: true });
    if (!isValid) return;

    // Re-check against the clock at the moment of submitting, not the last render
    const current = getExchangeEligibility(order, Date.now());
    if (!current.eligible) {
      showToast(current.reason, 'error');
      return;
    }

    const number = normalizeWhatsAppNumber(storeSettings?.boutiqueProfile?.whatsappNumber);
    if (!number) {
      showToast(WHATSAPP_UNAVAILABLE, 'error');
      return;
    }

    const url = buildReturnWhatsAppUrl(number, order, {
      type: 'Exchange',
      items: [{ item, quantity: selectedQty }],
      reason,
      comments,
      preferredVariant,
    });
    // Opened synchronously inside the submit handler so popup blockers allow it
    openWhatsApp(url);
  };

  const deadlineText = formatExchangeDeadline(eligibility.deadline);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-6 sm:space-y-8">
      {header}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-allura-card border border-allura-border rounded-2xl p-4 sm:p-8 shadow-luxury space-y-7"
      >
        <p className="text-[11px] font-sans text-allura-muted bg-allura-bg/60 border border-allura-border rounded-xl px-3 py-2">
          Eligible until <strong className="text-allura-text">{deadlineText}</strong>
        </p>

        {/* 1. Product (pre-selected from the button it was opened from) */}
        <div>
          <p className={labelClass}>Product</p>
          <div className="p-3 rounded-xl border border-allura-gold bg-allura-gold/10">
            <div className="flex items-start gap-3">
              <img
                src={item.product.images.primary}
                alt={item.product.name}
                className="w-14 h-[4.5rem] object-cover rounded-lg bg-allura-bgSecondary shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1 text-xs font-sans">
                <p className="font-serif text-sm sm:text-base text-allura-text break-words">{item.product.name}</p>
                <ItemVariantMeta size={item.selectedSize} color={item.selectedColor} sku={item.sku} />
                <p className="text-allura-muted">
                  Qty: <strong className="text-allura-text">{item.quantity}</strong>
                  <span className="mx-1.5 text-allura-border">•</span>
                  <strong className="text-allura-darkBrown">{formatExactPrice(getItemDisplayPrice(item))}</strong>
                </p>
              </div>
            </div>

            {item.quantity > 1 && (
              <div className="flex items-center gap-2 mt-3 text-xs font-sans">
                <label htmlFor="exchange-qty" className="text-allura-muted">
                  Quantity to exchange:
                </label>
                <select
                  id="exchange-qty"
                  value={selectedQty}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="px-2 py-1 bg-allura-bg border border-allura-border rounded-lg text-allura-text focus:outline-none focus:border-allura-gold"
                >
                  {Array.from({ length: item.quantity }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>
                      {n} of {item.quantity}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 2. Reason */}
        <div>
          <label htmlFor="exchange-reason" className={labelClass}>
            Exchange Reason *
          </label>
          <select
            id="exchange-reason"
            value={reason}
            onChange={e => {
              setReason(e.target.value);
              touch('reason');
            }}
            onBlur={() => touch('reason')}
            aria-invalid={!!(touched.reason && errors.reason)}
            className="w-full p-3 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
          >
            <option value="" disabled>
              Select a reason
            </option>
            {EXCHANGE_REASONS.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {touched.reason && errors.reason && <p className={errorClass}>{errors.reason}</p>}
        </div>

        {/* 3. Comments */}
        <div>
          <label htmlFor="exchange-comments" className={labelClass}>
            Comments {reason === 'Other' ? '*' : '(Optional)'}
          </label>
          <textarea
            id="exchange-comments"
            value={comments}
            onChange={e => setComments(e.target.value)}
            onBlur={() => touch('comments')}
            maxLength={500}
            rows={3}
            placeholder="Tell us a little more about the issue"
            aria-invalid={!!(touched.comments && errors.comments)}
            className="w-full p-3 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold resize-none"
          />
          {touched.comments && errors.comments && <p className={errorClass}>{errors.comments}</p>}
        </div>

        {/* 4. Exchange preference */}
        <div>
          <label htmlFor="exchange-preferred" className={labelClass}>
            Preferred Size / Color (Optional)
          </label>
          <input
            id="exchange-preferred"
            type="text"
            value={preferredVariant}
            onChange={e => setPreferredVariant(e.target.value)}
            maxLength={100}
            placeholder="e.g. Size M, Maroon"
            className="w-full p-3 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
          />
        </div>

        <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[11px] font-sans text-allura-muted">
            Opens WhatsApp with your order details filled in. Send the message to complete your request.
          </p>
          <button
            type="submit"
            disabled={!isValid}
            className="w-full sm:w-auto shrink-0 px-6 py-3 bg-[#25D366] hover:bg-[#1EBE5A] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle size={16} />
            <span>Continue on WhatsApp</span>
          </button>
        </div>
      </form>
    </div>
  );
};
