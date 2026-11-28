import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { StorePromotionCategory } from '../../types/storePromotion';

interface PromotionCategoryProps {
  categories: StorePromotionCategory[];
}

export const PromotionCategory: React.FC<PromotionCategoryProps> = ({ categories }) => {
  if (!categories || categories.length === 0) return null;

  // Single category banner with image (if available) or rich layout
  if (categories.length === 1) {
    const cat = categories[0];
    const imageUrl =
      typeof cat.image === 'string'
        ? cat.image
        : cat.image && typeof cat.image === 'object'
          ? cat.image.url || cat.image.thumbnailUrl
          : undefined;

    return (
      <div className="w-full mt-4 sm:mt-5 p-4 sm:p-5 rounded-2xl bg-[#561C08]/5 border border-[#561C08]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={cat.name}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#561C08]/20 flex-shrink-0"
              loading="lazy"
            />
          )}
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-[0.18em] text-[#8C3A27] block mb-0.5">
              Applicable Category
            </span>
            <h4 className="font-heading font-bold text-base sm:text-lg text-stone-900 leading-tight truncate">
              {cat.name}
            </h4>
            {cat.description && (
              <p className="text-xs text-stone-600 font-sans line-clamp-1 mt-0.5">
                {cat.description}
              </p>
            )}
          </div>
        </div>

        <Link
          to={`/category/${cat.slug || cat.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-sans font-bold text-[#561C08] hover:text-[#8B1A1A] py-1.5 px-3.5 rounded-full border border-[#561C08]/25 bg-white hover:bg-stone-50 transition-colors uppercase tracking-wider flex-shrink-0"
        >
          <span>Explore Category</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  // Multiple category chips
  return (
    <div className="w-full mt-4 sm:mt-5 p-3.5 sm:p-4 rounded-2xl bg-[#561C08]/5 border border-[#561C08]/15">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-[0.18em] text-[#8C3A27]">
          Applicable Categories ({categories.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Link
            key={cat.id || cat.slug}
            to={`/category/${cat.slug || cat.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-bold text-[#561C08] bg-white border border-[#561C08]/20 hover:border-[#561C08]/40 hover:bg-[#561C08]/5 transition-colors shadow-2xs"
          >
            <span>{cat.name}</span>
            <ArrowRight size={11} className="text-[#8C3A27]" />
          </Link>
        ))}
      </div>
    </div>
  );
};
