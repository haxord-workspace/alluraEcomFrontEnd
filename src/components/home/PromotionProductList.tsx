import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronUp } from 'lucide-react';
import { ProductCard } from '../ui/ProductCard';
import type { StorePromotion } from '../../types/storePromotion';

interface PromotionProductListProps {
  promotion: StorePromotion;
  onExpand?: () => void;
}

export const PromotionProductList: React.FC<PromotionProductListProps> = ({ promotion, onExpand }) => {
  const { products = [], totalProducts } = promotion;

  // Track expanded state locally per promotion; reset to false when promotion.id changes
  const [isExpanded, setIsExpanded] = useState(false);

  // Responsive breakpoint tracking (Mobile < 640px = limit 2, Desktop/Tablet >= 640px = limit 4)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [promotion.id]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (products.length === 0) {
    return null;
  }

  const defaultLimit = isMobile ? 2 : 4;
  const availableCount = products.length;
  const displayCount = totalProducts && totalProducts > availableCount ? totalProducts : availableCount;

  // Can expand if available products exceed default limit
  const canExpand = availableCount > defaultLimit;

  // Visible products slice
  const visibleProducts = isExpanded || !canExpand
    ? products
    : products.slice(0, defaultLimit);

  return (
    <div className="w-full mt-5 sm:mt-6">
      {/* 
        Applicable Products Header:
        - Left: Section title + count (using totalProducts or available count)
        - Right: View All Products (expand) / Show Less (collapse) button
      */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-xs sm:text-sm font-sans font-bold uppercase tracking-[0.15em] text-[#561C08]/90">
          Applicable Products ({displayCount})
        </h4>

        {canExpand && (
          <button
            type="button"
            onClick={() => {
              setIsExpanded((prev) => {
                const next = !prev;
                if (next && onExpand) {
                  onExpand();
                }
                return next;
              });
            }}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-bold text-[#561C08] hover:text-[#8B1A1A] transition-colors uppercase tracking-wider group focus:outline-none"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Show less products' : `View all ${displayCount} products`}
          >
            {isExpanded ? (
              <>
                <span>Show Less</span>
                <ChevronUp size={13} className="transition-transform group-hover:-translate-y-0.5 text-[#561C08]" />
              </>
            ) : (
              <>
                <span>View All Products</span>
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5 text-[#561C08]" />
              </>
            )}
          </button>
        )}
      </div>

      {/* 
        Product Cards Responsive Grid:
        - Mobile: 2-column grid (grid-cols-2)
        - Tablet: 2 to 3 columns (sm:grid-cols-2 md:grid-cols-3)
        - Desktop: Fixed 4 columns (lg:grid-cols-4)
      */}
      <div
        className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5 lg:gap-6 w-full"
        role="region"
        aria-label={`Applicable products for ${promotion.name}`}
      >
        {visibleProducts.map((product) => (
          <div
            key={product.id || product.slug}
            className="w-full min-w-0 flex flex-col"
          >
            <ProductCard product={product} className="h-full shadow-sm" showCategory showColorSwatches={false} />
          </div>
        ))}
      </div>
    </div>
  );
};
