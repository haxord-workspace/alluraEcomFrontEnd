import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Info } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useCustomerOrder } from '../../hooks/useCustomerOrder';
import { ItemVariantMeta } from '../../components/common/ItemVariantMeta';
import { getReturnEligibility, RETURN_WINDOW_DAYS } from '../../utils/returnEligibility';
import { normalizeWhatsAppNumber, openWhatsApp } from '../../utils/whatsapp';
import {
  buildReturnWhatsAppUrl,
  getItemDisplayPrice,
  type ReturnRequestType,
} from '../../utils/buildReturnWhatsAppMessage';

const REQUEST_TYPES: { value: ReturnRequestType; label: string; hint: string }[] = [
  { value: 'Return', label: 'Return', hint: 'Send the item back' },
  { value: 'Exchange', label: 'Exchange', hint: 'Swap for another size / colour' },
];

const RETURN_REASONS = [
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

type Field = 'type' | 'reason' | 'comments';

export const OrderReturnPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const { storeSettings, showToast, formatExactPrice } = useShop();
  const { order, isLoading: isLoadingOrder } = useCustomerOrder(orderId);

  // The product comes from the "Return or Exchange Request" button it was opened from (?item=<index>)
  const itemParam = searchParams.get('item');
  const itemIndex = itemParam !== null && /^\d+$/.test(itemParam) ? Number(itemParam) : -1;
  const item = order?.items[itemIndex];

  const [requestType, setRequestType] = useState<ReturnRequestType | ''>('');
  /** Quantity to return / exchange; null until changed, meaning the full ordered quantity */
  const [quantity, setQuantity] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [preferredVariant, setPreferredVariant] = useState('');
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});

  const touch = (field: Field) => setTouched(prev => (prev[field] ? prev : { ...prev, [field]: true }));

  const errors = useMemo(() => {
    const e: Partial<Record<Field, string>> = {};
    if (!requestType) e.type = 'Choose Return or Exchange.';
    if (!reason) e.reason = 'Choose a reason.';
    if (reason === 'Other' && !comments.trim()) e.comments = 'Please tell us more when the reason is "Other".';
    return e;
  }, [requestType, reason, comments]);
  const isValid = Object.keys(errors).length === 0;

  if (isLoadingOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-allura-muted">
        <div className="w-7 h-7 border-2 border-allura-goldDark border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-sans uppercase tracking-widest">Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl text-allura-text">Order Not Found</h2>
        <Link to="/account/orders" className="text-xs font-sans text-allura-goldDark underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  const eligibility = getReturnEligibility(order);

  const header = (
    <div>
      <Link
        to={`/account/orders/${order.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-sans text-allura-muted hover:text-allura-text transition-colors mb-2"
      >
        <ArrowLeft size={14} />
        <span>Back to Order {order.orderNumber}</span>
      </Link>
      <h1 className="font-serif text-2xl sm:text-4xl text-allura-text font-normal">Return or Exchange Request</h1>
      <p className="text-xs font-sans text-allura-muted mt-1">
        Easy {RETURN_WINDOW_DAYS}-day exchange from the date of delivery. Our team will continue with you on WhatsApp.
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
    setTouched({ type: true, reason: true, comments: true });
    if (!isValid || !requestType) return;

    const number = normalizeWhatsAppNumber(storeSettings?.boutiqueProfile?.whatsappNumber);
    if (!number) {
      showToast(WHATSAPP_UNAVAILABLE, 'error');
      return;
    }

    const url = buildReturnWhatsAppUrl(number, order, {
      type: requestType,
      items: [{ item, quantity: selectedQty }],
      reason,
      comments,
      preferredVariant: requestType === 'Exchange' ? preferredVariant : undefined,
    });
    // Opened synchronously inside the submit handler so popup blockers allow it
    openWhatsApp(url);
  };

  const deadlineText = eligibility.deadline?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

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

        {/* 1. Request type */}
        <fieldset>
          <legend className={labelClass}>Request Type *</legend>
          <div className="grid grid-cols-2 gap-3">
            {REQUEST_TYPES.map(opt => (
              <label
                key={opt.value}
                className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all text-xs font-sans ${
                  requestType === opt.value ? 'border-allura-gold bg-allura-gold/10' : 'border-allura-border hover:border-allura-gold/60'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="request_type"
                    value={opt.value}
                    checked={requestType === opt.value}
                    onChange={() => {
                      setRequestType(opt.value);
                      touch('type');
                    }}
                    className="accent-allura-gold"
                  />
                  <span className="font-bold text-allura-text">{opt.label}</span>
                </span>
                <span className="block text-allura-muted pl-5 mt-0.5">{opt.hint}</span>
              </label>
            ))}
          </div>
          {touched.type && errors.type && <p className={errorClass}>{errors.type}</p>}
        </fieldset>

        {/* 2. Product (pre-selected from the button it was opened from) */}
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
                <label htmlFor="return-qty" className="text-allura-muted">
                  Quantity to {requestType ? requestType.toLowerCase() : 'return'}:
                </label>
                <select
                  id="return-qty"
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

        {/* 3. Reason */}
        <div>
          <label htmlFor="return-reason" className={labelClass}>
            Reason *
          </label>
          <select
            id="return-reason"
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
            {RETURN_REASONS.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {touched.reason && errors.reason && <p className={errorClass}>{errors.reason}</p>}
        </div>

        {/* 4. Comments */}
        <div>
          <label htmlFor="return-comments" className={labelClass}>
            Comments {reason === 'Other' ? '*' : '(Optional)'}
          </label>
          <textarea
            id="return-comments"
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

        {/* 5. Exchange preference */}
        {requestType === 'Exchange' && (
          <div>
            <label htmlFor="return-preferred" className={labelClass}>
              Preferred Size / Color (Optional)
            </label>
            <input
              id="return-preferred"
              type="text"
              value={preferredVariant}
              onChange={e => setPreferredVariant(e.target.value)}
              maxLength={100}
              placeholder="e.g. Size M, Maroon"
              className="w-full p-3 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
            />
          </div>
        )}

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
