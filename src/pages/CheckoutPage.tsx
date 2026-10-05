import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  CreditCard,
  QrCode,
  Banknote,
  ArrowLeft,
  Lock,
  MapPin,
  Plus,
  Loader2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { AlluraLogo } from '../components/common/AlluraLogo';
import {
  previewCheckout,
  createCheckout,
  newIdempotencyKey,
  checkoutErrorMessage,
} from '../service/checkout';
import type { CheckoutRequest, CheckoutSummary, CheckoutSession } from '../service/checkout';
import type { CartItem, SavedAddress } from '../types';
import { useOrderPayment } from '../hooks/useOrderPayment';

type DeliveryMethod = 'STANDARD' | 'STORE_PICKUP';
type PaymentMethod = 'upi' | 'card' | 'cod';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  upi: 'UPI',
  card: 'Card',
  cod: 'Cash on Delivery',
};

const EMPTY_ADDRESS = {
  label: 'Home',
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  postalCode: '',
};

const formatAddress = (a: SavedAddress) =>
  [a.addressLine1, a.addressLine2, a.landmark, a.city, a.state].filter(Boolean).join(', ') + (a.postalCode ? ` - ${a.postalCode}` : '');

const inputClass =
  'w-full bg-allura-bg border border-allura-border rounded p-3 text-xs text-allura-text focus:outline-none focus:border-allura-gold';

