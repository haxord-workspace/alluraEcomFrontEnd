import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingBag } from 'lucide-react';
import type { Product } from '../../types';
import { useShop } from '../../context/ShopContext';

interface ProductCardProps {
  product: Product;
  showCategory?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, showCategory = false }) => {
  const { toggleWishlist, isInWishlist, setQuickViewProduct, addToCart, formatPrice } = useShop();
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const inWishlist = isInWishlist(product.id);
  const activeColor = product.colors[selectedColorIdx] || product.colors[0];

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, product.sizes[0] || 'M', activeColor);
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
      className="group relative flex flex-col select-none bg-white p-2.5 sm:p-3 rounded-2xl border border-[#561C08]/12 shadow-xs hover:border-[#561C08]/30 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container with Subtle Radius */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#F5F5F5]">
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

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10 pointer-events-none">
          {product.isNewArrival && (
            <span className="bg-[#561C08] text-white text-[9px] font-heading font-bold tracking-[0.2em] uppercase px-2.5 py-0.5 rounded-full shadow-xs">
              NEW
            </span>
          )}
          {product.isBestSeller && !product.isNewArrival && (
            <span className="bg-[#000000] text-white text-[9px] font-heading font-bold tracking-[0.2em] uppercase px-2.5 py-0.5 rounded-full shadow-xs">
              BESTSELLER
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className={`absolute top-2.5 right-2.5 z-10 p-2 rounded-full transition-all duration-200 ${
            inWishlist
              ? 'bg-white text-[#561C08] shadow-sm'
              : 'bg-white/90 hover:bg-white text-[#000000] hover:text-[#561C08] shadow-xs backdrop-blur-sm'
          }`}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            size={16}
            strokeWidth={1.8}
            className={`transition-transform duration-200 ${
              inWishlist ? 'fill-[#561C08] text-[#561C08] scale-110' : 'hover:scale-110'
            }`}
          />
        </button>

        {/* Quick Action Overlay on Desktop Hover */}
        <div className="hidden lg:flex absolute inset-x-3 bottom-3 z-10 gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <button
            onClick={handleQuickAdd}
            className="flex-1 bg-[#561C08] hover:bg-[#3D1406] text-white text-[11px] font-heading font-bold tracking-[0.2em] uppercase py-2.5 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <ShoppingBag size={13} />
            <span>QUICK ADD</span>
          </button>
          <button
            onClick={handleQuickView}
            className="bg-white hover:bg-[#F7E6C8] text-[#561C08] p-2.5 rounded-xl shadow-sm border border-[#561C08]/15 transition-all"
            title="Quick view details"
            aria-label="Quick view"
          >
            <Eye size={15} />
          </button>
        </div>
      </div>

      {/* Product Information */}
      <div className="pt-3 pb-1 flex flex-col">
        {showCategory && (
          <span className="text-[10px] font-heading font-bold text-[#561C08] uppercase tracking-widest mb-0.5">
            {product.category}
          </span>
        )}

        <Link
          to={`/product/${product.slug}`}
          className="font-heading text-sm sm:text-base font-semibold text-[#000000] hover:text-[#561C08] transition-colors line-clamp-1"
        >
          {product.name}
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-heading text-sm sm:text-base font-bold text-[#561C08]">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="font-body text-xs text-[#000000]/40 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Color Swatches */}
        {product.colors && product.colors.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            {product.colors.map((color, idx) => (
              <button
                key={color.name}
                onClick={e => {
                  e.preventDefault();
                  setSelectedColorIdx(idx);
                }}
                className={`w-3 h-3 rounded-full border transition-all ${
                  selectedColorIdx === idx
                    ? 'border-[#561C08] scale-125 ring-1 ring-[#561C08]'
                    : 'border-[#561C08]/20 hover:scale-110'
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
