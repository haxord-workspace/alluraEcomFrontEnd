import React from 'react';
import { useShop } from '../../context/ShopContext';
import { ProductCard } from '../ui/ProductCard';

interface RecentlyViewedProps {
  title?: string;
  className?: string;
  excludeId?: string;
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  title = 'Recently Viewed',
  className = '',
  excludeId,
}) => {
  const { recentlyViewed } = useShop();

  const items = excludeId ? recentlyViewed.filter(p => p.id !== excludeId) : recentlyViewed;

  if (items.length === 0) return null;

  return (
    <section className={`py-12 border-t border-allura-border/60 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-sans font-bold tracking-[0.25em] text-allura-goldDark uppercase">
              YOUR BROWSING HISTORY
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">
              {title}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {items.slice(0, 4).map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
