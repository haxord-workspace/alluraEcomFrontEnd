import React from 'react';
import { Tag } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useCoupon } from '../../hooks/useCoupon';

/**
 * "Have a coupon code?" input + applied-coupon chip, shared by the Cart and
 * Checkout order summaries. Coupon state lives in ShopContext, so applying or
 * removing a coupon here is immediately reflected on the other page too.
 */
export const CouponInput: React.FC = () => {
  const { formatPrice } = useShop();
  const { code, setCode, appliedCoupon, couponDiscount, isApplyingCoupon, apply, removeCoupon } = useCoupon();

  // No <form> here on purpose: this component is rendered inside the Checkout
  // page's own <form onSubmit={handlePlaceOrder}>. A nested <form>'s submit
  // event still bubbles through the DOM, so React's delegated listener for the
  // OUTER form would also fire handlePlaceOrder right after applying the
  // coupon — which looked like the whole page reloading. Using plain
  // onClick/onKeyDown instead means there is never a 'submit' event to bubble.
  const handleApplyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isApplyingCoupon && code.trim()) apply();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    if (!isApplyingCoupon && code.trim()) apply();
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeCoupon();
  };

  if (appliedCoupon) {
    return (
      <div className="pt-2 border-t border-allura-border/60">
        <div className="flex items-center justify-between gap-2 p-3 rounded bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-2 text-xs font-sans min-w-0">
            <Tag size={13} className="text-emerald-700 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-emerald-800 tracking-wider truncate">{appliedCoupon.code}</p>
              <p className="text-[11px] text-emerald-700">You save {formatPrice(couponDiscount)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveClick}
            className="text-[11px] font-sans font-semibold text-emerald-800 underline hover:text-emerald-900 flex-shrink-0"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2 border-t border-allura-border/60">
      <label className="text-[11px] font-bold text-allura-darkBrown uppercase tracking-wider flex items-center gap-1">
        <Tag size={12} />
        <span>HAVE A COUPON CODE?</span>
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter coupon code"
          className="flex-1 min-w-0 bg-allura-bg border border-allura-border rounded px-3 py-2 text-xs uppercase font-sans tracking-wider text-allura-text focus:outline-none focus:border-allura-gold"
        />
        <button
          type="button"
          onClick={handleApplyClick}
          disabled={isApplyingCoupon || !code.trim()}
          className="bg-allura-darkBrown hover:bg-allura-goldDark text-allura-card text-xs font-sans font-bold tracking-wider uppercase px-4 py-2 rounded transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
        >
          {isApplyingCoupon ? 'APPLYING...' : 'APPLY'}
        </button>
      </div>
    </div>
  );
};
