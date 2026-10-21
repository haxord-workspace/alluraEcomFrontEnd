import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Truck,
  RefreshCw,
  ShieldCheck,
  Star,
  ChevronDown,
  Check,
  Plus,
  Minus,
  Ruler,
  Share2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAdmin } from '../context/AdminContext';
import { getStoreProductBySlug } from '../service/store';
import { ProductCard } from '../components/ui/ProductCard';
import { BottomSheet } from '../components/modals/BottomSheet';
import type { Product } from '../types';
import { useAddToBag } from '../hooks/useAddToBag';
import { AddToBagLabel, addToBagButtonState } from '../components/ui/AddToBagLabel';
import { SEOHead } from '../components/common/SEOHead';
import { ProductDetailSkeleton } from '../components/ui/ProductDetailSkeleton';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { products, addToCart, toggleWishlist, isInWishlist, formatPrice, showToast } = useShop();
  const { banners } = useAdmin();

  const activeProductPromo = (banners || []).find(
    b => b.placement === 'PRODUCT_PROMOTION' &&
         (b.status?.toLowerCase() === 'active' || b.status === 'Active' || (b as any).isActive === true) &&
         Boolean(b.desktopImage)
  );

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const bag = useAddToBag();
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    details: true,
    fabric: false,
    shipping: false,
    exchange: false,
  });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setIsLoading(true);
    setNotFound(false);

    getStoreProductBySlug(slug)
      .then(fetched => {
        if (cancelled) return;
        setProduct(fetched);
        setSelectedColorIdx(0);
        setActiveImageIdx(0);
        setQuantity(1);

        const firstColor = fetched.colors?.[0];
        let initialSize = '';
        if (fetched.variants && fetched.variants.length > 0) {
          const matching = fetched.variants.filter(v =>
            (!firstColor?.name || !v.color?.name || v.color.name.toLowerCase().trim() === firstColor.name.toLowerCase().trim()) &&
            Boolean(v.size?.trim())
          );
          if (matching.length > 0) {
            initialSize = matching[0].size.trim();
          }
        }
        if (!initialSize) {
          initialSize = fetched.sizes?.[0] || '';
        }
        setSelectedSize(initialSize);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug]);

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentColor = product?.colors?.[selectedColorIdx] || product?.colors?.[0];

  // Helper: check if a variant's color matches the target color name
  const isColorMatching = useCallback((variantColor?: { name?: string }, targetColorName?: string) => {
    if (!targetColorName) return true;
    const vName = variantColor?.name?.trim();
    if (!vName) {
      return (product?.colors?.length || 0) <= 1;
    }
    return vName.toLowerCase() === targetColorName.toLowerCase().trim();
  }, [product?.colors?.length]);

  // Dynamically compute the sizes available for the currently selected color
  const availableSizes = useMemo(() => {
    if (!product) return [];
    if (!product.variants || product.variants.length === 0) {
      return product.sizes || [];
    }

    const matchingVariants = product.variants.filter(v =>
      isColorMatching(v.color, currentColor?.name) && Boolean(v.size?.trim())
    );

    if (matchingVariants.length === 0) {
      return product.sizes || [];
    }

    const colorSizeSet = new Set(matchingVariants.map(v => v.size.trim().toLowerCase()));

    // Preserve the canonical product.sizes ordering if possible
    const ordered = (product.sizes || []).filter(s => colorSizeSet.has(s.trim().toLowerCase()));
    if (ordered.length > 0) {
      return ordered;
    }

    const uniqueSizes: string[] = [];
    matchingVariants.forEach(v => {
      const s = v.size.trim();
      if (!uniqueSizes.some(existing => existing.toLowerCase() === s.toLowerCase())) {
        uniqueSizes.push(s);
      }
    });
    return uniqueSizes;
  }, [product, currentColor?.name, isColorMatching]);

  // Keep selectedSize in sync with the sizes available for the selected color
  useEffect(() => {
    if (!availableSizes || availableSizes.length === 0) return;
    const isCurrentSizeValid = availableSizes.some(
      s => s.toLowerCase().trim() === selectedSize.toLowerCase().trim()
    );
    if (!isCurrentSizeValid) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes, selectedSize]);

  // Handler for color change: switches color and immediately auto-selects a valid size
  const handleColorSelect = (idx: number) => {
    setSelectedColorIdx(idx);
    setActiveImageIdx(0);

    const newColor = product?.colors?.[idx];
    if (!product?.variants || product.variants.length === 0) return;

    const matchingVariants = product.variants.filter(v =>
      isColorMatching(v.color, newColor?.name) && Boolean(v.size?.trim())
    );

    if (matchingVariants.length > 0) {
      const colorSizes = matchingVariants.map(v => v.size.trim());
      const isStillAvailable = colorSizes.some(
        s => s.toLowerCase() === selectedSize.toLowerCase().trim()
      );
      if (!isStillAvailable) {
        setSelectedSize(colorSizes[0]);
      }
    }
  };

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (notFound || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-gold mx-auto">
          <Sparkles size={24} />
        </div>
        <h1 className="font-serif text-2xl text-allura-text font-normal">Product not found</h1>
        <p className="text-xs text-allura-muted max-w-sm mx-auto">
          This piece may have sold out or is no longer part of our atelier edit.
        </p>
        <Link
          to="/shop"
          className="inline-block bg-allura-goldDark text-allura-card text-xs font-sans font-bold tracking-[0.2em] uppercase py-2.5 px-5 rounded-sm transition-all"
        >
          BROWSE THE SHOP
        </Link>
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);

  // Variants can be priced differently from the product: show the price of the selected size / colour
  const sameText = (a?: string, b?: string) => !a || !b || a.toLowerCase().trim() === b.toLowerCase().trim();
  const selectedVariant =
    product.variants?.find(v => 
      isColorMatching(v.color, currentColor?.name) && 
      v.size?.trim().toLowerCase() === selectedSize.trim().toLowerCase()
    ) ||
    product.variants?.find(v => 
      sameText(v.size, selectedSize) && sameText(v.color?.name, currentColor?.name)
    ) ||
    (product.variants?.length === 1 ? product.variants[0] : undefined);
  const displayPrice = selectedVariant?.price || product.price;
  const displayMrp = selectedVariant ? (selectedVariant.mrp > displayPrice ? selectedVariant.mrp : undefined) : product.originalPrice;

  // If the selected variant or colour has its own photos, showcase them in the gallery
  const colorVariant = product.variants?.find(v => sameText(v.color?.name, currentColor?.name) && v.images && v.images.length > 0);
  const variantGallery = selectedVariant?.images?.length
    ? selectedVariant.images.map(img => img.url)
    : colorVariant?.images?.map(img => img.url);

  const galleryImages = (variantGallery && variantGallery.length > 0)
    ? variantGallery.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)
    : [
        product.images.primary,
        product.images.secondary,
        ...(product.images.gallery || []),
      ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  const handleAddToCart = () => {
    bag.add(product, selectedSize, currentColor, quantity);
  };

  // Buy Now: add quietly (no bag drawer), wait until it's in the bag, then go to checkout.
  // Checkout shows the whole bag; the customer can remove items there (they stay in the bag).
  const handleBuyNow = async () => {
    if (isBuyingNow) return;
    setIsBuyingNow(true);
    const added = await addToCart(product, selectedSize, currentColor, quantity, { silent: true });
    setIsBuyingNow(false);
    if (added) navigate('/checkout');
  };

  const handleWhatsAppEnquiry = () => {
    const text = encodeURIComponent(
      `Hello Allura Stylist, I am interested in ${product.name} (SKU: ${product.sku}, Price: ${formatPrice(displayPrice)}, Size: ${selectedSize || 'N/A'}, Color: ${currentColor?.name || 'N/A'}). Can you help me finalize my order?`
    );
    window.open(`https://wa.me/919037991774?text=${text}`, '_blank');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${product.name} - Allura Boutique`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Product link copied to clipboard!', 'info');
    }
  };

  const relatedProducts = products
    .filter(p => p.id !== product.id && (p.category === product.category || p.occasion === product.occasion))
    .slice(0, 4);

  const structuredData = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description || `Luxury handcrafted ${product.name} from Allura Boutique.`,
    sku: product.id,
    image: galleryImages,
    brand: {
      '@type': 'Brand',
      name: 'Allura Boutique',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: displayPrice,
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    },
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-6 pb-24 lg:pb-12">
      <SEOHead
        title={product.name}
        description={product.description?.slice(0, 160) || `Buy handcrafted ${product.name} at Allura Boutique.`}
        canonicalUrl={`https://alluraboutique.in/product/${product.slug}`}
        ogImage={galleryImages[0]}
        ogType="product"
        structuredData={structuredData}
      />
      {/* Breadcrumb */}
      <nav className="text-xs font-sans text-allura-muted flex items-center gap-2 mb-3 sm:mb-6">
        <Link to="/" className="hover:text-allura-goldDark">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-allura-goldDark">Shop</Link>
        <span>/</span>
        <Link to={`/collections/${product.occasion.toLowerCase()}`} className="hover:text-allura-goldDark">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-allura-text font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Main Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
        {/* Left: Product Images Gallery (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/5] w-full rounded-lg overflow-hidden bg-allura-bgSecondary relative shadow-subtle border border-allura-border/60">
            <img
              src={galleryImages[activeImageIdx] || product.images.primary}
              alt={product.name}
              className="w-full h-full object-cover object-top transition-all duration-500"
            />
            <button
              onClick={() => toggleWishlist(product)}
              className={`absolute top-4 right-4 z-10 p-3 rounded-full backdrop-blur-md transition-all ${
                inWishlist
                  ? 'bg-allura-card text-red-600 shadow-md'
                  : 'bg-allura-card/85 text-allura-text hover:text-red-600'
              }`}
              aria-label="Toggle Wishlist"
            >
              <Heart size={18} className={inWishlist ? 'fill-current' : ''} />
            </button>

            <button
              onClick={handleShare}
              className="absolute top-4 left-4 z-10 p-3 rounded-full bg-allura-card/85 text-allura-text hover:text-allura-gold backdrop-blur-md transition-all"
              aria-label="Share product"
            >
              <Share2 size={16} />
            </button>
          </div>

          {galleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-20 h-24 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${
                    activeImageIdx === idx
                      ? 'border-allura-goldDark scale-105 shadow-sm'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="Thumb" className="w-full h-full object-cover object-top" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Information & Purchase (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
              ALLURA • {product.category}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-sans">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} className="fill-current" />
                ))}
              </div>
              <span className="font-semibold">{product.rating}</span>
              <span className="text-allura-muted">({product.reviewsCount} reviews)</span>
            </div>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl text-allura-text font-normal uppercase tracking-tight">
            {product.name}
          </h1>

          <div className="flex items-baseline gap-3 pb-3 border-b border-allura-border/60">
            <span className="font-serif text-2xl sm:text-3xl font-semibold text-allura-darkBrown">
              {formatPrice(displayPrice)}
            </span>
            {!!displayMrp && displayMrp > displayPrice && (
              <span className="font-sans text-sm text-allura-muted line-through">
                {formatPrice(displayMrp)}
              </span>
            )}
            <span className="text-[11px] font-sans text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
              Inclusive of all taxes
            </span>
          </div>

          <p className="text-xs sm:text-sm text-allura-muted font-sans leading-relaxed">
            {product.description}
          </p>

          {/* Color Selection */}
          {product.colors.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-allura-darkBrown uppercase tracking-wider">
                COLOUR: <span className="font-normal text-allura-muted">{currentColor?.name}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              {product.colors.map((color, idx) => (
                <button
                  key={color.name}
                  onClick={() => handleColorSelect(idx)}
                  className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all ${
                    selectedColorIdx === idx
                      ? 'border-allura-goldDark bg-allura-bgSecondary/60 shadow-xs ring-1 ring-allura-goldDark'
                      : 'border-allura-border hover:border-allura-gold'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-allura-border flex items-center justify-center"
                    style={{ backgroundColor: color.hex }}
                  >
                    {selectedColorIdx === idx && (
                      <Check size={10} className={color.hex === '#1C1B1A' ? 'text-white' : 'text-allura-darkBrown'} />
                    )}
                  </span>
                  <span className="text-xs font-sans font-medium text-allura-text">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Size Selection & Size Guide */}
          {availableSizes.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-allura-darkBrown uppercase tracking-wider">
                SELECT SIZE
              </span>
              <button
                onClick={() => setIsSizeGuideOpen(true)}
                className="text-allura-goldDark hover:text-allura-darkBrown font-sans font-semibold flex items-center gap-1 underline"
              >
                <Ruler size={13} />
                <span>Size Guide</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {availableSizes.map(size => {
                const isSelected = selectedSize.toLowerCase().trim() === size.toLowerCase().trim();
                const variantForSize = product.variants?.find(v =>
                  isColorMatching(v.color, currentColor?.name) &&
                  v.size?.trim().toLowerCase() === size.trim().toLowerCase()
                );
                const isOutOfStock = variantForSize ? variantForSize.stockAvailable !== undefined && variantForSize.stockAvailable <= 0 : false;

                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[48px] h-11 px-4 rounded text-xs font-sans font-semibold transition-all duration-200 relative ${
                      isSelected
                        ? 'bg-allura-darkBrown text-allura-card border border-allura-darkBrown shadow-xs'
                        : 'border border-allura-border bg-allura-card text-allura-text hover:border-allura-gold'
                    } ${isOutOfStock ? 'opacity-60' : ''}`}
                    title={isOutOfStock ? `${size} (Out of stock)` : size}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4 pt-1">
            <span className="text-xs font-bold text-allura-darkBrown uppercase tracking-wider">
              QUANTITY:
            </span>
            <div className="flex items-center border border-allura-border rounded bg-allura-card">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 px-3 text-allura-text hover:bg-allura-bgSecondary transition-colors"
                aria-label="Decrease"
              >
                <Minus size={13} />
              </button>
              <span className="text-xs font-bold px-3 text-allura-text">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 px-3 text-allura-text hover:bg-allura-bgSecondary transition-colors"
                aria-label="Increase"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Desktop Purchase CTA Buttons (Hidden on mobile where sticky bar is active) */}
          <div className="hidden lg:block space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                disabled={bag.isAdding || isBuyingNow}
                className={`border-2 text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-4 rounded-sm flex items-center justify-center gap-2 shadow-xs ${addToBagButtonState(bag.state)} ${
                  bag.justAdded
                    ? 'bg-emerald-700 border-emerald-700 text-white'
                    : 'bg-allura-card hover:bg-allura-bgSecondary border-allura-darkBrown text-allura-darkBrown'
                }`}
              >
                <AddToBagLabel state={bag.state} label="ADD TO BAG" iconSize={16} />
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isBuyingNow}
                className="bg-allura-darkBrown hover:bg-allura-darkBrown/90 text-white text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-4 rounded-sm transition-all flex items-center justify-center gap-2 shadow-luxury disabled:opacity-60"
              >
                <span>{isBuyingNow ? 'PLEASE WAIT…' : 'BUY NOW'}</span>
              </button>
            </div>

            <button
              onClick={handleWhatsAppEnquiry}
              className="w-full bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 border border-[#25D366]/40 py-3 px-4 rounded-sm text-xs font-sans font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} />
              <span>CHAT WITH ALLURA STYLIST (SIZE HELP)</span>
            </button>
          </div>

          {/* Service Perks */}
          <div className="grid grid-cols-3 gap-2 py-4 border-y border-allura-border/60 text-center text-[10px] font-sans text-allura-muted">
            <div className="flex flex-col items-center gap-1">
              <Truck size={14} className="text-allura-goldDark" />
              <span>Free Shipping &gt; ₹2,999</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RefreshCw size={14} className="text-allura-goldDark" />
              <span>7-Day Easy Exchange</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck size={14} className="text-allura-goldDark" />
              <span>100% Authentic Quality</span>
            </div>
          </div>

          {/* Accordions */}
          <div className="space-y-2 pt-2">
            <div className="border border-allura-border rounded-md overflow-hidden bg-allura-card">
              <button
                onClick={() => toggleAccordion('details')}
                className="w-full p-3.5 text-left flex items-center justify-between text-xs font-sans font-bold text-allura-darkBrown uppercase tracking-wider hover:bg-allura-bgSecondary/40"
              >
                <span>Product Details & Features</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${openAccordions.details ? 'rotate-180' : ''}`}
                />
              </button>
              {openAccordions.details && (
                <div className="p-4 pt-1 text-xs text-allura-muted font-sans space-y-2 border-t border-allura-border/40">
                  <p>{product.description}</p>
                  <p><strong>Styling Tip:</strong> {product.stylingTips}</p>
                  <p><strong>SKU:</strong> {product.sku}</p>
                </div>
              )}
            </div>

            <div className="border border-allura-border rounded-md overflow-hidden bg-allura-card">
              <button
                onClick={() => toggleAccordion('fabric')}
                className="w-full p-3.5 text-left flex items-center justify-between text-xs font-sans font-bold text-allura-darkBrown uppercase tracking-wider hover:bg-allura-bgSecondary/40"
              >
                <span>Fabric & Care Instructions</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${openAccordions.fabric ? 'rotate-180' : ''}`}
                />
              </button>
              {openAccordions.fabric && (
                <div className="p-4 pt-1 text-xs text-allura-muted font-sans space-y-2 border-t border-allura-border/40">
                  <p><strong>Fabric:</strong> {product.fabricDetails}</p>
                  <p><strong>Care:</strong> {product.careInstructions}</p>
                </div>
              )}
            </div>

            <div className="border border-allura-border rounded-md overflow-hidden bg-allura-card">
              <button
                onClick={() => toggleAccordion('shipping')}
                className="w-full p-3.5 text-left flex items-center justify-between text-xs font-sans font-bold text-allura-darkBrown uppercase tracking-wider hover:bg-allura-bgSecondary/40"
              >
                <span>Shipping & Kerala Local Delivery</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${openAccordions.shipping ? 'rotate-180' : ''}`}
                />
              </button>
              {openAccordions.shipping && (
                <div className="p-4 pt-1 text-xs text-allura-muted font-sans space-y-1.5 border-t border-allura-border/40">
                  <p>• Fast delivery across Malappuram & Kerala in 2-3 business days.</p>
                  <p>• All India courier express delivery in 4-6 business days.</p>
                  <p>• In-store pickup available at Allura Boutique, Ooty Road, Perinthalmanna.</p>
                </div>
              )}
            </div>

            <div className="border border-allura-border rounded-md overflow-hidden bg-allura-card">
              <button
                onClick={() => toggleAccordion('exchange')}
                className="w-full p-3.5 text-left flex items-center justify-between text-xs font-sans font-bold text-allura-darkBrown uppercase tracking-wider hover:bg-allura-bgSecondary/40"
              >
                <span>Exchange & Return Guidelines</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${openAccordions.exchange ? 'rotate-180' : ''}`}
                />
              </button>
              {openAccordions.exchange && (
                <div className="p-4 pt-1 text-xs text-allura-muted font-sans space-y-1.5 border-t border-allura-border/40">
                  <p>• 7-day hassle-free exchange for size or alternative designs.</p>
                  <p>• Product tags and original boutique invoice must be intact.</p>
                  <p>• WhatsApp us directly at +91 9037991774 to initiate an exchange.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Product Promotion Banner from Admin Studio */}
      {activeProductPromo && (
        <div className="mt-8 sm:mt-12 relative rounded-2xl overflow-hidden shadow-md border border-allura-border/60 aspect-[16/6] sm:aspect-[24/6] min-h-[130px] group">
          <picture className="w-full h-full">
            {activeProductPromo.mobileImage && (
              <source media="(max-width: 640px)" srcSet={activeProductPromo.mobileImage} />
            )}
            <img
              src={activeProductPromo.desktopImage}
              alt={activeProductPromo.headline || activeProductPromo.title}
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-102 ${
                activeProductPromo.mobileImage && activeProductPromo.mobileImage !== activeProductPromo.desktopImage
                  ? 'object-[center_35%]'
                  : 'object-[80%_35%] sm:object-[center_35%]'
              }`}
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-allura-darkBrown/90 via-allura-darkBrown/60 to-transparent flex items-center p-6 sm:p-10">
            <div className="max-w-xl text-white space-y-2">
              {activeProductPromo.badge && (
                <span className="inline-block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-allura-gold">
                  {activeProductPromo.badge}
                </span>
              )}
              <h3 className="font-serif text-lg sm:text-2xl font-medium tracking-tight">
                {activeProductPromo.headline || activeProductPromo.title}
              </h3>
              {(activeProductPromo.subtitle || activeProductPromo.description) && (
                <p className="text-xs sm:text-sm text-allura-bgSecondary/90 font-sans max-w-md line-clamp-2">
                  {activeProductPromo.subtitle || activeProductPromo.description}
                </p>
              )}
              {activeProductPromo.targetUrl && (
                <div className="pt-1">
                  <Link
                    to={activeProductPromo.targetUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-sans font-bold tracking-wider text-allura-gold hover:text-white uppercase transition-colors"
                  >
                    <span>{activeProductPromo.ctaText || 'VIEW OFFER'}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Complete The Look Section */}
      <section className="mt-8 sm:mt-14 pt-8 sm:pt-12 border-t border-allura-border/60">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark block mb-1">
              PAIR WITH INTENTION
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal uppercase">
              YOU MAY ALSO LOVE
            </h2>
          </div>
          <Link
            to="/shop"
            className="text-xs font-sans font-bold tracking-wider text-allura-darkBrown hover:text-allura-goldDark uppercase"
          >
            Explore More →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {relatedProducts.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>

    {/* Mobile Sticky Purchase Bar - Fixed at the very bottom, exactly matching Oxbo reference */}
    <aside
      aria-label="Mobile Purchase Bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-allura-border/60 px-4 pt-3 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]"
      style={{
        paddingBottom: 'max(0.75rem, calc(0.5rem + env(safe-area-inset-bottom, 0px)))',
      }}
    >
      <div className="flex items-center gap-3 max-w-md mx-auto">
        <button
          onClick={handleAddToCart}
          disabled={bag.isAdding || isBuyingNow}
          className={`flex-1 h-12 border-2 border-allura-darkBrown text-allura-darkBrown bg-white hover:bg-stone-50 text-xs font-sans font-bold tracking-wider uppercase px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] ${addToBagButtonState(bag.state)} ${
            bag.justAdded
              ? '!bg-emerald-700 !border-emerald-700 !text-white'
              : ''
          }`}
        >
          <AddToBagLabel state={bag.state} label="ADD TO BAG" iconSize={15} />
        </button>

        <button
          onClick={handleBuyNow}
          disabled={isBuyingNow}
          className="flex-1 h-12 bg-allura-darkBrown hover:bg-allura-darkBrown/90 text-white text-xs font-sans font-bold tracking-wider uppercase px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60 transition-all active:scale-[0.98] truncate"
        >
          <span className="truncate">
            {isBuyingNow ? 'PLEASE WAIT…' : `BUY NOW • ${formatPrice(displayPrice)}`}
          </span>
        </button>
      </div>
    </aside>

      {/* Size Guide BottomSheet */}
      <BottomSheet
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        title="Allura Size Chart & Fit Guide"
      >
        <div className="space-y-6">
          <p className="text-xs text-allura-muted font-sans">
            All measurements are listed in inches. For custom tailoring or bridal measurements, consult an Allura stylist directly.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-sans border-collapse">
              <thead>
                <tr className="bg-allura-bgSecondary border-b border-allura-border text-allura-darkBrown font-bold">
                  <th className="p-2.5">Size</th>
                  <th className="p-2.5">Bust</th>
                  <th className="p-2.5">Waist</th>
                  <th className="p-2.5">Hip</th>
                  <th className="p-2.5">Length</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-allura-border/60">
                <tr><td className="p-2.5 font-bold">XS</td><td className="p-2.5">32-34</td><td className="p-2.5">26-28</td><td className="p-2.5">36-38</td><td className="p-2.5">48</td></tr>
                <tr><td className="p-2.5 font-bold">S</td><td className="p-2.5">34-36</td><td className="p-2.5">28-30</td><td className="p-2.5">38-40</td><td className="p-2.5">49</td></tr>
                <tr><td className="p-2.5 font-bold">M</td><td className="p-2.5">36-38</td><td className="p-2.5">30-32</td><td className="p-2.5">40-42</td><td className="p-2.5">50</td></tr>
                <tr><td className="p-2.5 font-bold">L</td><td className="p-2.5">38-40</td><td className="p-2.5">32-34</td><td className="p-2.5">42-44</td><td className="p-2.5">50</td></tr>
                <tr><td className="p-2.5 font-bold">XL</td><td className="p-2.5">40-42</td><td className="p-2.5">34-36</td><td className="p-2.5">44-46</td><td className="p-2.5">51</td></tr>
                <tr><td className="p-2.5 font-bold">XXL</td><td className="p-2.5">42-44</td><td className="p-2.5">36-38</td><td className="p-2.5">46-48</td><td className="p-2.5">51</td></tr>
              </tbody>
            </table>
          </div>

          <div className="bg-allura-bgSecondary/60 p-4 rounded-lg border border-allura-border text-xs space-y-1.5">
            <h5 className="font-bold text-allura-darkBrown uppercase">How to Measure</h5>
            <p className="text-allura-muted">• <strong>Bust:</strong> Measure around the fullest part of your chest.</p>
            <p className="text-allura-muted">• <strong>Waist:</strong> Measure around the narrowest part of your natural waistline.</p>
            <p className="text-allura-muted">• <strong>Hip:</strong> Measure around the fullest part of your hips with feet together.</p>
          </div>
        </div>
      </BottomSheet>
    </>
  );
};
