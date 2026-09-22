import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import type { Product } from '../../types';

export const SearchModal: React.FC = () => {
  const { products, isSearchOpen, setIsSearchOpen, formatPrice } = useShop();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const popularTags = [
    'Anarkali Sets',
    'Bridal Lehengas',
    'Modest Co-ords',
    'Festive Silk',
    'Embroidered Dresses',
    'Chanderi Kurtas',
    'Organza Dupattas',
  ];

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const filtered = products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.occasion.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.colors.some(c => c.name.toLowerCase().includes(q))
    );
    setResults(filtered);
  }, [query, products]);

  if (!isSearchOpen) return null;

  const handleSelectProduct = (slug: string) => {
    setIsSearchOpen(false);
    navigate(`/product/${slug}`);
  };

  const handleSearchTag = (tag: string) => {
    setQuery(tag);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-allura-card/98 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Top Search Bar */}
      <div className="border-b border-allura-border sticky top-0 bg-allura-card z-10 px-6 py-5 max-w-4xl w-full mx-auto flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3 bg-allura-bgSecondary/50 border border-allura-border rounded-full px-5 py-3">
          <Search size={20} className="text-allura-gold flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search dresses, sets, ethnic wear, occasions..."
            className="w-full bg-transparent text-allura-text placeholder:text-allura-muted text-sm sm:text-base focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-allura-muted hover:text-allura-text"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          onClick={() => setIsSearchOpen(false)}
          className="p-2.5 text-allura-muted hover:text-allura-text hover:bg-allura-bgSecondary rounded-full transition-colors flex-shrink-0"
          aria-label="Close search modal"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content Container */}
      <div className="max-w-4xl w-full mx-auto px-6 py-8 flex-1">
        {query.trim().length === 0 ? (
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 text-allura-goldDark text-xs font-sans font-bold tracking-[0.2em] uppercase mb-4">
                <TrendingUp size={15} />
                <span>POPULAR SEARCHES</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {popularTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleSearchTag(tag)}
                    className="px-4 py-2 rounded-full border border-allura-border bg-allura-bg hover:border-allura-gold hover:bg-allura-bgSecondary text-xs font-sans text-allura-text transition-all duration-200"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-allura-goldDark text-xs font-sans font-bold tracking-[0.2em] uppercase mb-4">
                <Sparkles size={15} />
                <span>EXPLORE BY OCCASION</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: 'Bridal Edit', to: '/collections/bridal-edit' },
                  { name: 'Festive Wear', to: '/collections/festive-edit' },
                  { name: 'Party Silhouettes', to: '/collections/party-wear' },
                  { name: 'Modest Elegance', to: '/collections/modest-wear' },
                ].map(item => (
                  <button
                    key={item.name}
                    onClick={() => {
                      setIsSearchOpen(false);
                      navigate(item.to);
                    }}
                    className="p-3.5 rounded-lg border border-allura-border/80 bg-allura-bg/50 hover:bg-allura-bgSecondary text-left transition-colors flex items-center justify-between"
                  >
                    <span className="font-serif text-sm font-medium text-allura-text">{item.name}</span>
                    <ArrowRight size={14} className="text-allura-muted" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-allura-border/60">
              <span className="text-xs font-sans text-allura-muted tracking-wider uppercase">
                {results.length} RESULTS FOUND FOR "{query}"
              </span>
            </div>

            {results.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <h4 className="font-serif text-xl text-allura-text font-medium">
                  No matching boutique pieces found
                </h4>
                <p className="text-xs text-allura-muted max-w-sm mx-auto">
                  Try searching for keywords like "Anarkali", "Lehenga", "Co-ord", "Festive", or "Velvet".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {results.map(product => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product.slug)}
                    className="cursor-pointer group rounded-lg overflow-hidden border border-allura-border/60 bg-allura-card hover:shadow-subtle transition-all duration-300"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-allura-bgSecondary relative">
                      <img
                        src={product.images.primary}
                        alt={product.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-2 left-2 bg-allura-darkBrown/80 backdrop-blur-sm text-allura-card text-[9px] font-sans font-semibold tracking-wider uppercase px-2 py-0.5 rounded-sm">
                        {product.occasion}
                      </span>
                    </div>
                    <div className="p-3">
                      <h5 className="font-serif text-sm font-medium text-allura-text group-hover:text-allura-goldDark transition-colors line-clamp-1">
                        {product.name}
                      </h5>
                      <p className="font-serif text-xs font-semibold text-allura-text mt-1">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
