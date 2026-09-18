import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Upload, 
  ShieldCheck, 
  ArrowRight
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import type { ReturnReason } from '../../types';

export const OrderReturnPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { getOrderById, submitReturnRequest, customer } = useShop();

  const order = orderId ? getOrderById(orderId) : undefined;

  const [step, setStep] = useState<number>(1);
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  const [reason, setReason] = useState<ReturnReason>('Size issue');
  const [reasonDetail, setReasonDetail] = useState('');
  const [preference, setPreference] = useState<'Exchange for different size' | 'Store Credit' | 'Refund to source'>('Exchange for different size');
  const [exchangeSize, setExchangeSize] = useState('S');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [returnRef, setReturnRef] = useState('');

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

  const selectedItem = order.items[selectedItemIdx] || order.items[0];

  const reasonsList: ReturnReason[] = [
    'Size issue',
    'Color difference',
    'Damaged product',
    'Wrong product',
    'Fit & drape preference',
    'Other',
  ];

  const handlePhotoUploadMock = () => {
    setUploadedPhotos(prev => [...prev, '/images/best-sellers/blush-modest-elegance.jpeg']);
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const req = submitReturnRequest({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: customer?.name || order.customer.name,
      customerEmail: customer?.email || order.customer.email,
      customerPhone: customer?.phone || order.customer.phone,
      items: [
        {
          productName: selectedItem.product.name,
          size: selectedItem.selectedSize,
          color: selectedItem.selectedColor.name,
          sku: selectedItem.sku,
          price: selectedItem.unitPrice,
          image: selectedItem.product.images.primary,
          quantity: selectedItem.quantity,
        },
      ],
      reason,
      reasonDetail,
      preference,
      exchangeSize: preference === 'Exchange for different size' ? exchangeSize : undefined,
      pickupAddress: order.shippingAddress,
      images: uploadedPhotos,
    });

    setReturnRef(req.id);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6 animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 size={36} />
        </div>

        <span className="text-[10px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
          REQUEST REGISTERED
        </span>

        <h1 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal">
          Return / Exchange Initiated
        </h1>

        <div className="bg-allura-card border border-allura-border rounded-2xl p-6 text-left space-y-3 shadow-subtle text-xs font-sans">
          <div className="flex justify-between items-center pb-3 border-b border-allura-border/60">
            <div>
              <p className="text-allura-muted uppercase tracking-wider text-[10px]">Reference Number</p>
              <p className="font-serif text-base font-bold text-allura-darkBrown uppercase">{returnRef}</p>
            </div>
            <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded text-[11px]">
              Under Review
            </span>
          </div>

          <p><strong>Item:</strong> {selectedItem.product.name} ({selectedItem.selectedSize})</p>
          <p><strong>Preference:</strong> {preference} {preference === 'Exchange for different size' && `(New Size: ${exchangeSize})`}</p>
          <p><strong>Pickup Address:</strong> {order.shippingAddress.addressLine1}, {order.shippingAddress.city}</p>
          <p className="text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 mt-2">
            Our atelier quality team will review your request within 24 hours. Delhivery doorstep pickup will be scheduled automatically.
          </p>
        </div>

        <div className="flex gap-3 justify-center pt-2">
          <Link
            to="/account/orders"
            className="px-6 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors"
          >
            View All Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Header */}
      <div>
        <Link
          to={`/account/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-sans text-allura-muted hover:text-allura-text transition-colors mb-2"
        >
          <ArrowLeft size={14} />
          <span>Back to Order #{order.orderNumber}</span>
        </Link>
        <h1 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal">
          Return or Exchange Request
        </h1>
        <p className="text-xs font-sans text-allura-muted mt-1">
          Complimentary doorstep return and size exchange within 7 days of delivery.
        </p>
      </div>

      {/* Progress Tabs */}
      <div className="flex justify-between items-center bg-allura-card border border-allura-border rounded-xl p-3 text-xs font-sans">
        {['1. Select Item', '2. Reason', '3. Preference', '4. Confirmation'].map((stepLabel, idx) => (
          <span
            key={idx}
            className={`font-semibold ${
              step === idx + 1 ? 'text-allura-goldDark' : step > idx + 1 ? 'text-emerald-700' : 'text-allura-muted'
            }`}
          >
            {stepLabel}
          </span>
        ))}
      </div>

      <div className="bg-allura-card border border-allura-border rounded-2xl p-6 sm:p-8 shadow-luxury space-y-6">
        
        {/* Step 1: Select Item */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-serif text-xl text-allura-text font-normal">Select Item to Return / Exchange</h3>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedItemIdx(idx)}
                  className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${
                    selectedItemIdx === idx
                      ? 'border-allura-gold bg-allura-gold/10 shadow-xs'
                      : 'border-allura-border/60 hover:border-allura-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="return_item"
                    checked={selectedItemIdx === idx}
                    onChange={() => setSelectedItemIdx(idx)}
                    className="accent-allura-gold"
                  />
                  <img
                    src={item.product.images.primary}
                    alt={item.product.name}
                    className="w-16 h-20 object-cover rounded-lg bg-allura-bgSecondary flex-shrink-0"
                  />
                  <div className="text-xs font-sans space-y-1">
                    <p className="font-serif text-base font-normal text-allura-text">{item.product.name}</p>
                    <p className="text-allura-muted">Size: {item.selectedSize} • Color: {item.selectedColor.name}</p>
                    <p className="font-bold text-allura-darkBrown">₹ {item.unitPrice.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Reason & Photos */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="font-serif text-xl text-allura-text font-normal">Select Reason for Return / Exchange</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reasonsList.map(r => (
                <label
                  key={r}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer text-xs font-sans transition-all ${
                    reason === r ? 'border-allura-gold bg-allura-gold/10 font-bold text-allura-goldDark' : 'border-allura-border text-allura-text'
                  }`}
                >
                  <input
                    type="radio"
                    name="return_reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-allura-gold"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-1">
                Additional Comments (Optional)
              </label>
              <textarea
                value={reasonDetail}
                onChange={e => setReasonDetail(e.target.value)}
                placeholder="Describe any fit or drape issues so our atelier team can tailor the replacement perfectly..."
                rows={3}
                className="w-full p-3 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
              />
            </div>

            {/* Photo upload mockup */}
            <div className="space-y-2">
              <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted">
                Attach Photos (Optional)
              </label>
              <div
                onClick={handlePhotoUploadMock}
                className="border-2 border-dashed border-allura-border rounded-xl p-4 text-center cursor-pointer hover:bg-allura-bg transition-colors space-y-2"
              >
                <Upload size={20} className="mx-auto text-allura-goldDark" />
                <p className="text-xs font-sans text-allura-muted">
                  Click to attach garment images / tag verification photos
                </p>
                {uploadedPhotos.length > 0 && (
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    ✓ {uploadedPhotos.length} photo(s) attached
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-allura-border text-xs font-sans text-allura-muted hover:text-allura-text rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2"
              >
                <span>Next: Preferences</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preference & Sizing */}
        {step === 3 && (
          <div className="space-y-5">
            <h3 className="font-serif text-xl text-allura-text font-normal">Choose Resolution Preference</h3>

            <div className="space-y-3 text-xs font-sans">
              {[
                { label: 'Exchange for different size' as const, desc: 'Receive a fresh tailored replacement size with doorstep swap.' },
                { label: 'Store Credit' as const, desc: 'Instant Allura Boutique credit with lifetime validity.' },
                { label: 'Refund to source' as const, desc: 'Original UPI / Bank account refund within 3 business days of receipt.' },
              ].map(opt => (
                <label
                  key={opt.label}
                  className={`p-4 rounded-xl border block cursor-pointer transition-all ${
                    preference === opt.label ? 'border-allura-gold bg-allura-gold/10' : 'border-allura-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="preference"
                      checked={preference === opt.label}
                      onChange={() => setPreference(opt.label)}
                      className="accent-allura-gold"
                    />
                    <span className="font-bold text-allura-text">{opt.label}</span>
                  </div>
                  <p className="text-allura-muted pl-5 mt-1">{opt.desc}</p>
                </label>
              ))}
            </div>

            {preference === 'Exchange for different size' && (
              <div className="p-4 bg-allura-bg/60 rounded-xl border border-allura-border space-y-2">
                <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-allura-muted">
                  Desired Replacement Size
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {['XS', 'S', 'M', 'L', 'XL'].map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setExchangeSize(sz)}
                      className={`py-2 text-xs font-sans font-bold rounded-lg border ${
                        exchangeSize === sz
                          ? 'border-allura-gold bg-allura-gold text-white'
                          : 'border-allura-border text-allura-muted hover:border-allura-darkBrown'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 border border-allura-border text-xs font-sans text-allura-muted hover:text-allura-text rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2"
              >
                <span>Review & Submit</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <form onSubmit={handleSubmitReturn} className="space-y-5">
            <h3 className="font-serif text-xl text-allura-text font-normal">Review Return Request</h3>

            <div className="p-4 bg-allura-bg/60 rounded-xl border border-allura-border space-y-2 text-xs font-sans">
              <p><strong>Item:</strong> {selectedItem.product.name} (Current: {selectedItem.selectedSize})</p>
              <p><strong>Reason:</strong> {reason}</p>
              {reasonDetail && <p><strong>Notes:</strong> {reasonDetail}</p>}
              <p><strong>Preference:</strong> {preference} {preference === 'Exchange for different size' && `(Replacement Size: ${exchangeSize})`}</p>
              <p><strong>Pickup Address:</strong> {order.shippingAddress.addressLine1}, {order.shippingAddress.city} - {order.shippingAddress.pincode}</p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-sans text-amber-900 flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-700 flex-shrink-0" />
              <span>Please keep the original security tags and signature magnetic box ready for our courier partner.</span>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 border border-allura-border text-xs font-sans text-allura-muted hover:text-allura-text rounded-xl"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2 shadow-md"
              >
                <span>Submit Request</span>
                <CheckCircle2 size={16} />
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
