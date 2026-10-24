import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingBag, Loader2, Check } from 'lucide-react';
import type { Product } from '../../types';
import { useShop } from '../../context/ShopContext';
import { useAddToBag } from '../../hooks/useAddToBag';
import { addToBagButtonState } from './AddToBagLabel';

interface ProductCardProps {
  product: Product;
  showCategory?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, showCategory = true }) => {
  const { toggleWishlist, isInWishlist, setQuickViewProduct, formatPrice } = useShop();
  const bag = useAddToBag();
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const inWishlist = isInWishlist(product.id);
  const activeColor = product.colors[selectedColorIdx] || product.colors[0];

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    bag.add(product, product.sizes[0], activeColor);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <div
      className="group relative flex flex-col select-none bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image: Full Width, Borderless, Restored 4:5 Aspect Ratio */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-100">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          {/* Primary Image */}
          <img
            src={product.images.primary}
            alt={product.name}
            className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-700 ${
              isHovered && product.images.secondary ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
            }`}
            loading="lazy"
          />

          {/* Secondary Hover Image */}
          {product.images.secondary && (
            <img
              src={product.images.secondary}
              alt={`${product.name} alternate view`}
              className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-700 ${
                isHovered ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
              }`}
              loading="lazy"
            />
          )}
        </Link>

        {/* Badges (New / Bestseller) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
          {product.isNewArrival && (
            <span className="bg-[#561C08] text-white text-[9px] font-sans font-bold tracking-[0.2em] uppercase px-2.5 py-0.5 rounded-full shadow-xs">
              NEW
            </span>
          )}
          {product.isBestSeller && !product.isNewArrival && (
            <span className="bg-stone-900 text-white text-[9px] font-sans font-bold tracking-[0.2em] uppercase px-2.5 py-0.5 rounded-full shadow-xs">
              BESTSELLER
            </span>
          )}
        </div>

        {/* Wishlist Button: Clean White Circular Disc */}
        <button
          type="button"
          onClick={handleWishlist}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            size={16}
            strokeWidth={1.8}
            className={`transition-all duration-200 ${
              inWishlist
                ? 'fill-[#561C08] text-[#561C08] scale-110'
                : 'text-stone-800 hover:text-[#561C08]'
            }`}
          />
        </button>

        {/* Quick View (Desktop Hover) */}
        <div className="hidden lg:flex absolute right-3 bottom-3 z-10 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <button
            type="button"
            onClick={handleQuickView}
            className="bg-white/95 hover:bg-white text-[#561C08] p-2 rounded-full shadow-md border border-[#561C08]/10 hover:scale-105 transition-all"
            title="Quick view details"
            aria-label="Quick view"
          >
            <Eye size={15} />
          </button>
        </div>
      </div>

      {/* Product Information Section: Clean White, Compact Hierarchy */}
      <div className="px-3.5 pt-2.5 pb-3 bg-white flex flex-col justify-between flex-1">
        <div>
          {/* Category / Collection Label */}
          {(showCategory || product.category) && product.category && (
            <span className="text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-[0.14em] text-[#8C3A27] block mb-0.5">
              {product.category}
            </span>
          )}

          {/* Product Name */}
          <Link
            to={`/product/${product.slug}`}
            className="font-serif text-sm sm:text-[15px] font-normal sm:font-medium text-stone-900 leading-snug line-clamp-1 hover:text-[#561C08] transition-colors block mb-1"
          >
            {product.name}
          </Link>
        </div>

        {/* Price & Cart Action Row */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-0.5">
          <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
            {/* Current Selling Price */}
            <span className="font-serif text-sm sm:text-base font-bold text-stone-900">
              {formatPrice(product.price)}
            </span>

            {/* Original Price (Strikethrough) */}
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="font-serif text-xs text-stone-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Shopping-Bag / Quick Add Button */}
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={bag.isAdding}
            className={`flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full text-white shadow-xs flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#561C08]/40 focus:ring-offset-1 ${addToBagButtonState(bag.state)} ${
              bag.justAdded ? 'bg-emerald-700' : 'bg-[#561C08] hover:bg-[#3D1406]'
            }`}
            title="Add to Bag"
            aria-label={bag.isAdding ? 'Adding to Bag' : bag.justAdded ? 'Added to Bag' : `Add ${product.name} to Bag`}
          >
            {bag.isAdding ? (
              <Loader2 size={15} className="animate-spin" />
            ) : bag.justAdded ? (
              <Check size={15} className="animate-[pop_0.3s_ease-out]" />
            ) : (
              <ShoppingBag size={15} strokeWidth={1.9} />
            )}
          </button>
        </div>

        {/* Color Swatches (if multiple colors are available) */}
        {product.colors && product.colors.length > 1 && (
          <div className="flex items-center gap-1.5 mt-2.5 pt-1.5 border-t border-stone-100">
            {product.colors.map((color, idx) => (
              <button
                key={color.name}
                type="button"
                onClick={e => {
                  e.preventDefault();
                  setSelectedColorIdx(idx);
                }}
                className={`w-3 h-3 rounded-full border transition-all ${
                  selectedColorIdx === idx
                    ? 'border-[#561C08] scale-125 ring-1 ring-[#561C08]'
                    : 'border-stone-300 hover:scale-110'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
