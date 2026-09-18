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
  Sparkles, 
  Tag, 
  Star,
  Play,
  Diamond,
  Feather,
  Heart
} from 'lucide-react';
import { occasionsData } from '../data/occasions';
import { productsData } from '../data/products';
import { ProductCard } from '../components/ui/ProductCard';
import { OccasionCard } from '../components/ui/OccasionCard';
import { AlluraCircleSection } from '../components/ui/AlluraCircleSection';
import { useAdmin } from '../context/AdminContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { banners } = useAdmin();
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Active Hero Banners from Admin
  const activeHeroBanners = (banners || []).filter(
    b => (b.position?.toLowerCase() === 'hero' || !b.position) && 
         (b.status?.toLowerCase() === 'active' || b.status === 'Active' || (b as any).isActive === true)
  );

  // Active Editorial Banners from Admin
  const activeEditorialBanners = (banners || []).filter(
    b => b.position?.toLowerCase() === 'editorial' && 
         (b.status?.toLowerCase() === 'active' || b.status === 'Active' || (b as any).isActive === true)
  );

  const fallbackSlides = [
    {
      id: 'slide-1',
      badge: 'PERINTHALMANNA ATELIER',
      eyebrow: 'FESTIVE \'26 COLLECTION • HANDCRAFTED',
      headingLines: ['HANDCRAFTED', 'MODEST & ETHNIC', 'COUTURE'],
      title: 'HANDCRAFTED MODEST & ETHNIC COUTURE',
      subtitle: 'Heirloom Kasavu zari, pure silk weaves, and graceful modest silhouettes tailored for your most cherished celebrations.',
      description: 'Heirloom Kasavu zari, pure silk weaves, and graceful modest silhouettes tailored for your most cherished celebrations.',
      offerPill: 'Use Code FESTIVE15 for 15% Off • Free Kerala Express Delivery > ₹2,999',
      primaryCta: 'SHOP NOW',
      primaryLink: '/shop',
      secondaryCta: 'AI LUXURY STYLIST',
      secondaryLink: '/ai-assistant',
      image: '/images/hero-banners/slide-1.jpeg',
      quickPills: [
        { label: '✨ Pure Kasavu', path: '/shop' },
        { label: '👗 Modest Co-ords', path: '/collections/modest-wear' },
        { label: '🌸 Festive Anarkalis', path: '/shop' },
        { label: '👰 Bridal Edit', path: '/collections/bridal-edit' },
      ],
      socialProof: 'Over 10,000+ patrons styled across Kerala & GCC',
      rightTags: ['MODEST WEAR', 'ETHNIC COUTURE', 'FESTIVE SETS'],
      quote: 'MODESTY IS THE HIGHEST FORM OF ELEGANCE',
    },
    {
      id: 'slide-2',
      badge: 'ROYAL HERITAGE WEAVES',
      eyebrow: 'BESPOKE BRIDAL & HEIRLOOM ZARI',
      headingLines: ['BESPOKE', 'ZARDOZI &', 'SILK WEAVES'],
      title: 'BESPOKE ZARDOZI & SILK WEAVES',
      subtitle: 'Intricate metallic needlework and ceremonial crimson lehengas woven by Kerala master artisans with custom blouse tailoring.',
      description: 'Intricate metallic needlework and ceremonial crimson lehengas woven by Kerala master artisans with custom blouse tailoring.',
      offerPill: 'Complimentary Bridal Concierge • Custom Blouse Stitching Available',
      primaryCta: 'SHOP BRIDAL',
      primaryLink: '/collections/bridal-edit',
      secondaryCta: 'WHATSAPP CONCIERGE',
      secondaryLink: 'https://wa.me/919037991774',
      image: '/images/hero-banners/slide-2.jpeg',
      quickPills: [
        { label: '👰 Bridal Lehengas', path: '/collections/bridal-edit' },
        { label: '🪡 Organza Dupattas', path: '/shop' },
        { label: '✨ Raw Silk Sets', path: '/shop' },
        { label: '👑 Heirloom Sarees', path: '/collections/festive-curation' },
      ],
      socialProof: 'Silk Mark Certified • 100% Authentic Kerala Handlooms',
      rightTags: ['BRIDAL LEHENGAS', 'ORGANZA DUPATTAS', 'SILK SUITS'],
      quote: 'MADE FOR YOUR MOST SACRED MOMENTS',
    },
    {
      id: 'slide-3',
      badge: 'CONTEMPORARY MINIMALISM',
      eyebrow: 'REFINED LIVING • EVERYDAY LUXURY',
      headingLines: ['EFFORTLESS', 'MODEST', 'SILHOUETTES'],
      title: 'EFFORTLESS MODEST SILHOUETTES',
      subtitle: 'Micro-pleated co-ords and tiered dresses crafted with breathable ease and subtle gold trims for timeless elegance.',
      description: 'Micro-pleated co-ords and tiered dresses crafted with breathable ease and subtle gold trims for timeless elegance.',
      offerPill: '48-Hour Dispatch Across Kerala • 7-Day Hassle-Free Doorstep Exchanges',
      primaryCta: 'SHOP MODEST WEAR',
      primaryLink: '/collections/modest-wear',
      secondaryCta: 'VIEW LOOKBOOK',
      secondaryLink: '/lookbook',
      image: '/images/hero-banners/slide-3.jpeg',
      quickPills: [
        { label: '✨ Pleated Co-ords', path: '/collections/modest-wear' },
        { label: '🌿 Breathable Linens', path: '/shop' },
        { label: '💫 Evening Tunics', path: '/shop' },
        { label: '✨ Casual Luxury', path: '/shop' },
      ],
      socialProof: 'Rated 4.9/5 by patrons for exquisite fabric feel',
      rightTags: ['PLEATED SETS', 'MODEST TUNICS', 'FESTIVE WEAR'],
      quote: 'TIMELESS DRAPES, REFINED LIVING',
    },
  ];

  // Dynamic slides populated from Admin Context (with fallback)
  const heroSlides = activeHeroBanners.length > 0
    ? activeHeroBanners.map((b, idx) => {
        const fullTitle = b.headline || b.title || 'HANDCRAFTED MODEST & ETHNIC COUTURE';
        const headingLines = fullTitle.includes('\n') 
          ? fullTitle.split('\n').filter(Boolean)
          : [fullTitle];

        return {
          id: b.id,
          badge: b.badge || 'PERINTHALMANNA ATELIER',
          eyebrow: b.eyebrow || 'CURATED ATELIER WEAR',
          headingLines,
          title: fullTitle,
          subtitle: b.subtitle || b.description || 'Heirloom Kasavu zari, pure silk weaves, and graceful modest silhouettes.',
          description: b.subtitle || b.description || 'Heirloom Kasavu zari, pure silk weaves, and graceful modest silhouettes.',
          offerPill: b.offerPill || 'Complimentary Kerala Express Delivery > ₹2,999',
          primaryCta: b.ctaText || 'SHOP NOW',
          primaryLink: b.targetUrl || '/shop',
          secondaryCta: b.secondaryCtaText || 'AI LUXURY STYLIST',
          secondaryLink: b.secondaryTargetUrl || '/ai-assistant',
          image: b.desktopImage || `/images/hero-banners/slide-${(idx % 3) + 1}.jpeg`,
          quickPills: [
            { label: '✨ Pure Kasavu', path: '/shop' },
            { label: '👗 Modest Co-ords', path: '/collections/modest-wear' },
            { label: '🌸 Festive Anarkalis', path: '/shop' },
            { label: '👰 Bridal Edit', path: '/collections/bridal-edit' },
          ],
          socialProof: 'Over 10,000+ patrons styled across Kerala & GCC',
          rightTags: ['MODEST WEAR', 'ETHNIC COUTURE', 'FESTIVE SETS'],
          quote: 'MODESTY IS THE HIGHEST FORM OF ELEGANCE',
        };
      })
    : fallbackSlides;

  useEffect(() => {
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

  const bestSellers = productsData.slice(0, 4);

  return (
    <div className="space-y-12 sm:space-y-20">
      
      {/* 1. HIGH-CONVERSION HERO SECTION */}
      <section 
        className="relative w-full min-h-[640px] sm:min-h-[600px] lg:h-[86vh] lg:max-h-[860px] overflow-hidden bg-[#F7F1E7]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {heroSlides.map((slide, index) => {
          const isActive = currentSlide === index;

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Background Model Image with subtle zoom */}
              <img
                src={slide.image}
                alt={slide.headingLines.join(' ')}
                className="w-full h-full object-cover object-[center_20%] sm:object-[center_top] transition-transform duration-[8500ms] ease-out"
                style={{
                  transform: isActive ? 'scale(1.04)' : 'scale(1)',
                }}
              />

              {/* Multi-layered responsive gradients for maximum text legibility on all devices */}
              {/* Desktop lateral gradient */}
              <div className="absolute inset-0 hidden sm:block bg-gradient-to-r from-[#F7F1E7]/95 via-[#F7F1E7]/60 to-transparent lg:from-[#F7F1E7]/95 lg:via-[#F7F1E7]/40" />
              {/* Mobile bottom-to-top gradient for crisp readable card text */}
              <div className="absolute inset-0 sm:hidden bg-gradient-to-t from-[#F7F1E7] via-[#F7F1E7]/85 to-[#F7F1E7]/25" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#F7F1E7]/60 via-transparent to-transparent" />

              {/* Content Container */}
              <div className="max-w-7xl mx-auto h-full px-5 sm:px-6 lg:px-8 relative flex items-end sm:items-center justify-between pb-10 sm:pb-0">
                
                {/* Left High-Conversion Copy & Actions */}
                <div className="max-w-xl space-y-3 sm:space-y-4 pt-6 sm:pt-0">
                  
                  {/* Top Eyebrow & Live Trust Indicator */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#8B6335]/15 border border-[#8B6335]/30 text-[10px] sm:text-[11px] font-sans font-bold tracking-[0.18em] uppercase text-[#8B6335]">
                      <Sparkles size={11} className="text-[#A77B43]" />
                      <span>{slide.badge}</span>
                    </span>
                    <span className="hidden sm:inline-block text-[11px] font-sans font-medium text-[#746A60] tracking-wider">
                      {slide.eyebrow}
                    </span>
                  </div>

                  {/* Main High-Impact Typography Heading */}
                  <h1 className="font-serif text-3xl sm:text-5xl lg:text-[62px] text-[#2C2926] font-normal leading-[1.04] tracking-tight uppercase">
                    {slide.headingLines.map((line, lIdx) => (
                      <span key={lIdx} className="block">
                        {line}
                      </span>
                    ))}
                  </h1>

                  {/* Benefit-Driven Subtext */}
                  <p className="text-xs sm:text-sm text-[#5C5349] font-sans max-w-lg leading-relaxed line-clamp-3 sm:line-clamp-none">
                    {slide.description}
                  </p>

                  {/* Incentive / Coupon Offer Pill */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-[#DED2C1] text-[11px] font-sans text-[#3A332C] shadow-xs">
                    <Tag size={12} className="text-[#8B6335] flex-shrink-0" />
                    <span className="font-medium truncate">{slide.offerPill}</span>
                  </div>

                  {/* Dual Call-to-Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <Link
                      to={slide.primaryLink}
                      className="inline-flex items-center justify-center gap-2 bg-[#2C2926] hover:bg-[#8B6335] text-[#FCFAF6] text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-7 rounded-xl shadow-luxury transition-all duration-300 group text-center"
                    >
                      <span>{slide.primaryCta}</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>

                    {slide.secondaryLink.startsWith('http') ? (
                      <a
                        href={slide.secondaryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-white/80 hover:bg-white text-[#2C2926] border border-[#DED2C1] text-xs font-sans font-bold tracking-[0.16em] uppercase py-3.5 px-5 rounded-xl shadow-xs transition-all text-center backdrop-blur-sm"
                      >
                        <MessageSquare size={14} className="text-[#8B6335]" />
                        <span>{slide.secondaryCta}</span>
                      </a>
                    ) : (
                      <Link
                        to={slide.secondaryLink}
                        className="inline-flex items-center justify-center gap-2 bg-white/80 hover:bg-white text-[#2C2926] border border-[#DED2C1] text-xs font-sans font-bold tracking-[0.16em] uppercase py-3.5 px-5 rounded-xl shadow-xs transition-all text-center backdrop-blur-sm"
                      >
                        <Sparkles size={14} className="text-[#8B6335]" />
                        <span>{slide.secondaryCta}</span>
                      </Link>
                    )}
                  </div>

                  {/* Quick-Jump Trend Category Pills */}
                  <div className="pt-2 hidden sm:flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#746A60] whitespace-nowrap">
                      Trending:
                    </span>
                    {slide.quickPills.map(pill => (
                      <Link
                        key={pill.label}
                        to={pill.path}
                        className="px-2.5 py-1 rounded-full bg-white/70 hover:bg-white border border-[#DED2C1] text-[11px] font-sans font-medium text-[#2C2926] hover:text-[#8B6335] whitespace-nowrap transition-colors"
                      >
                        {pill.label}
                      </Link>
                    ))}
                  </div>

                  {/* Mobile & Desktop Slide Indicators */}
                  <div className="flex items-center justify-between sm:justify-start gap-6 pt-3">
                    <div className="flex items-center gap-4">
                      {heroSlides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentSlide(i)}
                          className={`text-xs font-sans tracking-widest font-semibold transition-all relative pb-1 ${
                            currentSlide === i ? 'text-[#2C2926]' : 'text-[#746A60]/50 hover:text-[#2C2926]'
                          }`}
                        >
                          0{i + 1}
                          {currentSlide === i && (
                            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#8B6335] rounded-full animate-fade-in" />
                          )}
                        </button>
                      ))}
                    </div>

                    <span className="text-[11px] font-sans text-[#746A60] italic hidden sm:inline">
                      {slide.socialProof}
                    </span>
                  </div>

                </div>

                {/* Right Column (Editorial Quote & Tags for Large Screens) */}
                <div className="hidden lg:flex flex-col items-end text-right space-y-5 max-w-xs pr-4">
                  <div className="space-y-1 text-xs font-sans tracking-[0.22em] uppercase text-[#2C2926] font-semibold">
                    {slide.rightTags.map(tag => (
                      <div key={tag}>{tag}</div>
                    ))}
                  </div>
                  <div className="w-16 h-[1.5px] bg-[#A77B43]" />
                  <div className="font-serif italic text-sm text-[#746A60] tracking-wide max-w-[190px] leading-snug">
                    {slide.quote}
                  </div>
                  <div className="pt-4 flex items-center gap-1.5 text-[11px] text-[#8B6335] font-sans font-bold">
                    <Star size={12} fill="#A77B43" className="text-[#A77B43]" />
                    <span>Kerala's Finest Handlooms</span>
                  </div>
                </div>

              </div>
            </div>
          );
        })}

        {/* Carousel Arrow Controls */}
        <div className="absolute bottom-6 right-6 z-20 hidden sm:flex items-center gap-2.5">
          <button
            onClick={() =>
              setCurrentSlide(prev => (prev === 0 ? heroSlides.length - 1 : prev - 1))
            }
            className="w-10 h-10 rounded-full bg-[#FCFAF6]/90 hover:bg-[#FCFAF6] text-[#2C2926] border border-[#DED2C1] flex items-center justify-center backdrop-blur-sm transition-all shadow-subtle hover:scale-105"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentSlide(prev => (prev + 1) % heroSlides.length)}
            className="w-10 h-10 rounded-full bg-[#FCFAF6]/90 hover:bg-[#FCFAF6] text-[#2C2926] border border-[#DED2C1] flex items-center justify-center backdrop-blur-sm transition-all shadow-subtle hover:scale-105"
            aria-label="Next Slide"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* 1.1 HIGH-CONVERSION TRUST & PROMISE STRIP */}
      <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 -mt-6 sm:-mt-10 relative z-20">
        <div className="bg-white/95 backdrop-blur-md border border-[#DED2C1] rounded-2xl p-4 sm:p-6 shadow-luxury grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-xs font-sans">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7F1E7] text-[#8B6335] flex items-center justify-center flex-shrink-0">
              <Truck size={18} />
            </div>
            <div>
              <p className="font-bold text-[#2C2926] font-serif text-sm">48-Hr Kerala Dispatch</p>
              <p className="text-[11px] text-[#746A60]">Complimentary on orders &gt; ₹2,999</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7F1E7] text-[#8B6335] flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="font-bold text-[#2C2926] font-serif text-sm">Silk Mark Certified</p>
              <p className="text-[11px] text-[#746A60]">100% genuine artisan handlooms</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7F1E7] text-[#8B6335] flex items-center justify-center flex-shrink-0">
              <RefreshCw size={18} />
            </div>
            <div>
              <p className="font-bold text-[#2C2926] font-serif text-sm">7-Day Doorstep Swaps</p>
              <p className="text-[11px] text-[#746A60]">Effortless size & style exchange</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7F1E7] text-[#8B6335] flex items-center justify-center flex-shrink-0">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="font-bold text-[#2C2926] font-serif text-sm">WhatsApp Concierge</p>
              <p className="text-[11px] text-[#746A60]">Personalized styling at 9037991774</p>
            </div>
          </div>

        </div>
      </section>

      {/* 2. SHOP BY OCCASION (5 Arched Cards) */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 border-b border-[#DED2C1]/60 pb-4">
          <div>
            <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-[#8B6335] block mb-1">
              FIND YOUR LOOK
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl text-[#2C2926] font-normal uppercase tracking-tight">
              SHOP BY OCCASION
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-sans font-bold tracking-[0.2em] text-[#2C2926] hover:text-[#8B6335] transition-colors mt-3 sm:mt-0 uppercase"
          >
            <span>EXPLORE ALL</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {occasionsData.map(item => (
            <OccasionCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* 3. EDITORIAL SPLIT BANNERS (Dynamic from Admin) */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {(activeEditorialBanners.length > 0 ? activeEditorialBanners.slice(0, 2) : [
            {
              id: 'ed-1',
              title: 'NEW ARRIVALS',
              headline: 'NEW ARRIVALS',
              subtitle: 'Fresh modest styles, handpicked for your wardrobe.',
              description: 'Fresh modest styles, handpicked for your wardrobe.',
              ctaText: 'SHOP NOW',
              targetUrl: '/shop?filter=new',
              desktopImage: '/images/editorial-banners/new-arrivals.jpeg',
              badge: 'FRESH DROPS'
            },
            {
              id: 'ed-2',
              title: 'THE ALLURA COLLECTION',
              headline: 'THE ALLURA COLLECTION',
              subtitle: 'Curated modest couture for discerning women.',
              description: 'Curated modest couture for discerning women.',
              ctaText: 'EXPLORE',
              targetUrl: '/collections/festive-curation',
              desktopImage: '/images/editorial-banners/allura-collection.jpeg',
              badge: 'SIGNATURE EDIT'
            }
          ]).map(banner => (
            <div
              key={banner.id}
              className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden group shadow-subtle border border-[#DED2C1]"
            >
              <img
                src={banner.desktopImage || '/images/editorial-banners/new-arrivals.jpeg'}
                alt={banner.headline || banner.title}
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2C2926]/90 via-[#2C2926]/40 to-transparent flex flex-col justify-end p-6 sm:p-8 text-[#FCFAF6]">
                {banner.badge && (
                  <span className="inline-block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#A77B43] mb-1">
                    {banner.badge}
                  </span>
                )}
                <h3 className="font-serif text-2xl sm:text-3xl font-medium tracking-wide text-[#FCFAF6]">
                  {banner.headline || banner.title}
                </h3>
                <p className="text-xs font-sans text-[#EFE5D5] mt-1.5 max-w-xs leading-relaxed">
                  {banner.subtitle || banner.description}
                </p>
                <div className="pt-4">
                  <Link
                    to={banner.targetUrl || '/shop'}
                    className="inline-flex items-center gap-2 bg-[#8B6335] hover:bg-[#2C2926] text-[#FCFAF6] text-[11px] font-sans font-bold tracking-[0.2em] uppercase py-2.5 px-5 rounded-xl transition-all duration-300 shadow-xs group/btn"
                  >
                    <span>{banner.ctaText || 'SHOP NOW'}</span>
                    <ArrowRight size={13} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. BEST SELLERS PRODUCT GRID */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b border-[#DED2C1]/60 pb-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-4xl text-[#2C2926] font-normal uppercase tracking-tight">
              BEST SELLERS
            </h2>
            <p className="text-xs sm:text-sm text-[#746A60] font-sans mt-0.5">
              Loved by our boutique customers
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-sans font-bold tracking-[0.2em] text-[#2C2926] hover:text-[#8B6335] transition-colors mt-3 sm:mt-0 uppercase"
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

      {/* 5. TRUST STRIP / SERVICE FEATURES */}
      <section className="border-y border-[#DED2C1] bg-[#EFE5D5]/50 py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-11 h-11 rounded-full bg-[#FCFAF6] flex items-center justify-center text-[#A77B43] shadow-xs border border-[#DED2C1]">
              <Truck size={20} />
            </div>
            <h4 className="font-serif text-sm font-semibold tracking-wider uppercase text-[#2C2926]">
              FREE SHIPPING
            </h4>
            <p className="text-xs text-[#746A60] font-sans">On orders above ₹2,999</p>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="w-11 h-11 rounded-full bg-[#FCFAF6] flex items-center justify-center text-[#A77B43] shadow-xs border border-[#DED2C1]">
              <ShieldCheck size={20} />
            </div>
            <h4 className="font-serif text-sm font-semibold tracking-wider uppercase text-[#2C2926]">
              SECURE PAYMENTS
            </h4>
            <p className="text-xs text-[#746A60] font-sans">100% safe and trusted</p>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="w-11 h-11 rounded-full bg-[#FCFAF6] flex items-center justify-center text-[#A77B43] shadow-xs border border-[#DED2C1]">
              <RefreshCw size={20} />
            </div>
            <h4 className="font-serif text-sm font-semibold tracking-wider uppercase text-[#2C2926]">
              EASY EXCHANGE
            </h4>
            <p className="text-xs text-[#746A60] font-sans">Hassle free</p>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="w-11 h-11 rounded-full bg-[#FCFAF6] flex items-center justify-center text-[#A77B43] shadow-xs border border-[#DED2C1]">
              <MessageSquare size={20} />
            </div>
            <h4 className="font-serif text-sm font-semibold tracking-wider uppercase text-[#2C2926]">
              WHATSAPP SUPPORT
            </h4>
            <p className="text-xs text-[#746A60] font-sans">+91 9037991774</p>
          </div>
        </div>
      </section>

      {/* 6. THE ALLURA EXPERIENCE */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5 relative aspect-[4/5] rounded-xl overflow-hidden shadow-luxury group border border-[#DED2C1]">
            <img
              src="/images/boutique-experience/boutique-store.jpeg"
              alt="The Allura Boutique Experience"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-[#342A25]/25 flex items-center justify-center">
              <button
                onClick={() => navigate('/about')}
                className="w-16 h-16 rounded-full bg-[#FCFAF6]/90 backdrop-blur-md text-[#2C2926] flex items-center justify-center shadow-luxury hover:scale-110 transition-transform hover:bg-[#A77B43] hover:text-[#FCFAF6]"
                aria-label="Play boutique film"
              >
                <Play size={22} className="ml-1 fill-current" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-5">
            <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-[#8B6335]">
              MORE THAN FASHION
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl text-[#2C2926] font-normal leading-tight uppercase">
              THE ALLURA EXPERIENCE
            </h2>

            <p className="text-xs sm:text-sm text-[#746A60] font-sans leading-relaxed">
              A curated destination for modern women who appreciate modesty, timeless elegance, quality and individuality. From everyday essentials to statement pieces, Allura brings you thoughtfully selected fashion for every occasion.
            </p>

            <div className="pt-2">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 bg-[#8B6335] hover:bg-[#342A25] text-[#FCFAF6] text-xs font-sans font-bold tracking-[0.25em] uppercase py-3.5 px-6 rounded-sm transition-all duration-300 shadow-xs"
              >
                <span>OUR STORY</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6 lg:border-l lg:border-[#DED2C1] lg:pl-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#EFE5D5] flex items-center justify-center text-[#8B6335] flex-shrink-0">
                <Diamond size={18} />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold tracking-wider uppercase text-[#2C2926]">
                  MODEST LUXURY
                </h4>
                <p className="text-xs text-[#746A60] font-sans mt-0.5">
                  Handcrafted styles for every you
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#EFE5D5] flex items-center justify-center text-[#8B6335] flex-shrink-0">
                <Feather size={18} />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold tracking-wider uppercase text-[#2C2926]">
                  PREMIUM FABRICS
                </h4>
                <p className="text-xs text-[#746A60] font-sans mt-0.5">
                  Pure georgette, silk & organza
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#EFE5D5] flex items-center justify-center text-[#8B6335] flex-shrink-0">
                <Heart size={18} />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold tracking-wider uppercase text-[#2C2926]">
                  MADE FOR YOUR MOMENTS
                </h4>
                <p className="text-xs text-[#746A60] font-sans mt-0.5">
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