export const CheckoutPage: React.FC = () => {
  const {
    customer,
    cart,
    cartId,
    cartSubtotal,
    freeShippingRemaining,
    formatPrice,
    appliedCoupon,
    couponDiscount,
    fetchCustomerAddresses,
    addCustomerAddress,
    clearCart,
    refreshOrders,
  } = useShop();

  // Online payment (Razorpay) after the order is created
  const { payForOrder, isPaying } = useOrderPayment();
  const [paymentState, setPaymentState] = useState<'idle' | 'paid' | 'cod' | 'pending'>('idle');
  const [paymentMessage, setPaymentMessage] = useState('');

  const addresses = useMemo(() => customer?.addresses || [], [customer?.addresses]);

  // ── Address selection ────────────────────────────────────────────────────
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');

  // Load saved addresses once
  useEffect(() => {
    fetchCustomerAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick the default address (or show the form when there are none)
  useEffect(() => {
    if (selectedAddressId && addresses.some(a => a.id === selectedAddressId)) return;
    const preferred = addresses.find(a => a.isDefaultShipping) || addresses[0];
    if (preferred) {
      setSelectedAddressId(preferred.id);
      setIsAddingAddress(false);
    } else {
      setIsAddingAddress(true);
    }
  }, [addresses, selectedAddressId]);

  // Prefill the new-address form with the customer's details
  useEffect(() => {
    if (!customer) return;
    setNewAddress(prev => ({
      ...prev,
      fullName: prev.fullName || customer.name || '',
      phone: prev.phone || (typeof customer.phone === 'string' ? customer.phone : '') || '',
    }));
  }, [customer]);

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  // ── Server-side preview ──────────────────────────────────────────────────
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const request: CheckoutRequest | null = useMemo(
    () =>
      cartId && selectedAddressId && !isAddingAddress
        ? {
            cartId,
            addressId: selectedAddressId,
            couponCode: appliedCoupon?.code,
            shippingMethod: deliveryMethod,
          }
        : null,
    [cartId, selectedAddressId, isAddingAddress, appliedCoupon?.code, deliveryMethod]
  );

  // Re-preview when the request or the bag contents change
  const cartSignature = cart.map(i => `${i.id}:${i.quantity}`).join(',');
  useEffect(() => {
    if (!request || cart.length === 0) {
      setSummary(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsPreviewing(true);
      try {
        const result = await previewCheckout(request);
        if (!cancelled) {
          setSummary(result);
          setPreviewError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSummary(null);
          setPreviewError(checkoutErrorMessage(err, 'Could not calculate your order total.'));
        }
      } finally {
        if (!cancelled) setIsPreviewing(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [request, cartSignature, cart.length]);

  // ── Create checkout ──────────────────────────────────────────────────────
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [session, setSession] = useState<CheckoutSession | null>(null);

  const startPayment = async (created: CheckoutSession, retry = false) => {
    const outcome = await payForOrder(created.orderId, {
      retry,
      description: created.orderNumber ? `Order ${created.orderNumber}` : 'Allura order',
      prefill: {
        name: customer?.name,
        email: customer?.email,
        contact: typeof customer?.phone === 'string' ? customer.phone.replace(/\s+/g, '') : undefined,
      },
    });
    if (outcome.ok) {
      setPaymentState('paid');
      setPaymentMessage('');
    } else {
      setPaymentState('pending');
      setPaymentMessage(outcome.message);
    }
    refreshOrders();
  };
  // Same key for retries of the same attempt; a new one when anything changes
  const idempotency = useRef<{ signature: string; key: string } | null>(null);

  const saveNewAddress = async (): Promise<string | null> => {
    const a = newAddress;
    if (!a.fullName.trim() || !a.phone.trim() || !a.addressLine1.trim() || !a.city.trim() || !a.state.trim() || !a.postalCode.trim()) {
      setPlaceError('Please fill in all required address fields.');
      return null;
    }
    setIsSavingAddress(true);
    try {
      const saved = await addCustomerAddress({
        label: a.label,
        fullName: a.fullName.trim(),
        phone: { countryCode: '+91', number: a.phone.replace(/^\+91\s*/, '').replace(/\s+/g, '') },
        addressLine1: a.addressLine1.trim(),
        ...(a.addressLine2.trim() ? { addressLine2: a.addressLine2.trim() } : {}),
        ...(a.landmark.trim() ? { landmark: a.landmark.trim() } : {}),
        city: a.city.trim(),
        state: a.state.trim(),
        postalCode: a.postalCode.trim(),
        country: 'India',
        isDefaultShipping: addresses.length === 0,
        isDefaultBilling: addresses.length === 0,
      });
      if (!saved?.id) return null;
      setSelectedAddressId(saved.id);
      setIsAddingAddress(false);
      setNewAddress({ ...EMPTY_ADDRESS, fullName: a.fullName, phone: a.phone });
      return saved.id;
    } catch {
      return null; // toast shown by the context
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlaceError(null);
    if (!cartId) {
      setPlaceError('Your bag is still loading. Please try again in a moment.');
      return;
    }

    let addressId = selectedAddressId;
    if (isAddingAddress) {
      const saved = await saveNewAddress();
      if (!saved) return;
      addressId = saved;
    }
    if (!addressId) {
      setPlaceError('Please choose a delivery address.');
      return;
    }

    const req: CheckoutRequest = {
      cartId,
      addressId,
      couponCode: appliedCoupon?.code,
      shippingMethod: deliveryMethod,
    };
    const signature = JSON.stringify({ req, cartSignature });
    if (!idempotency.current || idempotency.current.signature !== signature) {
      idempotency.current = { signature, key: newIdempotencyKey() };
    }

    setIsPlacing(true);
    try {
      const created = await createCheckout(req, idempotency.current.key);
      setSession(created);
      // The order now holds these items: empty the bag so the same items can't be ordered twice.
      // (Payment, if still pending, is completed on the order itself, not by checking out again.)
      clearCart();
      if (paymentMethod === 'cod') {
        setPaymentState('cod');
        refreshOrders();
      } else {
        await startPayment(created);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      setPlaceError(
        status === 409
          ? checkoutErrorMessage(err, 'Some items were just reserved by another shopper or this order is already being processed. Please review your bag and try again.')
          : checkoutErrorMessage(err, 'Could not place your order. Please try again.')
      );
    } finally {
      setIsPlacing(false);
    }
  };

  // ── Fallback totals (before the server preview is available) ─────────────
  const estimatedShipping = deliveryMethod === 'STORE_PICKUP' ? 0 : freeShippingRemaining === 0 ? 0 : 150;
  const display = summary
    ? {
        subtotal: summary.subtotal,
        productDiscount: summary.productDiscount,
        promotionDiscount: summary.promotionDiscount,
        couponDiscount: summary.couponDiscount,
        shipping: summary.shippingAmount,
        tax: summary.taxAmount,
        total: summary.total,
      }
    : {
        subtotal: cartSubtotal,
        productDiscount: 0,
        promotionDiscount: 0,
        couponDiscount,
        shipping: estimatedShipping,
        tax: 0,
        total: Math.max(0, cartSubtotal - couponDiscount) + estimatedShipping,
      };
  const isEstimate = !summary;

  // The backend priced one or more items at ₹0: don't allow placing the order
  const unpricedLines = summary ? summary.items.filter(l => l.quantity > 0 && l.unitPrice <= 0) : [];
  const pricingError =
    summary && cart.length > 0 && (summary.subtotal <= 0 || unpricedLines.length > 0)
      ? `We couldn't get the price for ${
          unpricedLines.length > 0 ? unpricedLines.map(l => l.sku || 'an item').join(', ') : 'your items'
        }. Please try again shortly or contact us on WhatsApp.`
      : null;

  // ── Confirmation ─────────────────────────────────────────────────────────
  if (session && (isPaying || paymentState === 'idle')) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 flex flex-col items-center gap-4 text-center">
        <Loader2 size={32} className="animate-spin text-allura-goldDark" />
        <h2 className="font-serif text-2xl text-allura-text">Completing your payment…</h2>
        <p className="text-xs font-sans text-allura-muted">
          Finish the payment in the secure Razorpay window. Please don't close or refresh this page.
        </p>
      </div>
    );
  }

  if (session) {
    const s = session.summary;
    const isPending = paymentState === 'pending';
    const reference = session.orderNumber || session.orderId || session.checkoutId;
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-6 animate-slide-up">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
            isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {isPending ? <AlertTriangle size={38} /> : <CheckCircle2 size={40} />}
        </div>

        <span className="text-[11px] font-sans font-bold tracking-[0.3em] uppercase text-allura-goldDark">
          {paymentState === 'paid' ? 'PAYMENT SUCCESSFUL' : paymentState === 'cod' ? 'ORDER PLACED' : 'PAYMENT PENDING'}
        </span>

        <h1 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal uppercase tracking-tight">
          {isPending ? 'YOUR ORDER IS SAVED' : 'THANK YOU FOR YOUR ORDER'}
        </h1>

        {isPending && paymentMessage && (
          <p className="text-xs font-sans text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{paymentMessage}</p>
        )}

        <div className="bg-allura-card border border-allura-border rounded-xl p-6 text-left space-y-4 shadow-subtle">
          <div className="flex justify-between items-center pb-3 border-b border-allura-border/60">
            <div>
              <p className="text-[11px] font-sans text-allura-muted uppercase tracking-wider">Order Reference</p>
              <p className="font-mono text-sm font-bold text-allura-darkBrown break-all">{reference}</p>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded uppercase ${
                paymentState === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {paymentState === 'paid' ? 'Paid' : paymentState === 'cod' ? 'Pay on delivery' : 'Awaiting payment'}
            </span>
          </div>

          <div className="text-xs font-sans text-allura-muted space-y-1">
            {selectedAddress && (
              <p><strong>Deliver To:</strong> {selectedAddress.fullName}, {formatAddress(selectedAddress)}</p>
            )}
            <p><strong>Items:</strong> {s.items.reduce((a, i) => a + i.quantity, 0) || cart.reduce((a, i) => a + i.quantity, 0)}</p>
            <p><strong>Payment:</strong> {PAYMENT_LABELS[paymentMethod]}</p>
            <p><strong>Total:</strong> <strong className="text-allura-darkBrown">{formatPrice(s.total)}</strong></p>
          </div>

          <div className="p-3 bg-allura-bgSecondary/60 rounded-lg text-xs font-sans text-allura-text flex items-center gap-2">
            <Clock size={16} className="text-allura-gold flex-shrink-0" />
            <span>
              {paymentState === 'paid'
                ? "Payment received. We'll confirm and dispatch your order shortly."
                : paymentState === 'cod'
                ? 'Please keep the amount ready. You can pay in cash or UPI when your order arrives.'
                : 'Your items are reserved for a limited time. Complete the payment to confirm your order.'}
            </span>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap gap-3 justify-center">
          {isPending && (
            <button
              type="button"
              onClick={() => startPayment(session, true)}
              disabled={isPaying}
              className="bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-60"
            >
              <Lock size={14} />
              <span>PAY NOW · {formatPrice(s.total)}</span>
            </button>
          )}
          <Link
            to="/account/orders"
            className="border border-allura-border hover:bg-allura-bgSecondary text-allura-text text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-6 rounded-xl transition-all"
          >
            MY ORDERS
          </Link>
          <Link
            to="/shop"
            className="border border-allura-border hover:bg-allura-bgSecondary text-allura-text text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-6 rounded-xl transition-all"
          >
            CONTINUE SHOPPING
          </Link>
          <a
            href={`https://wa.me/919037991774?text=${encodeURIComponent(`Hello Allura, I have placed order ${reference}. Please help me with my order.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-white text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>WHATSAPP CONCIERGE</span>
          </a>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-medium text-allura-text">No items in checkout</h2>
        <p className="text-xs text-allura-muted">Your bag is currently empty.</p>
        <Link
          to="/shop"
          className="inline-block bg-allura-goldDark text-allura-card text-xs font-bold uppercase py-3 px-6 rounded"
        >
          Explore Shop
        </Link>
      </div>
    );
  }

  const busy = isPlacing || isSavingAddress || isPaying;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Checkout Minimal Header */}
      <div className="flex items-center justify-between border-b border-allura-border/60 pb-4">
        <Link
          to="/cart"
          className="text-xs font-sans text-allura-muted hover:text-allura-text flex items-center gap-1.5 uppercase tracking-wider"
        >
          <ArrowLeft size={14} />
          <span>Return to Bag</span>
        </Link>

        <AlluraLogo size="sm" showTagline={false} />

        <div className="flex items-center gap-1 text-xs text-allura-muted font-sans">
          <Lock size={13} className="text-emerald-700" />
          <span className="hidden sm:inline">256-Bit SSL Encrypted</span>
        </div>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-8">
          {/* Section 1: Delivery Address */}
          <div className="bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold uppercase text-allura-text tracking-wide">
                1. Delivery Address
              </h3>
              {customer?.email && <span className="text-[11px] text-allura-muted">{customer.email}</span>}
            </div>

            {addresses.length > 0 && (
              <div className="space-y-2.5">
                {addresses.map(addr => {
                  const active = !isAddingAddress && selectedAddressId === addr.id;
                  return (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        active ? 'border-allura-gold bg-allura-bgSecondary/40 ring-1 ring-allura-gold' : 'border-allura-border bg-allura-bg'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={active}
                        onChange={() => {
                          setSelectedAddressId(addr.id);
                          setIsAddingAddress(false);
                        }}
                        className="accent-allura-goldDark mt-0.5"
                      />
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-allura-text">
                          {addr.fullName}
                          <span className="ml-2 text-[10px] font-semibold uppercase text-allura-goldDark">{addr.label}</span>
                          {addr.isDefaultShipping && <span className="ml-2 text-[10px] text-allura-muted">Default</span>}
                        </p>
                        <p className="text-allura-muted">{formatAddress(addr)}</p>
                        <p className="text-allura-muted">{addr.phone?.countryCode} {addr.phone?.number}</p>
                      </div>
                    </label>
                  );
                })}

                {!isAddingAddress && (
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(true)}
                    className="w-full p-3 rounded-xl border border-dashed border-allura-border text-xs font-semibold text-allura-goldDark hover:border-allura-gold flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Deliver to a new address
                  </button>
                )}
              </div>
            )}

            {isAddingAddress && (
              <div className="space-y-4 pt-1">
                {addresses.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-allura-darkBrown uppercase flex items-center gap-1.5">
                      <MapPin size={13} /> New Address
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(false)}
                      className="text-[11px] text-allura-muted underline"
                    >
                      Use a saved address
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  {['Home', 'Work', 'Other'].map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setNewAddress({ ...newAddress, label: l })}
                      className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold ${
                        newAddress.label === l ? 'border-allura-goldDark bg-allura-gold/15 text-allura-goldDark' : 'border-allura-border text-allura-muted'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-allura-darkBrown uppercase">Full Name *</label>
                    <input type="text" required value={newAddress.fullName} onChange={e => setNewAddress({ ...newAddress, fullName: e.target.value })} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-allura-darkBrown uppercase">Mobile Number *</label>
                    <input type="tel" required placeholder="98471 23456" value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} className={inputClass} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-allura-darkBrown uppercase">House / Street *</label>
                  <input type="text" required value={newAddress.addressLine1} onChange={e => setNewAddress({ ...newAddress, addressLine1: e.target.value })} className={inputClass} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-allura-darkBrown uppercase">Area / Locality</label>
                    <input type="text" value={newAddress.addressLine2} onChange={e => setNewAddress({ ...newAddress, addressLine2: e.target.value })} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-allura-darkBrown uppercase">Landmark</label>
                    <input type="text" value={newAddress.landmark} onChange={e => setNewAddress({ ...newAddress, landmark: e.target.value })} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-allura-darkBrown uppercase">City *</label>
                    <input type="text" required value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-allura-darkBrown uppercase">State *</label>
                    <input type="text" required value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-allura-darkBrown uppercase">PIN Code *</label>
                    <input type="text" required inputMode="numeric" value={newAddress.postalCode} onChange={e => setNewAddress({ ...newAddress, postalCode: e.target.value })} className={inputClass} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-allura-muted">The address is saved to your account for faster checkout.</p>
                  <button
                    type="button"
                    onClick={saveNewAddress}
                    disabled={isSavingAddress}
                    className="px-4 py-2 border border-allura-goldDark text-allura-goldDark rounded text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSavingAddress && <Loader2 size={12} className="animate-spin" />}
                    Save & Use
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Delivery Method */}
          <div className="bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-xs space-y-4">
            <h3 className="font-serif text-lg font-semibold uppercase text-allura-text tracking-wide">
              2. Delivery Method
            </h3>

            <div className="space-y-2.5">
              {([
                ['STANDARD', 'Standard Courier (Kerala & All India)', 'Dispatches in 24 hours, delivered in 2-4 days'],
                ['STORE_PICKUP', 'In-Store Pickup (Perinthalmanna Salon)', 'Ready for pickup at Ooty Road boutique'],
              ] as const).map(([value, title, subtitle]) => (
                <label
                  key={value}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    deliveryMethod === value
                      ? 'border-allura-gold bg-allura-bgSecondary/40 ring-1 ring-allura-gold'
                      : 'border-allura-border bg-allura-bg'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === value}
                      onChange={() => setDeliveryMethod(value)}
                      className="accent-allura-goldDark"
                    />
                    <div>
                      <p className="text-xs font-bold text-allura-text">{title}</p>
                      <p className="text-[11px] text-allura-muted">{subtitle}</p>
                    </div>
                  </div>
                  {deliveryMethod === value && summary && (
                    <span className="text-xs font-bold text-allura-darkBrown">
                      {summary.shippingAmount === 0 ? 'FREE' : formatPrice(summary.shippingAmount)}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Payment Method */}
          <div className="bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-xs space-y-4">
            <h3 className="font-serif text-lg font-semibold uppercase text-allura-text tracking-wide">
              3. Payment Preference
            </h3>

            <div className="space-y-2.5">
              {([
                ['upi', QrCode, 'UPI / QR Code / Instant Transfer', 'Google Pay, PhonePe, Paytm, BHIM'],
                ['card', CreditCard, 'Credit / Debit Card', 'Visa, MasterCard, RuPay, Amex'],
                ['cod', Banknote, 'Cash on Delivery', 'Pay at doorstep upon inspection'],
              ] as const).map(([value, Icon, title, subtitle]) => (
                <label
                  key={value}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === value
                      ? 'border-allura-gold bg-allura-bgSecondary/40 ring-1 ring-allura-gold'
                      : 'border-allura-border bg-allura-bg'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value)}
                      className="accent-allura-goldDark"
                    />
                    <div className="flex items-center gap-2">
                      <Icon size={18} className="text-allura-goldDark" />
                      <div>
                        <p className="text-xs font-bold text-allura-text">{title}</p>
                        <p className="text-[11px] text-allura-muted">{subtitle}</p>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5 bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-luxury space-y-6 sticky top-24">
          <h3 className="font-serif text-lg font-semibold uppercase tracking-wide text-allura-text border-b border-allura-border pb-3">
            ORDER ITEMS ({cart.reduce((a: number, b: CartItem) => a + b.quantity, 0)})
          </h3>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {cart.map((item: CartItem) => {
              const line = summary?.items.find(l => l.cartItemId && l.cartItemId === item.id);
              const lineTotal = line ? line.finalLineTotal : (item.unitPrice ?? item.product.price) * item.quantity;
              const meta = [
                `Qty: ${item.quantity}`,
                item.selectedSize && `Size: ${item.selectedSize}`,
                item.selectedColor?.name,
              ].filter(Boolean).join(' • ');
              return (
                <div key={item.id || `${item.product.id}-${item.selectedSize}-${item.selectedColor.name}`} className="flex items-center gap-3">
                  <img
                    src={item.product.images.primary}
                    alt={item.product.name}
                    className="w-14 h-16 object-cover object-top rounded bg-allura-bgSecondary flex-shrink-0"
                  />
                  <div className="flex-1 text-xs">
                    <h4 className="font-serif font-medium text-allura-text line-clamp-1">{item.product.name}</h4>
                    <p className="text-allura-muted">{meta}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-serif text-xs font-semibold text-allura-darkBrown">{formatPrice(lineTotal)}</span>
                    {line && line.productDiscount > 0 && (
                      <p className="text-[10px] text-allura-muted line-through">{formatPrice(line.lineSubtotal)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 pt-4 border-t border-allura-border text-xs font-sans text-allura-muted">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-allura-text">{formatPrice(display.subtotal)}</span>
            </div>
            {display.productDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Product Discounts</span>
                <span>-{formatPrice(display.productDiscount)}</span>
              </div>
            )}
            {display.promotionDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Promotion</span>
                <span>-{formatPrice(display.promotionDiscount)}</span>
              </div>
            )}
            {display.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Coupon{appliedCoupon ? ` (${appliedCoupon.code})` : ''}</span>
                <span>-{formatPrice(display.couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-semibold text-allura-text">
                {display.shipping === 0 ? <strong className="text-emerald-700 uppercase">FREE</strong> : formatPrice(display.shipping)}
              </span>
            </div>
            {!isEstimate && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="font-semibold text-allura-text">{formatPrice(display.tax)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-base font-serif font-semibold text-allura-text pt-2 border-t border-allura-border">
              <span className="flex items-center gap-2">
                {isEstimate ? 'Estimated Total' : 'Total Payable'}
                {isPreviewing && <Loader2 size={13} className="animate-spin text-allura-muted" />}
              </span>
              <span className="text-xl text-allura-goldDark">{formatPrice(display.total)}</span>
            </div>
            {isEstimate && !previewError && (
              <p className="text-[11px] text-allura-muted">
                {isAddingAddress ? 'Save your address to see final shipping & tax.' : 'Calculating final shipping & tax…'}
              </p>
            )}
          </div>

          {(previewError || placeError || pricingError) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-sm text-xs font-sans text-rose-800 space-y-1">
              <p className="font-bold uppercase tracking-wider text-[10px]">Please review</p>
              <p>{placeError || previewError || pricingError}</p>
              <Link to="/cart" className="inline-block pt-1 font-semibold underline">Edit bag</Link>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || isPreviewing || (!!previewError && !isAddingAddress) || !!pricingError}
            className="w-full bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-bold tracking-[0.25em] uppercase py-4 px-6 rounded-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-luxury disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            <span>
              {isSavingAddress
                ? 'SAVING ADDRESS…'
                : isPlacing
                ? 'PLACING ORDER…'
                : paymentMethod === 'cod'
                ? `PLACE ORDER · ${formatPrice(display.total)}`
                : `PLACE ORDER & PAY · ${formatPrice(display.total)}`}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
