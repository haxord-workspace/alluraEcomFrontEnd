import React from 'react';
import { useShop } from '../../context/ShopContext';
import { ProductCard } from '../ui/ProductCard';
import type { Product } from '../../types';

interface RecommendationsProps {
  currentProduct?: Product;
  type?: 'you-may-like' | 'complete-look' | 'trending';
  className?: string;
}

export const Recommendations: React.FC<RecommendationsProps> = ({
  currentProduct,
  type = 'you-may-like',
  className = '',
}) => {
  const { products } = useShop();

  let title = 'You May Also Like';
  let subtitle = 'CURATED RECOMMENDATIONS';
  let recommended: Product[] = [];

  if (type === 'complete-look') {
    title = 'Complete The Look';
    subtitle = 'STYLIST CURATION';
    recommended = products
      .filter(p => p.id !== currentProduct?.id)
      .slice(1, 5);
  } else if (type === 'trending') {
    title = 'Trending in the Atelier';
    subtitle = 'MOST COVETED DESIGNS';
    recommended = products.filter(p => p.isBestSeller || p.isFeatured).slice(0, 4);
  } else {
    // You may also like based on category or occasion
    recommended = products
      .filter(p => p.id !== currentProduct?.id && (p.category === currentProduct?.category || p.occasion === currentProduct?.occasion))
      .slice(0, 4);

    if (recommended.length === 0) {
      recommended = products.filter(p => p.id !== currentProduct?.id).slice(0, 4);
    }
  }

  if (recommended.length === 0) return null;

  return (
    <section className={`py-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-sans font-bold tracking-[0.25em] text-allura-goldDark uppercase">
              {subtitle}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">
              {title}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {recommended.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
