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
      className="group relative flex flex-col select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container with Subtle Radius */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[4px] bg-allura-bgSecondary">
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
            <span className="bg-allura-goldDark text-allura-card text-[9px] font-sans font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm">
              NEW
            </span>
          )}
          {product.isBestSeller && !product.isNewArrival && (
            <span className="bg-allura-darkBrown text-allura-card text-[9px] font-sans font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm">
              BESTSELLER
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className={`absolute top-2.5 right-2.5 z-10 p-2 rounded-full transition-all duration-200 ${
            inWishlist
              ? 'bg-allura-card text-red-600 shadow-subtle'
              : 'bg-allura-card/85 hover:bg-allura-card text-allura-text hover:text-red-600 shadow-sm backdrop-blur-sm opacity-90 group-hover:opacity-100'
          }`}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            size={16}
            strokeWidth={1.8}
            className={`transition-transform duration-200 ${
              inWishlist ? 'fill-red-600 scale-110' : 'hover:scale-110'
            }`}
          />
        </button>

        {/* Quick Action Overlay on Desktop Hover */}
        <div className="hidden lg:flex absolute inset-x-3 bottom-3 z-10 gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <button
            onClick={handleQuickAdd}
            className="flex-1 bg-allura-card/95 hover:bg-allura-darkBrown hover:text-allura-card text-allura-text text-[11px] font-sans font-bold tracking-[0.2em] uppercase py-2.5 px-3 rounded-sm shadow-subtle backdrop-blur-md transition-all flex items-center justify-center gap-1.5"
          >
            <ShoppingBag size={13} />
            <span>QUICK ADD</span>
          </button>
          <button
            onClick={handleQuickView}
            className="bg-allura-card/95 hover:bg-allura-gold hover:text-allura-card text-allura-text p-2.5 rounded-sm shadow-subtle backdrop-blur-md transition-all"
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
          <span className="text-[10px] font-sans font-medium text-allura-goldDark uppercase tracking-widest mb-0.5">
            {product.category}
          </span>
        )}

        <Link
          to={`/product/${product.slug}`}
          className="font-serif text-sm sm:text-base font-normal text-allura-text hover:text-allura-goldDark transition-colors line-clamp-1"
        >
          {product.name}
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-serif text-sm sm:text-base font-semibold text-allura-text">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="font-sans text-xs text-allura-muted line-through">
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
                    ? 'border-allura-gold scale-125 ring-1 ring-allura-gold'
                    : 'border-allura-border hover:scale-110'
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
