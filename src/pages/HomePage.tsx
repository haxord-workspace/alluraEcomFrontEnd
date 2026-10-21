import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
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
import { AlluraCircleSection } from '../components/ui/AlluraCircleSection';
import { AbandonedCartBanner } from '../components/customer/AbandonedCartBanner';
import { useAdmin } from '../context/AdminContext';
import { useShop } from '../context/ShopContext';
import { SEOHead } from '../components/common/SEOHead';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { banners } = useAdmin();
  const { products, categories } = useShop();
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

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

  // Active Editorial / Promotion Banners from Admin Studio (Strictly HOME_PROMOTION)
  const activeEditorialBanners = (banners || []).filter(
    b => (b.placement === 'HOME_PROMOTION' || b.placement === 'EDITORIAL' || (!b.placement && b.position?.toLowerCase() === 'editorial')) && 
         isBannerActive(b) &&
         Boolean(getBannerImage(b) || b.headline || b.title)
  );

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
      {/* 1. HIGH-CONVERSION HERO SECTION */}
      {heroSlides.length > 0 ? (
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

          {/* Carousel Controls: Elegant side arrows and bottom-center slide dots (preventing overlap with floating buttons) */}
          {heroSlides.length > 1 && (
            <>
              {/* Previous Slide Button */}
              <button
                onClick={() =>
                  setCurrentSlide(prev => (prev === 0 ? heroSlides.length - 1 : prev - 1))
                }
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 hover:bg-white text-[#561C08] border border-white/60 backdrop-blur-md flex items-center justify-center transition-all shadow-lg hover:scale-110 active:scale-95"
                aria-label="Previous Slide"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Next Slide Button */}
              <button
                onClick={() => setCurrentSlide(prev => (prev + 1) % heroSlides.length)}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 hover:bg-white text-[#561C08] border border-white/60 backdrop-blur-md flex items-center justify-center transition-all shadow-lg hover:scale-110 active:scale-95"
                aria-label="Next Slide"
              >
                <ChevronRight size={20} />
              </button>

              {/* Center Pagination Dots */}
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
            </>
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

  

      {/* 2. SHOP BY CATEGORY (Live from Store Catalog) */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 border-b border-[#561C08]/15 pb-4">
            <div>
              <span className="text-[11px] font-heading font-bold tracking-[0.25em] uppercase text-[#561C08] block mb-1">
                BROWSE THE COLLECTION
              </span>
              <h2 className="font-heading text-2xl sm:text-4xl text-[#000000] font-bold uppercase tracking-tight">
                SHOP BY CATEGORY
              </h2>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 text-xs font-heading font-bold tracking-[0.2em] text-[#561C08] hover:text-[#3D1406] transition-colors mt-3 sm:mt-0 uppercase"
            >
              <span>VIEW ALL</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {categories.map(cat => {
              const imageUrl = typeof cat.image === 'string' ? cat.image : cat.image?.url;
              return (
                <Link
                  key={cat.id}
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-[#561C08]/15 shadow-xs bg-[#561C08]/5"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-t from-[#561C08]/85 via-[#561C08]/40 to-transparent flex items-center justify-center p-4">
                      <span className="text-white/30 font-heading text-2xl font-bold uppercase">
                        {cat.name}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#561C08]/85 via-[#561C08]/20 to-transparent flex items-end justify-center p-3 text-center">
                    <h4 className="font-heading text-xs sm:text-sm font-bold tracking-wider uppercase text-white">
                      {cat.name}
                    </h4>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. EDITORIAL SPLIT BANNERS (Dynamic from Admin) */}
      {activeEditorialBanners.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`grid grid-cols-1 ${activeEditorialBanners.length > 1 ? 'md:grid-cols-2' : ''} gap-6 lg:gap-8`}>
            {activeEditorialBanners.slice(0, 2).map(banner => {
              const bgImg = getBannerImage(banner);
              return (
                <div
                  key={banner.id}
                  className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden group shadow-md border border-[#561C08]/15 bg-[#561C08]"
                >
                  {bgImg ? (
                    <picture className="w-full h-full">
                      {(banner.mobileImage || banner.images?.mobile?.url) && (
                        <source media="(max-width: 640px)" srcSet={banner.mobileImage || banner.images?.mobile?.url} />
                      )}
                      <img
                        src={bgImg}
                        alt={banner.headline || banner.title}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                      />
                    </picture>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#561C08] via-[#7A280F] to-[#3D1406]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#561C08]/95 via-[#561C08]/45 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
                    {banner.badge && (
                      <span className="inline-block text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-[#F7E6C8] mb-1">
                        {banner.badge}
                      </span>
                    )}
                    <h3 className="font-heading text-2xl sm:text-3xl font-bold tracking-wide text-white">
                      {banner.headline || banner.title}
                    </h3>
                    {(banner.subtitle || banner.description) && (
                      <p className="text-xs sm:text-sm font-body text-[#F7E6C8] mt-1.5 max-w-xs leading-relaxed font-normal">
                        {banner.subtitle || banner.description}
                      </p>
                    )}
                    <div className="pt-4">
                      <Link
                        to={banner.targetUrl || '/shop'}
                        className="inline-flex items-center gap-2 bg-[#561C08] hover:bg-[#3D1406] text-white text-[11px] font-heading font-bold tracking-[0.2em] uppercase py-3 px-6 rounded-xl transition-all duration-300 shadow-md group/btn border border-white/20"
                      >
                        <span>{banner.ctaText || 'SHOP NOW'}</span>
                        <ArrowRight size={13} className="group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. BEST SELLERS PRODUCT GRID */}
      {bestSellers.length > 0 && (
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
      )}

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

      {/* 7. ALLURA CIRCLE VIP SECTION */}
      <AlluraCircleSection />
    </div>
  );
};
