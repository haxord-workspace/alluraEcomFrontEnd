import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { lookbookData } from '../data/lookbook';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const LookbookPage: React.FC = () => {
  const { setQuickViewProduct, formatPrice } = useShop();
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Festive & Bridal', 'Western Luxury', 'Party Wear', 'Curated Ethnic'];

  const filteredLooks = activeCategory === 'All'
    ? lookbookData
    : lookbookData.filter(l => l.category === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Editorial Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-[11px] font-sans font-bold tracking-[0.3em] uppercase text-allura-goldDark">
          EDITORIAL FASHION EDIT
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-normal text-allura-text tracking-tight uppercase">
          THE ALLURA LOOKBOOK
        </h1>
        <p className="text-xs sm:text-sm text-allura-muted font-sans leading-relaxed">
          Explore styled silhouettes in motion. Tap the shoppable hotspots to discover each bespoke garment.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-sans font-medium whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-allura-darkBrown text-allura-card shadow-xs'
                : 'bg-allura-card text-allura-text border border-allura-border hover:border-allura-gold'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lookbook Full-Width Editorial Cards */}
      <div className="space-y-16">
        {filteredLooks.map((look, index) => (
          <div
            key={look.id}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-allura-card rounded-2xl border border-allura-border/70 p-6 sm:p-8 shadow-subtle overflow-hidden"
          >
            {/* Image with Interactive Hotspots */}
            <div className={`lg:col-span-7 relative aspect-[4/5] rounded-xl overflow-hidden bg-allura-bgSecondary shadow-sm ${
              index % 2 === 1 ? 'lg:order-2' : ''
            }`}>
              <img
                src={look.image}
                alt={look.title}
                className="w-full h-full object-cover object-top"
              />

              {/* Hotspots */}
              {look.hotspots.map((spot, sIdx) => (
                <div
                  key={sIdx}
                  className="absolute z-20 group"
                  style={{ top: `${spot.y}%`, left: `${spot.x}%` }}
                >
                  <button
                    onClick={() => setQuickViewProduct(spot.product)}
                    className="w-7 h-7 rounded-full bg-allura-gold text-allura-card flex items-center justify-center shadow-luxury ring-4 ring-white/60 animate-pulse group-hover:scale-125 transition-transform"
                    aria-label={`Shop ${spot.product.name}`}
                  >
                    <ShoppingBag size={12} />
                  </button>

                  {/* Tooltip on hover */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col bg-allura-darkBrown text-allura-card p-2.5 rounded shadow-luxury whitespace-nowrap text-xs z-30 pointer-events-none">
                    <span className="font-serif font-medium">{spot.product.name}</span>
                    <span className="text-[10px] text-allura-gold">{formatPrice(spot.product.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Look Details & Shoppable Card */}
            <div className={`lg:col-span-5 space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
              <div className="space-y-2">
                <span className="text-[10px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
                  LOOK 0{index + 1} • {look.category}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-allura-text font-medium uppercase">
                  {look.title}
                </h2>
                <p className="font-sans text-xs text-allura-muted italic">
                  "{look.subtitle}"
                </p>
              </div>

              {/* Styled Product Quick Card */}
              {look.hotspots.map((spot, sIdx) => (
                <div
                  key={sIdx}
                  className="flex items-center gap-4 p-4 rounded-xl border border-allura-border bg-allura-bg"
                >
                  <img
                    src={spot.product.images.primary}
                    alt={spot.product.name}
                    className="w-16 h-20 object-cover object-top rounded bg-allura-bgSecondary"
                  />
                  <div className="flex-1">
                    <h4 className="font-serif text-sm font-semibold text-allura-text">
                      {spot.product.name}
                    </h4>
                    <p className="font-serif text-xs font-bold text-allura-darkBrown mt-0.5">
                      {formatPrice(spot.product.price)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setQuickViewProduct(spot.product)}
                        className="text-[10px] font-sans font-bold text-allura-goldDark uppercase tracking-wider hover:underline"
                      >
                        Quick View
                      </button>
                      <span>•</span>
                      <Link
                        to={`/product/${spot.product.slug}`}
                        className="text-[10px] font-sans font-bold text-allura-darkBrown uppercase tracking-wider hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>Full Details</span>
                        <ArrowRight size={10} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
