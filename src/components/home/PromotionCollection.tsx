import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { StorePromotionCollection } from '../../types/storePromotion';

interface PromotionCollectionProps {
  collections: StorePromotionCollection[];
}

export const PromotionCollection: React.FC<PromotionCollectionProps> = ({ collections }) => {
  if (!collections || collections.length === 0) return null;

  if (collections.length === 1) {
    const col = collections[0];
    const imageUrl =
      typeof col.image === 'string'
        ? col.image
        : col.image && typeof col.image === 'object'
          ? col.image.url || col.image.thumbnailUrl
          : undefined;

    return (
      <div className="w-full mt-4 sm:mt-5 p-4 sm:p-5 rounded-2xl bg-[#561C08]/5 border border-[#561C08]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={col.name}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#561C08]/20 flex-shrink-0"
              loading="lazy"
            />
          )}
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-[0.18em] text-[#8C3A27] block mb-0.5">
              Featured Collection
            </span>
            <h4 className="font-heading font-bold text-base sm:text-lg text-stone-900 leading-tight truncate">
              {col.name}
            </h4>
            {col.description && (
              <p className="text-xs text-stone-600 font-sans line-clamp-1 mt-0.5">
                {col.description}
              </p>
            )}
          </div>
        </div>

        <Link
          to={`/collections/${col.slug || col.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-sans font-bold text-[#561C08] hover:text-[#8B1A1A] py-1.5 px-3.5 rounded-full border border-[#561C08]/25 bg-white hover:bg-stone-50 transition-colors uppercase tracking-wider flex-shrink-0"
        >
          <span>View Collection</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full mt-4 sm:mt-5 p-3.5 sm:p-4 rounded-2xl bg-[#561C08]/5 border border-[#561C08]/15">
      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-[0.18em] text-[#8C3A27] mb-2.5">
        <Sparkles size={12} className="text-[#8C3A27]" />
        <span>Applicable Collections</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {collections.map((col) => (
          <Link
            key={col.id || col.slug}
            to={`/collections/${col.slug || col.id}`}
            className="inline-flex items-center gap-2 py-1.5 px-3 rounded-full bg-white hover:bg-[#561C08] text-stone-800 hover:text-white border border-[#561C08]/20 transition-all duration-200 text-xs font-sans font-semibold group shadow-xs"
          >
            <span>{col.name}</span>
            <ArrowRight size={11} className="text-[#8C3A27] group-hover:text-white transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};
