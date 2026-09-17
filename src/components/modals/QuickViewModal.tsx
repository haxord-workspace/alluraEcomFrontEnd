import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Heart, ShoppingBag, MessageCircle, Star, Check, ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const QuickViewModal: React.FC = () => {
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    toggleWishlist,
    isInWishlist,
    formatPrice,
  } = useShop();

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const inWishlist = isInWishlist(product.id);
  const currentSize = selectedSize || product.sizes[0];
  const currentColor = product.colors[selectedColorIdx] || product.colors[0];

  const allImages = [
    product.images.primary,
    product.images.secondary,
    ...(product.images.gallery || []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const handleAddToCart = () => {
    addToCart(product, currentSize, currentColor);
    setQuickViewProduct(null);
  };

  const handleWhatsAppEnquire = () => {
    const text = encodeURIComponent(
      `Hello Allura Stylist, I am interested in ${product.name} (SKU: ${product.sku}, Price: ${formatPrice(product.price)}). Can you assist with size availability?`
    );
    window.open(`https://wa.me/919037991774?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setQuickViewProduct(null)}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-allura-card rounded-xl border border-allura-border shadow-luxury overflow-hidden z-10 max-h-[90vh] flex flex-col md:flex-row animate-slide-up">
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-allura-card/80 backdrop-blur-md text-allura-text hover:bg-allura-bgSecondary transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Left: Product Images */}
        <div className="md:w-1/2 bg-allura-bgSecondary flex flex-col relative">
          <div className="aspect-[4/5] w-full overflow-hidden">
            <img
              src={allImages[activeImageIdx] || product.images.primary}
              alt={product.name}
              className="w-full h-full object-cover object-top transition-all duration-500"
            />
          </div>

          {/* Thumbnail row if multiple */}
          {allImages.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto bg-allura-card border-t border-allura-border/60">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-12 h-14 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${
                    activeImageIdx === idx ? 'border-allura-gold' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover object-top" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details & Purchase Actions */}
        <div className="md:w-1/2 p-6 overflow-y-auto flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs text-allura-goldDark font-sans font-semibold tracking-widest uppercase">
              <span>{product.category} • {product.occasion}</span>
              <div className="flex items-center gap-1 text-amber-700">
                <Star size={12} className="fill-amber-500 text-amber-500" />
                <span>{product.rating} ({product.reviewsCount})</span>
              </div>
            </div>

            <h3 className="font-serif text-2xl font-medium text-allura-text mt-1">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-3 mt-2">
              <span className="font-serif text-xl font-semibold text-allura-darkBrown">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-allura-muted line-through font-sans">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            <p className="text-xs text-allura-muted font-sans leading-relaxed mt-3 line-clamp-3">
              {product.description}
            </p>

            {/* Colors */}
            <div className="mt-4">
              <span className="text-xs font-semibold text-allura-text">
                Color: <span className="font-normal text-allura-muted">{currentColor.name}</span>
              </span>
              <div className="flex items-center gap-2 mt-2">
                {product.colors.map((c, idx) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColorIdx(idx)}
                    className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                      selectedColorIdx === idx ? 'border-allura-gold scale-110' : 'border-allura-border'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {selectedColorIdx === idx && (
                      <Check size={10} className={c.hex === '#1C1B1A' || c.hex === '#151F30' ? 'text-white' : 'text-allura-darkBrown'} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-allura-text">Select Size</span>
                <Link
                  to="/size-guide"
                  onClick={() => setQuickViewProduct(null)}
                  className="text-allura-goldDark underline hover:text-allura-gold"
                >
                  Size Guide
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {product.sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-1.5 rounded text-xs font-sans font-medium transition-all ${
                      currentSize === size
                        ? 'bg-allura-darkBrown text-allura-card border border-allura-darkBrown'
                        : 'border border-allura-border bg-allura-bg hover:border-allura-gold text-allura-text'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-allura-border/60">
            <div className="flex gap-2">
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-bold tracking-[0.2em] uppercase py-3 px-4 rounded-sm transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag size={15} />
                <span>ADD TO BAG</span>
              </button>

              <button
                onClick={() => toggleWishlist(product)}
                className={`p-3 rounded-sm border transition-colors ${
                  inWishlist
                    ? 'border-red-400 bg-red-50 text-red-600'
                    : 'border-allura-border bg-allura-card text-allura-muted hover:text-allura-text'
                }`}
                aria-label="Wishlist"
              >
                <Heart size={16} className={inWishlist ? 'fill-current' : ''} />
              </button>
            </div>

            <button
              onClick={handleWhatsAppEnquire}
              className="w-full bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 border border-[#25D366]/30 py-2 px-3 rounded text-xs font-semibold tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle size={14} />
              <span>Ask Allura Stylist on WhatsApp</span>
            </button>

            <div className="text-center pt-1">
              <Link
                to={`/product/${product.slug}`}
                onClick={() => setQuickViewProduct(null)}
                className="text-[11px] font-sans text-allura-muted hover:text-allura-goldDark transition-colors inline-flex items-center gap-1 uppercase tracking-wider"
              >
                <span>View Full Product Page</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
