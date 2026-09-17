import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Play, Truck, ShieldCheck, RefreshCw, MessageSquare, Diamond, Feather, Heart } from 'lucide-react';
import { occasionsData } from '../data/occasions';
import { productsData } from '../data/products';
import { ProductCard } from '../components/ui/ProductCard';
import { OccasionCard } from '../components/ui/OccasionCard';
import { AlluraCircleSection } from '../components/ui/AlluraCircleSection';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    {
      id: 'slide-1',
      eyebrow: 'MODEST LUXURY • ETHNIC • CURATED WEAR',
      headingLines: ['STYLE', 'FOR EVERY', 'OCCASION'],
      description: 'Graceful silhouettes. Timeless modest elegance. Curated just for you.',
      cta: 'SHOP COLLECTION',
      link: '/shop',
      image: '/images/hero-banners/slide-1.jpeg',
      rightTags: ['MODEST WEAR', 'ETHNIC', 'FESTIVE'],
      quote: 'MODESTY IS THE HIGHEST FORM OF ELEGANCE',
    },
    {
      id: 'slide-2',
      eyebrow: 'ROYAL BRIDAL & FESTIVE COUTURE',
      headingLines: ['BESPOKE', 'ZARDOZI &', 'SILK WEAVES'],
      description: 'Heritage crimson lehengas and heirloom sarees crafted for your big day.',
      cta: 'EXPLORE BRIDAL',
      link: '/collections/bridal-edit',
      image: '/images/hero-banners/slide-2.jpeg',
      rightTags: ['BRIDAL LEHENGAS', 'ORGANZA DUPATTAS', 'SILK SUITS'],
      quote: 'MADE FOR YOUR MOST SACRED MOMENTS',
    },
    {
      id: 'slide-3',
      eyebrow: 'CONTEMPORARY MODEST ELEGANCE',
      headingLines: ['EFFORTLESS', 'MODEST', 'SILHOUETTES'],
      description: 'Micro-pleated modest co-ords and tiered dresses for refined ease.',
      cta: 'DISCOVER MODEST WEAR',
      link: '/collections/modest-wear',
      image: '/images/hero-banners/slide-3.jpeg',
      rightTags: ['PLEATED SETS', 'MODEST TUNICS', 'FESTIVE WEAR'],
      quote: 'TIMELESS DRAPES, REFINED LIVING',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const bestSellers = productsData.slice(0, 4);

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* 1. HERO SECTION matching ChatGPT Reference Image */}
      <section className="relative w-full h-[82vh] min-h-[560px] max-h-[820px] overflow-hidden bg-[#F7F1E7]">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              currentSlide === index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Background Model Image with warm tone */}
            <img
              src={slide.image}
              alt={slide.headingLines.join(' ')}
              className="w-full h-full object-cover object-[center_top] scale-100 transition-transform duration-[8000ms] ease-out"
              style={{
                transform: currentSlide === index ? 'scale(1.03)' : 'scale(1)',
              }}
            />
            {/* Soft Warm Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#F7F1E7]/92 via-[#F7F1E7]/50 to-transparent lg:from-[#F7F1E7]/90 lg:via-[#F7F1E7]/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#F7F1E7]/70 via-transparent to-transparent" />

            {/* Content Container */}
            <div className="max-w-7xl mx-auto h-full px-6 lg:px-8 relative flex items-center justify-between">
              {/* Left Editorial Copy */}
              <div className="max-w-xl space-y-4 sm:space-y-5 pt-8 sm:pt-0">
                <span className="inline-block text-[11px] sm:text-xs font-sans font-bold tracking-[0.25em] uppercase text-[#8B6335]">
                  {slide.eyebrow}
                </span>

                {/* Big Serif Heading stacked */}
                <h1 className="font-serif text-4xl sm:text-6xl lg:text-[68px] text-[#2C2926] font-normal leading-[1.02] tracking-tight uppercase">
                  {slide.headingLines.map((line, lIdx) => (
                    <span key={lIdx} className="block">
                      {line}
                    </span>
                  ))}
                </h1>

                <p className="text-xs sm:text-sm text-[#746A60] font-sans max-w-md leading-relaxed pt-1">
                  {slide.description}
                </p>

                <div className="pt-2">
                  <Link
                    to={slide.link}
                    className="inline-flex items-center gap-2.5 bg-[#8B6335] hover:bg-[#342A25] text-[#FCFAF6] text-xs font-sans font-bold tracking-[0.22em] uppercase py-3.5 px-6 rounded-sm shadow-luxury transition-all duration-300 group"
                  >
                    <span>{slide.cta}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Numbered Indicators */}
                <div className="flex items-center gap-6 pt-6">
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
              </div>

              {/* Right Column (Editorial Column matching Reference Image) */}
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
              </div>
            </div>
          </div>
        ))}

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

      {/* 3. EDITORIAL SPLIT BANNERS */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Banner 1: New Arrivals */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-lg overflow-hidden group shadow-subtle border border-[#DED2C1]">
            <img
              src="/images/editorial-banners/new-arrivals.jpeg"
              alt="New Arrivals"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#342A25]/90 via-[#342A25]/30 to-transparent flex flex-col justify-end p-6 sm:p-8 text-[#FCFAF6]">
              <h3 className="font-serif text-2xl sm:text-3xl font-medium tracking-wide">
                NEW ARRIVALS
              </h3>
              <p className="text-xs font-sans text-[#EFE5D5] mt-1.5 max-w-xs">
                Fresh modest styles, handpicked for your wardrobe.
              </p>
              <div className="pt-4">
                <Link
                  to="/shop?filter=new"
                  className="inline-flex items-center gap-2 bg-[#8B6335] hover:bg-[#342A25] text-[#FCFAF6] text-[11px] font-sans font-bold tracking-[0.2em] uppercase py-2.5 px-5 rounded-sm transition-all duration-300"
                >
                  <span>SHOP NOW</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* Banner 2: The Allura Collection */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-lg overflow-hidden group shadow-subtle border border-[#DED2C1]">
            <img
              src="/images/editorial-banners/allura-collection.jpeg"
              alt="The Allura Collection"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#342A25]/90 via-[#342A25]/30 to-transparent flex flex-col justify-end p-6 sm:p-8 text-[#FCFAF6]">
              <h3 className="font-serif text-2xl sm:text-3xl font-medium tracking-wide">
                THE ALLURA COLLECTION
              </h3>
              <p className="text-xs font-sans text-[#EFE5D5] mt-1.5 max-w-xs">
                Curated modest couture for discerning women.
              </p>
              <div className="pt-4">
                <Link
                  to="/collections/festive-edit"
                  className="inline-flex items-center gap-2 bg-[#8B6335] hover:bg-[#342A25] text-[#FCFAF6] text-[11px] font-sans font-bold tracking-[0.2em] uppercase py-2.5 px-5 rounded-sm transition-all duration-300"
                >
                  <span>EXPLORE</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
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
