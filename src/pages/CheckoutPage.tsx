import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  CreditCard,
  QrCode,
  Banknote,
  Sparkles,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { AlluraLogo } from '../components/common/AlluraLogo';
import type { CartItem } from '../types';

export const CheckoutPage: React.FC = () => {
  const { cart, cartSubtotal, freeShippingRemaining, clearCart, formatPrice } = useShop();
  const navigate = useNavigate();

  const [email, setEmail] = useState('ananya.kerala@example.com');
  const [phone, setPhone] = useState('+91 98471 23456');
  const [firstName, setFirstName] = useState('Ananya');
  const [lastName, setLastName] = useState('Menon');
  const [address, setAddress] = useState('Near Jubilee Hospital, Ooty Road');
  const [city, setCity] = useState('Perinthalmanna');
  const [district, setDistrict] = useState('Malappuram');
  const [pincode, setPincode] = useState('679322');
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'pickup'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cod'>('upi');

  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const finalShipping = deliveryMethod === 'pickup' ? 0 : (freeShippingRemaining === 0 ? 0 : 150);
  const finalTotal = cartSubtotal + finalShipping;

  const keralaDistricts = [
    'Malappuram',
    'Kozhikode',
    'Palakkad',
    'Thrissur',
    'Ernakulam',
    'Wayanad',
    'Kannur',
    'Kasaragod',
    'Kottayam',
    'Alappuzha',
    'Idukki',
    'Pathanamthitta',
    'Kollam',
    'Thiruvananthapuram',
  ];

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = `ALR-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderNumber(orderId);
    setIsOrderPlaced(true);
    clearCart();
  };

  if (isOrderPlaced) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 mx-auto animate-pulse-subtle">
          <CheckCircle2 size={40} />
        </div>

        <span className="text-[11px] font-sans font-bold tracking-[0.3em] uppercase text-allura-goldDark">
          ORDER CONFIRMED
        </span>

        <h1 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal uppercase tracking-tight">
          THANK YOU FOR YOUR ORDER
        </h1>

        <div className="bg-allura-card border border-allura-border rounded-xl p-6 text-left space-y-4 shadow-subtle">
          <div className="flex justify-between items-center pb-3 border-b border-allura-border/60">
            <div>
              <p className="text-[11px] font-sans text-allura-muted uppercase tracking-wider">Order Reference</p>
              <p className="font-serif text-lg font-bold text-allura-darkBrown">{orderNumber}</p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded">
              Payment Successful
            </span>
          </div>

          <div className="text-xs font-sans text-allura-muted space-y-1">
            <p><strong>Deliver To:</strong> {firstName} {lastName}, {address}, {city}, {district} - {pincode}</p>
            <p><strong>Contact:</strong> {phone} • {email}</p>
            <p><strong>Total Paid:</strong> <strong className="text-allura-darkBrown">{formatPrice(finalTotal)}</strong></p>
          </div>

          <div className="p-3 bg-allura-bgSecondary/60 rounded-lg text-xs font-sans text-allura-text flex items-center gap-2">
            <Sparkles size={16} className="text-allura-gold flex-shrink-0" />
            <span>Order details & invoice have been sent to your WhatsApp and email.</span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/shop')}
            className="bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-8 rounded-sm transition-all"
          >
            CONTINUE BROWSING
          </button>
          <a
            href={`https://wa.me/919037991774?text=Hello%20Allura%2C%20I%20have%20placed%20order%20${orderNumber}.%20Please%20confirm%20tracking%20details.`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-white text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-6 rounded-sm transition-all flex items-center justify-center gap-2"
          >
            <span>TRACK ON WHATSAPP</span>
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

      {/* Main Grid: Form (7 cols) + Order Summary (5 cols) */}
      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-8">
          {/* Section 1: Contact Information */}
          <div className="bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-xs space-y-4">
            <h3 className="font-serif text-lg font-semibold uppercase text-allura-text tracking-wide flex items-center gap-2">
              <span>1. Contact Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-allura-darkBrown uppercase">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs text-allura-text focus:outline-none focus:border-allura-gold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-allura-darkBrown uppercase">WhatsApp / Phone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs text-allura-text focus:outline-none focus:border-allura-gold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Delivery Address */}
          <div className="bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-xs space-y-4">
            <h3 className="font-serif text-lg font-semibold uppercase text-allura-text tracking-wide">
              2. Shipping Address
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-allura-darkBrown uppercase">First Name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs text-allura-text focus:outline-none focus:border-allura-gold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-allura-darkBrown uppercase">Last Name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs text-allura-text focus:outline-none focus:border-allura-gold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-allura-darkBrown uppercase">Street Address / House *</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
                className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs text-allura-text focus:outline-none focus:border-allura-gold"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-allura-darkBrown uppercase">City / Town</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  required
                  className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs text-allura-text focus:outline-none focus:border-allura-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-allura-darkBrown uppercase">District</label>
                <select
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs text-allura-text focus:outline-none focus:border-allura-gold"
                >
                  {keralaDistricts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-allura-darkBrown uppercase">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  required
                  className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs text-allura-text focus:outline-none focus:border-allura-gold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Delivery Options */}
          <div className="bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-xs space-y-4">
            <h3 className="font-serif text-lg font-semibold uppercase text-allura-text tracking-wide">
              3. Delivery Method
            </h3>

            <div className="space-y-2.5">
              <label
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  deliveryMethod === 'standard'
                    ? 'border-allura-gold bg-allura-bgSecondary/40 ring-1 ring-allura-gold'
                    : 'border-allura-border bg-allura-bg'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === 'standard'}
                    onChange={() => setDeliveryMethod('standard')}
                    className="accent-allura-goldDark"
                  />
                  <div>
                    <p className="text-xs font-bold text-allura-text">Standard Courier (Kerala & All India)</p>
                    <p className="text-[11px] text-allura-muted">Dispatches in 24 hours, delivered in 2-4 days</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-allura-darkBrown">
                  {freeShippingRemaining === 0 ? 'FREE' : '₹ 150'}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  deliveryMethod === 'pickup'
                    ? 'border-allura-gold bg-allura-bgSecondary/40 ring-1 ring-allura-gold'
                    : 'border-allura-border bg-allura-bg'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === 'pickup'}
                    onChange={() => setDeliveryMethod('pickup')}
                    className="accent-allura-goldDark"
                  />
                  <div>
                    <p className="text-xs font-bold text-allura-text">In-Store Pickup (Perinthalmanna Salon)</p>
                    <p className="text-[11px] text-allura-muted">Ready for pickup today at Ooty Road boutique</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700">FREE</span>
              </label>
            </div>
          </div>

          {/* Section 4: Payment Method */}
          <div className="bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-xs space-y-4">
            <h3 className="font-serif text-lg font-semibold uppercase text-allura-text tracking-wide">
              4. Payment Method
            </h3>

            <div className="space-y-2.5">
              <label
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-allura-gold bg-allura-bgSecondary/40 ring-1 ring-allura-gold'
                    : 'border-allura-border bg-allura-bg'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'upi'}
                    onChange={() => setPaymentMethod('upi')}
                    className="accent-allura-goldDark"
                  />
                  <div className="flex items-center gap-2">
                    <QrCode size={18} className="text-allura-goldDark" />
                    <div>
                      <p className="text-xs font-bold text-allura-text">UPI / QR Code / Instant Transfer</p>
                      <p className="text-[11px] text-allura-muted">Google Pay, PhonePe, Paytm, BHIM</p>
                    </div>
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'card'
                    ? 'border-allura-gold bg-allura-bgSecondary/40 ring-1 ring-allura-gold'
                    : 'border-allura-border bg-allura-bg'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="accent-allura-goldDark"
                  />
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-allura-goldDark" />
                    <div>
                      <p className="text-xs font-bold text-allura-text">Credit / Debit Card</p>
                      <p className="text-[11px] text-allura-muted">Visa, MasterCard, RuPay, Amex</p>
                    </div>
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-allura-gold bg-allura-bgSecondary/40 ring-1 ring-allura-gold'
                    : 'border-allura-border bg-allura-bg'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-allura-goldDark"
                  />
                  <div className="flex items-center gap-2">
                    <Banknote size={18} className="text-allura-goldDark" />
                    <div>
                      <p className="text-xs font-bold text-allura-text">Cash on Delivery</p>
                      <p className="text-[11px] text-allura-muted">Pay at doorstep upon inspection</p>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Order Summary Sidebar (5 cols) */}
        <div className="lg:col-span-5 bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-luxury space-y-6 sticky top-24">
          <h3 className="font-serif text-lg font-semibold uppercase tracking-wide text-allura-text border-b border-allura-border pb-3">
            ORDER ITEMS ({cart.reduce((a: number, b: CartItem) => a + b.quantity, 0)})
          </h3>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {cart.map((item: CartItem) => (
              <div
                key={`${item.product.id}-${item.selectedSize}-${item.selectedColor.name}`}
                className="flex items-center gap-3"
              >
                <img
                  src={item.product.images.primary}
                  alt={item.product.name}
                  className="w-14 h-16 object-cover object-top rounded bg-allura-bgSecondary flex-shrink-0"
                />
                <div className="flex-1 text-xs">
                  <h4 className="font-serif font-medium text-allura-text line-clamp-1">{item.product.name}</h4>
                  <p className="text-allura-muted">Qty: {item.quantity} • Size: {item.selectedSize} • {item.selectedColor.name}</p>
                </div>
                <span className="font-serif text-xs font-semibold text-allura-darkBrown">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t border-allura-border text-xs font-sans text-allura-muted">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-allura-text">{formatPrice(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-semibold text-allura-text">
                {finalShipping === 0 ? <strong className="text-emerald-700 uppercase">FREE</strong> : '₹ 150'}
              </span>
            </div>
            <div className="flex justify-between text-base font-serif font-semibold text-allura-text pt-2 border-t border-allura-border">
              <span>Total Payable</span>
              <span className="text-xl text-allura-goldDark">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-bold tracking-[0.25em] uppercase py-4 px-6 rounded-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-luxury"
          >
            <Lock size={14} />
            <span>CONFIRM & PLACE ORDER</span>
          </button>
        </div>
      </form>
    </div>
  );
};
