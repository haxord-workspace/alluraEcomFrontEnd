import React from 'react';
import { Tag } from 'lucide-react';
import { formatPromotionDiscount } from '../../utils/promotionFormat';
import type { StorePromotionDiscount } from '../../types/storePromotion';

interface PromotionDiscountBadgeProps {
  discount: StorePromotionDiscount;
  currency?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PromotionDiscountBadge: React.FC<PromotionDiscountBadgeProps> = ({
  discount,
  currency = 'INR',
  className = '',
  size = 'md',
}) => {
  const text = formatPromotionDiscount(discount, currency);
  if (!text) return null;

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-0.5',
    md: 'text-xs sm:text-[13px] px-3 py-1',
    lg: 'text-sm sm:text-base px-3.5 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-heading font-bold uppercase tracking-wider rounded-full shadow-xs bg-[#561C08] text-[#F7E6C8] border border-[#F7E6C8]/30 ${sizeClasses} ${className}`}
    >
      <Tag size={size === 'sm' ? 11 : 13} className="text-[#C9A050] flex-shrink-0" />
      <span className="whitespace-nowrap">{text}</span>
    </span>
  );
};
