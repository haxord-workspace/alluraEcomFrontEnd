import { useCallback, useState } from 'react';
import { useShop } from '../context/ShopContext';

/**
 * Thin wrapper around the coupon state in ShopContext (the single source of truth,
 * shared by the Cart and Checkout pages) plus the local input-field state for
 * whichever page is rendering <CouponInput />.
 */
export const useCoupon = () => {
  const { appliedCoupon, couponDiscount, applyCoupon, removeCoupon, isApplyingCoupon } = useShop();
  const [code, setCodeRaw] = useState('');

  const setCode = useCallback((value: string) => setCodeRaw(value.toUpperCase()), []);

  const apply = useCallback(async () => {
    const result = await applyCoupon(code);
    if (result.success) setCodeRaw('');
    return result;
  }, [code, applyCoupon]);

  return {
    code,
    setCode,
    appliedCoupon,
    couponDiscount,
    isApplyingCoupon,
    apply,
    removeCoupon,
  };
};
