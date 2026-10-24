import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Truck, 
  ShieldCheck, 
  RefreshCw, 
  MessageSquare, 
  Play,
  Diamond,
  Feather,
  Heart
} from 'lucide-react';
import { ProductCard } from '../components/ui/ProductCard';
import { ProductCardSkeleton } from '../components/ui/ProductCardSkeleton';
import { HeroBannerSkeleton } from '../components/ui/HeroBannerSkeleton';
import { CategoryCardSkeleton } from '../components/ui/CategoryCardSkeleton';
import { AlluraCircleSection } from '../components/ui/AlluraCircleSection';
import { AbandonedCartBanner } from '../components/customer/AbandonedCartBanner';
import { useAdmin } from '../context/AdminContext';
import { useShop } from '../context/ShopContext';
import { SEOHead } from '../components/common/SEOHead';
import { getStoreCollectionPage, type StoreCollection } from '../service/store';
import { mockFaqsData } from '../data/mockFaqs';
import { useCategoryCarousel } from '../hooks/useCategoryCarousel';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { banners, isLoadingBanners, faqs } = useAdmin();
  const { products, categories, isLoadingProducts } = useShop();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Dynamic paginated collections for Tile 1 and Tile 2 (limit=1 per call)
  const [tile1Collection, setTile1Collection] = useState<StoreCollection | null>(null);
  const [tile2Collection, setTile2Collection] = useState<StoreCollection | null>(null);
  const [tile1Page, setTile1Page] = useState<number>(1);
  const [tile2Page, setTile2Page] = useState<number>(2);
  const [totalCollectionPages, setTotalCollectionPages] = useState<number>(1);

  // Category carousel — infinite auto-scroll powered by hook
  const { trackRef: categoryTrackRef, scrollByCards: scrollCategory, pauseAutoScroll: pauseCatAuto, scheduleResume: scheduleCatResume } = useCategoryCarousel(categories.length);

  const fetchTile1Collection = useCallback(async (pageNum: number) => {
    try {
      const res = await getStoreCollectionPage(pageNum, 1);
      if (res.collections && res.collections.length > 0) {
        setTile1Collection(res.collections[0]);
        if (res.meta?.totalPages) {
          setTotalCollectionPages(res.meta.totalPages);
        }
      }
    } catch (err) {
      console.warn('Failed to load tile 1 collection page:', err);
    }
  }, []);

  const fetchTile2Collection = useCallback(async (pageNum: number) => {
    try {
      const res = await getStoreCollectionPage(pageNum, 1);
      if (res.collections && res.collections.length > 0) {
        setTile2Collection(res.collections[0]);
        if (res.meta?.totalPages) {
          setTotalCollectionPages(res.meta.totalPages);
        }
      }
    } catch (err) {
      console.warn('Failed to load tile 2 collection page:', err);
    }
  }, []);

  useEffect(() => {
    fetchTile1Collection(1);
    fetchTile2Collection(2);
  }, [fetchTile1Collection, fetchTile2Collection]);

  // Helper to extract banner image from any field
  const getBannerImage = (b: any): string => {
    return (
      b?.desktopImage ||
      b?.images?.desktop?.url ||
      (typeof b?.image === 'string' ? b?.image : b?.image?.url) ||
      b?.imageUrl ||
      b?.mobileImage ||
      b?.images?.mobile?.url ||
      ''
    );
  };

  const isBannerActive = (b: any): boolean => {
    if (!b) return false;
    if (b.isActive === false || b.status === 'Draft' || b.status === 'DRAFT') return false;
    if (b.status === undefined && b.isActive === undefined) return true;
    const s = String(b.status || '').toUpperCase();
    return s === 'ACTIVE' || s === 'PUBLISHED' || b.isActive === true;
  };

  // Active Hero Banners from Admin Studio (Strictly HOME_HERO)
  const activeHeroBanners = (banners || []).filter(
    b => (b.placement === 'HOME_HERO' || (!b.placement && b.position?.toLowerCase() === 'hero')) && 
         isBannerActive(b) &&
         Boolean(getBannerImage(b))
  );



  // Curated collections with luxury boutique styling
  const CURATED_COLLECTIONS = useMemo(() => [
    {
      id: 'curated-bridal',
      badge: 'HERITAGE BRIDAL',
      title: 'BRIDAL COUTURE',
      subtitle: 'Heritage bridal lehengas, bespoke zardozi embroidery, and timeless royal ensembles.',
      image: '/images/shop-by-occasion/bridal.jpeg',
      ctaText: 'EXPLORE',
      targetUrl: '/collections/bridal',
    },
    {
      id: 'curated-new-arrivals',
      badge: 'FRESH DROPS',
      title: 'NEW ARRIVALS',
      subtitle: 'Fresh modest styles, handpicked for your celebratory wardrobe.',
      image: '/images/editorial-banners/new-arrivals.jpeg',
      ctaText: 'SHOP NOW',
      targetUrl: '/shop?filter=new',
    },
    {
      id: 'curated-allura-collection',
      badge: 'SIGNATURE EDIT',
      title: 'THE ALLURA COLLECTION',
      subtitle: 'Curated modest couture designed in Kerala for discerning women worldwide.',
      image: '/images/editorial-banners/allura-collection.jpeg',
      ctaText: 'EXPLORE',
      targetUrl: '/collections/festive-curation',
    },
    {
      id: 'curated-festive-edit',
      badge: 'CELEBRATION EDIT',
      title: 'FESTIVE COLLECTION',
      subtitle: 'Celebration-ready silhouettes crafted with rich silks, radiant zari, and hand-embroidery.',
      image: '/images/shop-by-occasion/festive.jpeg',
      ctaText: 'EXPLORE',
      targetUrl: '/collections/festive-edit',
    },
    {
      id: 'curated-modest-wear',
      badge: 'CONTEMPORARY MODESTY',
      title: 'MODEST SILHOUETTES',
      subtitle: 'Structured modest co-ord sets, fluid pleated tunics, and graceful modest silhouettes.',
      image: '/images/shop-by-occasion/modest-wear.jpeg',
      ctaText: 'EXPLORE',
      targetUrl: '/collections/modest-wear',
    },
    {
      id: 'curated-party-wear',
      badge: 'STATEMENT EVENINGS',
      title: 'OCCASION COUTURE',
      subtitle: 'Luxe embroidered gowns and festive modesty crafted to make an indelible impression.',
      image: '/images/shop-by-occasion/party-wear.jpeg',
      ctaText: 'EXPLORE',
      targetUrl: '/collections/party-wear',
    },
  ], []);

  // Helper to format a collection item for editorial display
  const formatTileItem = useCallback((col: StoreCollection | null, fallbackIdx: number) => {
    if (!col) {
      return CURATED_COLLECTIONS[fallbackIdx % CURATED_COLLECTIONS.length];
    }
    const rawImg = typeof col.image === 'string'
      ? col.image
      : (col.image?.url || col.image?.thumbnailUrl);

    const colTitle = col.name?.toUpperCase() || 'COLLECTION';
    const colDesc = col.description?.trim();

    return {
      id: col.id || `api-col-${fallbackIdx}`,
      badge: col.isFeatured ? 'FEATURED COLLECTION' : (fallbackIdx % 2 === 0 ? 'FRESH DROPS' : 'SIGNATURE EDIT'),
      title: colTitle,
      subtitle: colDesc || (fallbackIdx % 2 === 0
        ? 'Fresh modest styles, handpicked for your celebratory wardrobe.'
        : 'Curated modest couture designed in Kerala for discerning women worldwide.'),
      image: rawImg || (fallbackIdx % 2 === 0 ? '/images/editorial-banners/new-arrivals.jpeg' : '/images/editorial-banners/allura-collection.jpeg'),
      ctaText: fallbackIdx % 2 === 0 ? 'SHOP NOW' : 'EXPLORE',
      targetUrl: col.slug ? `/collections/${col.slug}` : `/shop?category=${encodeURIComponent(col.name)}`,
    };
  }, [CURATED_COLLECTIONS]);

  const tile1Item = useMemo(() => formatTileItem(tile1Collection, tile1Page - 1), [formatTileItem, tile1Collection, tile1Page]);
  const tile2Item = useMemo(() => formatTileItem(tile2Collection, tile2Page - 1), [formatTileItem, tile2Collection, tile2Page]);

  // Independent navigation handlers for Tile 1 (fetches next/prev page with limit=1)
  const handlePrevTile1 = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    const maxPages = totalCollectionPages > 1 ? totalCollectionPages : CURATED_COLLECTIONS.length;
    const prev = tile1Page <= 1 ? maxPages : tile1Page - 1;
    setTile1Page(prev);
    fetchTile1Collection(prev);
  };

  const handleNextTile1 = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    const maxPages = totalCollectionPages > 1 ? totalCollectionPages : CURATED_COLLECTIONS.length;
    const next = tile1Page >= maxPages ? 1 : tile1Page + 1;
    setTile1Page(next);
    fetchTile1Collection(next);
  };

  // Independent navigation handlers for Tile 2 (fetches next/prev page with limit=1)
  const handlePrevTile2 = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    const maxPages = totalCollectionPages > 1 ? totalCollectionPages : CURATED_COLLECTIONS.length;
    const prev = tile2Page <= 1 ? maxPages : tile2Page - 1;
    setTile2Page(prev);
    fetchTile2Collection(prev);
  };

  const handleNextTile2 = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    const maxPages = totalCollectionPages > 1 ? totalCollectionPages : CURATED_COLLECTIONS.length;
    const next = tile2Page >= maxPages ? 1 : tile2Page + 1;
    setTile2Page(next);
    fetchTile2Collection(next);
  };

  // Dynamic slides populated strictly from active Admin Hero Banners (no dummy mock slides)
  const heroSlides = activeHeroBanners.map((b) => {
    const fullTitle = b.headline || b.title || 'ALLURA ETHNIC & MODEST COUTURE';
    const headingLines = fullTitle.includes('\n') 
      ? fullTitle.split('\n').filter(Boolean)
      : [fullTitle];
    const rawDesc = b.subtitle || b.description || '';
    // Avoid rendering AI prompt descriptions that look like image generation instructions
    const isAiPrompt = /^(a woman|a model|a photo|a picture|high resolution|cinematic|full body shot|portrait of)/i.test(rawDesc.trim());
    const description = isAiPrompt
      ? (b.subtitle && !/^(a woman|a model|a photo)/i.test(b.subtitle) ? b.subtitle : '')
      : rawDesc;
    const img = getBannerImage(b);

    return {
      id: b.id,
      badge: b.badge || '',
      eyebrow: b.eyebrow || '',
      headingLines,
      title: fullTitle,
      subtitle: b.subtitle || '',
      description,
      offerPill: b.offerPill || '',
      primaryCta: b.ctaText || 'SHOP NOW',
      primaryLink: b.targetUrl || '/shop',
      secondaryCta: b.secondaryCtaText || '',
      secondaryLink: b.secondaryTargetUrl || '',
      image: img,
      mobileImage: b.mobileImage || img,
    };
  });

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    } else if (isRightSwipe) {
      setCurrentSlide(prev => (prev === 0 ? heroSlides.length - 1 : prev - 1));
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const bestSellers = (products.filter(p => p.isBestSeller).length > 0
    ? products.filter(p => p.isBestSeller)
    : products
  ).slice(0, 4);

  const homeSchema = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: 'Allura Boutique',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80',
    description: 'Curated Indian luxury fashion, handcrafted Kasavu weaves, and modest silhouettes in Perinthalmanna, Kerala.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Ooty Road',
      addressLocality: 'Perinthalmanna',
      addressRegion: 'Kerala',
      addressCountry: 'IN',
    },
    telephone: '+919037991774',
    url: 'https://alluraboutique.in',
  };

  return (
    <div className="space-y-12 sm:space-y-20">
      <SEOHead
        title="Allura Boutique | Luxury Indian & Modest Couture Atelier"
        description="Discover bespoke Kasavu weaves, handcrafted celebratory lehengas, and ethereal modest silhouettes from our Perinthalmanna atelier. Free express delivery over ₹2,999."
        canonicalUrl="https://alluraboutique.in"
        ogType="website"
        structuredData={homeSchema}
      />
      {/* Reminder for customers with an abandoned bag (GET /abandoned-cart/status) */}
      <AbandonedCartBanner />

      {/* 1. HIGH-CONVERSION HERO SECTION */}
      {isLoadingBanners && heroSlides.length === 0 ? (
        <HeroBannerSkeleton />
      ) : heroSlides.length > 0 ? (
        <section 
          className="relative w-full min-h-[520px] h-[78vh] sm:h-auto sm:min-h-[580px] lg:h-[84vh] lg:max-h-[820px] overflow-hidden bg-[#F7E6C8]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {heroSlides.map((slide, index) => {
            const isActive = currentSlide === index;
            const hasCustomMobileImage = Boolean(slide.mobileImage && slide.mobileImage !== slide.image);

            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* Background Model Image with subtle zoom & intelligent focal alignment */}
                <picture className="absolute inset-0 w-full h-full">
                  {slide.mobileImage && (
                    <source media="(max-width: 640px)" srcSet={slide.mobileImage} />
                  )}
                  <img
                    src={slide.image}
                    alt={slide.headingLines.join(' ')}
                    className={`w-full h-full object-cover transition-transform duration-[8500ms] ease-out z-0 ${
                      hasCustomMobileImage
                        ? 'object-[center_top]'
                        : 'object-[82%_20%] sm:object-[center_top]'
                    }`}
                    style={{
                      transform: isActive ? 'scale(1.04)' : 'scale(1)',
                    }}
                  />
                </picture>

                {/* Protective Luxury Gradient Overlay for contrast & mobile legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-transparent sm:from-stone-950/70 sm:via-stone-950/20 sm:to-transparent z-10 pointer-events-none" />

                {/* Content Container */}
                <div className="max-w-7xl mx-auto h-full px-5 sm:px-6 lg:px-8 relative z-30 flex items-end justify-between w-full pb-20 sm:pb-28 lg:pb-32">
                  <div className="max-w-xl space-y-3 sm:space-y-4 pt-4 sm:pt-0 pr-14 sm:pr-0">
                    <h1 className="font-heading text-3xl sm:text-5xl lg:text-[54px] text-white font-bold leading-[1.08] tracking-tight uppercase drop-shadow-md">
                      {slide.headingLines.map((line, lIdx) => (
                        <span key={lIdx} className="block">
                          {line}
                        </span>
                      ))}
                    </h1>

                    {slide.description && (
                      <p className="text-xs sm:text-sm text-[#F7E6C8] font-body max-w-lg leading-relaxed font-normal line-clamp-3 sm:line-clamp-none drop-shadow-sm">
                        {slide.description}
                      </p>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <Link
                        to={slide.primaryLink}
                        className="inline-flex items-center justify-center gap-2 bg-[#F7E6C8] hover:bg-white text-[#561C08] text-xs font-heading font-bold tracking-[0.2em] uppercase py-3.5 px-7 sm:py-4 sm:px-8 rounded-xl shadow-md transition-all duration-300 group text-center"
                      >
                        <span>{slide.primaryCta}</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Carousel Controls: Bottom-center slide dots */}
          {heroSlides.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-stone-900/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === idx ? 'w-6 bg-[#F7E6C8]' : 'w-2 bg-white/50 hover:bg-white'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="relative w-full py-20 sm:py-28 bg-[#F7E6C8] border-b border-[#561C08]/15">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
            <span className="text-[11px] font-heading font-bold tracking-[0.3em] uppercase text-[#561C08]">
              ATELIER OF MODEST LUXURY & SILKS
            </span>
            <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl text-[#000000] font-bold uppercase tracking-tight">
              ALLURA ETHNIC & MODEST COUTURE
            </h1>
            <p className="text-sm sm:text-base text-[#561C08] font-body max-w-xl mx-auto leading-relaxed">
              Curated artisanal sarees, regal lehengas, and refined modest ensembles handcrafted for your moments of celebration.
            </p>
            <div className="pt-4 flex justify-center">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-[#561C08] hover:bg-[#3D1406] text-white text-xs font-heading font-bold tracking-[0.2em] uppercase py-4 px-8 rounded-xl shadow-md transition-all duration-300"
              >
                <span>EXPLORE COLLECTION</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

  

      {/* 2. SHOP BY CATEGORY (Smooth Couture Carousel with Arched Portals) */}
      {isLoadingProducts && categories.length === 0 ? (
        <section className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 sm:mb-10 border-b border-[#561C08]/15 pb-4">
            <h2 className="font-heading text-xl sm:text-3xl lg:text-4xl text-[#000000] font-bold uppercase tracking-tight">
              SHOP BY CATEGORY
            </h2>
            <div className="h-4 w-28 bg-[#561C08]/10 rounded animate-pulse" />
          </div>
          <div className="flex items-start gap-3 sm:gap-6 overflow-hidden py-2">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="flex-shrink-0 w-[calc((100vw_-_4.5rem)_/_3)] sm:w-[200px] md:w-[225px] lg:w-[235px]">
                <CategoryCardSkeleton count={1} />
              </div>
            ))}
          </div>
        </section>
      ) : categories.length > 0 ? (
        <section className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-[#561C08]/15 pb-4">
            <h2 className="font-heading text-xl sm:text-3xl lg:text-4xl text-[#000000] font-bold uppercase tracking-tight">
              SHOP BY CATEGORY
            </h2>
            <div className="flex items-center gap-3 sm:gap-6">
              {/* Carousel navigation arrow controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { scrollCategory('left'); }}
                  aria-label="Previous categories"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-all duration-300 border-[#561C08]/30 text-[#561C08] hover:bg-[#561C08] hover:text-white shadow-xs cursor-pointer hover:scale-105 active:scale-95"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => { scrollCategory('right'); }}
                  aria-label="Next categories"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-all duration-300 border-[#561C08]/30 text-[#561C08] hover:bg-[#561C08] hover:text-white shadow-xs cursor-pointer hover:scale-105 active:scale-95"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-heading font-bold tracking-[0.18em] text-[#561C08] hover:text-[#3D1406] transition-colors uppercase group"
              >
                <span>EXPLORE ALL</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="relative group/cattrack overflow-hidden">
            {/* Left Edge Floating Arrow (desktop hover) */}
            <button
              type="button"
              onClick={() => { scrollCategory('left'); }}
              aria-label="Scroll left"
              className="hidden md:flex absolute -left-0 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/95 text-[#561C08] border border-[#561C08]/20 shadow-xl backdrop-blur-md items-center justify-center hover:bg-[#561C08] hover:text-white transition-all duration-300 opacity-0 group-hover/cattrack:opacity-100 hover:scale-110 active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Right Edge Floating Arrow (desktop hover) */}
            <button
              type="button"
              onClick={() => { scrollCategory('right'); }}
              aria-label="Scroll right"
              className="hidden md:flex absolute -right-0 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/95 text-[#561C08] border border-[#561C08]/20 shadow-xl backdrop-blur-md items-center justify-center hover:bg-[#561C08] hover:text-white transition-all duration-300 opacity-0 group-hover/cattrack:opacity-100 hover:scale-110 active:scale-95"
            >
              <ChevronRight size={20} />
            </button>

            {/* Infinite-scroll track: items are duplicated for seamless looping */}
            <div
              ref={categoryTrackRef}
              className="flex items-start gap-3 sm:gap-6 py-2 will-change-transform"
              style={{ width: 'max-content' }}
              onMouseEnter={pauseCatAuto}
              onMouseLeave={scheduleCatResume}
            >
              {/* Render categories twice for seamless infinite loop */}
              {[...categories, ...categories].map((cat, idx) => {
                const imageUrl = typeof cat.image === 'string' ? cat.image : cat.image?.url;
                return (
                  <Link
                    key={`${cat.id}-${idx}`}
                    to={`/shop?category=${encodeURIComponent(cat.name)}`}
                    className="flex-shrink-0 w-[calc((100vw_-_4.5rem)_/_3)] sm:w-[200px] md:w-[225px] lg:w-[235px] group flex flex-col items-center text-center focus:outline-none select-none transition-transform duration-300 hover:-translate-y-1"
                  >
                    {/* Arched Portal Image Frame */}
                    <div className="relative w-full aspect-[9/14] sm:aspect-[3/4.8] rounded-t-full rounded-b-2xl sm:rounded-b-3xl overflow-hidden border border-[#561C08]/10 bg-[#561C08]/5 shadow-xs transition-all duration-500 group-hover:shadow-lg group-hover:border-[#561C08]/30">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={cat.name}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const fallback = (e.target as HTMLElement).nextElementSibling;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-b from-[#F4EDE4] via-[#EFE6D8] to-[#E5D7C3] flex flex-col items-center justify-center p-4 text-[#561C08] ${imageUrl ? 'hidden' : ''}`}>
                        <span className="font-serif text-3xl font-light italic mb-1 text-[#561C08]/40">A</span>
                        <span className="font-heading text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#561C08]/70 text-center line-clamp-2">
                          {cat.name}
                        </span>
                      </div>

                      {/* Subtle hover overlay */}
                      <div className="absolute inset-0 bg-stone-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>

                    {/* Text Below the Arch */}
                    <div className="mt-3 sm:mt-4 space-y-0.5 sm:space-y-1 w-full px-1">
                      <h3 className="font-heading text-xs sm:text-sm font-bold tracking-[0.16em] uppercase text-stone-900 group-hover:text-[#561C08] transition-colors truncate">
                        {cat.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-stone-500 font-sans tracking-normal font-normal truncate">
                        {(() => {
                          const lower = (cat.name || '').toLowerCase().trim();
                          if (lower.includes('bridal') || lower.includes('wedding')) return 'For your big day';
                          if (lower.includes('festive') || lower.includes('celebration')) return 'Celebrate in style';
                          if (lower.includes('party') || lower.includes('glam')) return 'Make a statement';
                          if (lower.includes('modest') || lower.includes('abaya') || lower.includes('hijab')) return 'Graceful silhouettes';
                          if (lower.includes('ethnic') || lower.includes('tradition')) return 'Tradition reimagined';
                          if (lower.includes('saree') || lower.includes('sari')) return 'Timeless elegance';
                          if (lower.includes('lehenga') || lower.includes('lahanga')) return 'Regal bridal flares';
                          if (lower.includes('anarkali') || lower.includes('kurta')) return 'Artisanal embroidery';
                          if (lower.includes('gown') || lower.includes('dress')) return 'Contemporary couture';
                          if (lower.includes('silk')) return 'Pure handwoven weaves';
                          return 'Curated atelier wear';
                        })()}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. SIGNATURE COLLECTIONS / EDITORIAL SHOWCASE (Two dynamic tiles with independent <> navigation) */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Tile 1 */}
          {tile1Item && (() => {
            return (
              <div className="relative group rounded-2xl sm:rounded-3xl overflow-hidden shadow-md border border-[#561C08]/15 bg-[#561C08] select-none">
                <Link
                  to={tile1Item.targetUrl}
                  className="relative aspect-[16/10] sm:aspect-[16/9] md:aspect-[16/10] block overflow-hidden"
                >
                  {tile1Item.image ? (
                    <img
                      key={tile1Item.id}
                      src={tile1Item.image}
                      alt={tile1Item.title}
                      className="w-full h-full object-cover object-center sm:object-top group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#561C08] via-[#7A280F] to-[#3D1406]" />
                  )}

                  {/* Luxury bottom gradient overlay matching the reference screenshot */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#260E06]/95 via-[#260E06]/40 to-transparent flex flex-col justify-end p-5 sm:p-8 md:p-10 px-5 sm:px-16 md:px-16 text-white space-y-1.5 sm:space-y-2 pointer-events-none">
                    {tile1Item.badge && (
                      <span className="inline-block text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#E2C299] mb-0.5 sm:mb-1">
                        {tile1Item.badge}
                      </span>
                    )}
                    <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight uppercase text-white leading-tight">
                      {tile1Item.title}
                    </h3>
                    {tile1Item.subtitle && (
                      <p className="text-xs sm:text-sm font-sans text-stone-200/95 mt-1 max-w-md leading-relaxed font-normal line-clamp-2">
                        {tile1Item.subtitle}
                      </p>
                    )}
                    <div className="pt-3 sm:pt-4 pointer-events-auto">
                      <span className="inline-flex items-center gap-2 bg-[#2D160C]/90 group-hover:bg-[#1E0C06] text-white text-[11px] sm:text-xs font-heading font-bold tracking-[0.2em] uppercase py-2.5 px-5 sm:py-3 sm:px-6 rounded-lg transition-all duration-300 shadow-md group-hover:shadow-lg border border-white/15">
                        <span>{tile1Item.ctaText}</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Bottom-Right '<' and '>' Navigation Buttons for Tile 1 (Mobile & Laptop) */}
                <div className="absolute right-4 sm:right-6 bottom-4 sm:bottom-6 z-30 flex items-center gap-2 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePrevTile1(e);
                    }}
                    aria-label="Previous collection in Tile 1"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#200E07]/85 hover:bg-[#200E07] text-white backdrop-blur-md border border-white/25 flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNextTile1(e);
                    }}
                    aria-label="Next collection in Tile 1"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#200E07]/85 hover:bg-[#200E07] text-white backdrop-blur-md border border-white/25 flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Tile 2 */}
          {tile2Item && (() => {
            return (
              <div className="relative group rounded-2xl sm:rounded-3xl overflow-hidden shadow-md border border-[#561C08]/15 bg-[#561C08] select-none">
                <Link
                  to={tile2Item.targetUrl}
                  className="relative aspect-[16/10] sm:aspect-[16/9] md:aspect-[16/10] block overflow-hidden"
                >
                  {tile2Item.image ? (
                    <img
                      key={tile2Item.id}
                      src={tile2Item.image}
                      alt={tile2Item.title}
                      className="w-full h-full object-cover object-center sm:object-top group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#561C08] via-[#7A280F] to-[#3D1406]" />
                  )}

                  {/* Luxury bottom gradient overlay matching the reference screenshot */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#260E06]/95 via-[#260E06]/40 to-transparent flex flex-col justify-end p-5 sm:p-8 md:p-10 px-5 sm:px-16 md:px-16 text-white space-y-1.5 sm:space-y-2 pointer-events-none">
                    {tile2Item.badge && (
                      <span className="inline-block text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#E2C299] mb-0.5 sm:mb-1">
                        {tile2Item.badge}
                      </span>
                    )}
                    <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight uppercase text-white leading-tight">
                      {tile2Item.title}
                    </h3>
                    {tile2Item.subtitle && (
                      <p className="text-xs sm:text-sm font-sans text-stone-200/95 mt-1 max-w-md leading-relaxed font-normal line-clamp-2">
                        {tile2Item.subtitle}
                      </p>
                    )}
                    <div className="pt-3 sm:pt-4 pointer-events-auto">
                      <span className="inline-flex items-center gap-2 bg-[#2D160C]/90 group-hover:bg-[#1E0C06] text-white text-[11px] sm:text-xs font-heading font-bold tracking-[0.2em] uppercase py-2.5 px-5 sm:py-3 sm:px-6 rounded-lg transition-all duration-300 shadow-md group-hover:shadow-lg border border-white/15">
                        <span>{tile2Item.ctaText}</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Bottom-Right '<' and '>' Navigation Buttons for Tile 2 (Mobile & Laptop) */}
                <div className="absolute right-4 sm:right-6 bottom-4 sm:bottom-6 z-30 flex items-center gap-2 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePrevTile2(e);
                    }}
                    aria-label="Previous collection in Tile 2"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#200E07]/85 hover:bg-[#200E07] text-white backdrop-blur-md border border-white/25 flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNextTile2(e);
                    }}
                    aria-label="Next collection in Tile 2"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#200E07]/85 hover:bg-[#200E07] text-white backdrop-blur-md border border-white/25 flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* 4. BEST SELLERS PRODUCT GRID */}
      {isLoadingProducts && bestSellers.length === 0 ? (
        <section className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b border-[#561C08]/15 pb-4">
            <div>
              <h2 className="font-heading text-2xl sm:text-4xl text-[#000000] font-bold uppercase tracking-tight">
                BEST SELLERS
              </h2>
              <p className="text-xs sm:text-sm text-[#561C08] font-body mt-0.5 font-medium">
                Loved by our boutique customers
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <ProductCardSkeleton count={4} />
          </div>
        </section>
      ) : bestSellers.length > 0 ? (
        <section className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b border-[#561C08]/15 pb-4">
          <div>
            <h2 className="font-heading text-2xl sm:text-4xl text-[#000000] font-bold uppercase tracking-tight">
              BEST SELLERS
            </h2>
            <p className="text-xs sm:text-sm text-[#561C08] font-body mt-0.5 font-medium">
              Loved by our boutique customers
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-heading font-bold tracking-[0.2em] text-[#561C08] hover:text-[#3D1406] transition-colors mt-3 sm:mt-0 uppercase"
          >
            <span>VIEW ALL</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {bestSellers.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        </section>
      ) : null}

      {/* 5. TRUST STRIP / SERVICE FEATURES */}
      <section className="border-y border-[#561C08]/15 bg-[#F7E6C8] py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-[#561C08] shadow-xs border border-[#561C08]/15">
              <Truck size={20} />
            </div>
            <h4 className="font-heading text-sm font-bold tracking-wider uppercase text-[#000000]">
              FREE SHIPPING
            </h4>
            <p className="text-xs text-[#561C08] font-body font-medium">On orders above ₹2,999</p>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-[#561C08] shadow-xs border border-[#561C08]/15">
              <ShieldCheck size={20} />
            </div>
            <h4 className="font-heading text-sm font-bold tracking-wider uppercase text-[#000000]">
              SECURE PAYMENTS
            </h4>
            <p className="text-xs text-[#561C08] font-body font-medium">100% safe and trusted</p>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-[#561C08] shadow-xs border border-[#561C08]/15">
              <RefreshCw size={20} />
            </div>
            <h4 className="font-heading text-sm font-bold tracking-wider uppercase text-[#000000]">
              EASY EXCHANGE
            </h4>
            <p className="text-xs text-[#561C08] font-body font-medium">7-Day doorstep swaps</p>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-[#561C08] shadow-xs border border-[#561C08]/15">
              <MessageSquare size={20} />
            </div>
            <h4 className="font-heading text-sm font-bold tracking-wider uppercase text-[#000000]">
              WHATSAPP SUPPORT
            </h4>
            <p className="text-xs text-[#561C08] font-body font-medium">+91 9037991774</p>
          </div>
        </div>
      </section>

      {/* 6. THE ALLURA EXPERIENCE & BRAND STORY */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5 relative aspect-[4/5] rounded-2xl overflow-hidden shadow-md group border border-[#561C08]/15">
            <img
              src="/images/boutique-experience/boutique-store.jpeg"
              alt="The Allura Boutique Experience"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-[#561C08]/20 flex items-center justify-center">
              <button
                onClick={() => navigate('/about')}
                className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-md text-[#561C08] flex items-center justify-center shadow-md hover:scale-110 transition-transform hover:bg-[#561C08] hover:text-white"
                aria-label="Play boutique film"
              >
                <Play size={22} className="ml-1 fill-current" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-5">
            <span className="text-[11px] font-heading font-bold tracking-[0.25em] uppercase text-[#561C08]">
              WEAR YOUR STORY WITH ALLURA
            </span>

            <h2 className="font-heading text-3xl sm:text-4xl text-[#000000] font-bold leading-tight uppercase">
              THE ALLURA EXPERIENCE
            </h2>

            <p className="text-xs sm:text-sm text-[#561C08] font-body leading-relaxed font-normal">
              A curated destination for modern women who appreciate modesty, timeless elegance, quality and individuality. From everyday essentials to statement pieces, Allura brings you thoughtfully selected fashion for every celebration.
            </p>

            <div className="pt-2">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 bg-[#561C08] hover:bg-[#3D1406] text-white text-xs font-heading font-bold tracking-[0.25em] uppercase py-3.5 px-6 rounded-xl transition-all duration-300 shadow-md"
              >
                <span>OUR STORY</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6 lg:border-l lg:border-[#561C08]/15 lg:pl-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#561C08] flex-shrink-0 border border-[#561C08]/15 shadow-xs">
                <Diamond size={18} />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold tracking-wider uppercase text-[#000000]">
                  WARM LUXURY
                </h4>
                <p className="text-xs text-[#561C08] font-body mt-0.5 font-medium">
                  Handcrafted styles for every you
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#561C08] flex-shrink-0 border border-[#561C08]/15 shadow-xs">
                <Feather size={18} />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold tracking-wider uppercase text-[#000000]">
                  PREMIUM FABRICS
                </h4>
                <p className="text-xs text-[#561C08] font-body mt-0.5 font-medium">
                  Pure georgette, silk & organza
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#561C08] flex-shrink-0 border border-[#561C08]/15 shadow-xs">
                <Heart size={18} />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold tracking-wider uppercase text-[#000000]">
                  MADE FOR YOUR MOMENTS
                </h4>
                <p className="text-xs text-[#561C08] font-body mt-0.5 font-medium">
                  Modest fashion that feels like you
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6.5. FREQUENTLY ASKED QUESTIONS (FAQ DROPDOWN ACCORDION) */}
      <section className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 space-y-8 pt-4 sm:pt-8">
        <div className="text-center space-y-3">
          <span className="text-[11px] font-heading font-bold tracking-[0.28em] uppercase text-[#561C08] bg-[#F7E6C8]/60 px-3.5 py-1.5 rounded-full inline-block border border-[#561C08]/15">
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h2 className="font-heading text-2xl sm:text-4xl text-[#000000] font-bold uppercase tracking-tight">
            QUESTIONS & ANSWERS
          </h2>
          <p className="text-xs sm:text-sm text-[#561C08] font-body max-w-lg mx-auto leading-relaxed">
            Everything you need to know about our handcrafted modest designs, custom sizing, express shipping across Kerala, and easy returns.
          </p>
        </div>

        <div className="space-y-3 sm:space-y-3.5">
          {(faqs && faqs.length > 0 ? faqs : mockFaqsData).slice(0, 6).map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className={`bg-white/95 rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? 'border-[#561C08]/40 shadow-md ring-1 ring-[#561C08]/20'
                    : 'border-[#561C08]/15 shadow-xs hover:border-[#561C08]/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqId(prev => (prev === faq.id ? null : faq.id))}
                  className="w-full p-4 sm:p-5 sm:px-6 text-left flex items-center justify-between gap-3 sm:gap-4 cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#561C08] bg-[#F7E6C8]/70 px-2.5 py-1 rounded-md border border-[#561C08]/10 hidden sm:inline-block">
                      {faq.category}
                    </span>
                    <h3 className="font-heading text-sm sm:text-base text-[#000000] font-bold">
                      {faq.question}
                    </h3>
                  </div>
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      isOpen ? 'bg-[#561C08] text-white' : 'bg-[#F7E6C8]/60 text-[#561C08]'
                    }`}
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-0 text-xs sm:text-sm font-body text-[#561C08]/90 leading-relaxed border-t border-[#561C08]/10 animate-fade-in mt-1">
                    <p className="pt-3 sm:pt-4">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <Link
            to="/faq"
            className="inline-flex items-center gap-2 text-xs font-heading font-bold tracking-[0.2em] text-[#561C08] hover:text-[#3D1406] transition-colors uppercase group bg-white/70 hover:bg-white border border-[#561C08]/15 py-2.5 px-5 rounded-xl shadow-xs"
          >
            <span>EXPLORE ALL FAQS</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* 7. ALLURA CIRCLE VIP SECTION */}
      <AlluraCircleSection />
    </div>
  );
};
