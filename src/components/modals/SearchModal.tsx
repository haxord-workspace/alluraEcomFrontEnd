import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, TrendingUp, Loader2, Layers, RotateCcw } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { searchProducts, isRequestCanceled, getStoreCollections, type StoreCollection } from '../../service/store';
import type { Product } from '../../types';

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_LIMIT = 10;
const MIN_QUERY_LENGTH = 2;
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 30;

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

interface SearchResultCardProps {
  product: Product;
  priceLabel: string;
  onSelect: (slug: string) => void;
}

// Memoised so typing (which re-renders the modal) doesn't re-render every result card
const SearchResultCard = React.memo(function SearchResultCard({ product, priceLabel, onSelect }: SearchResultCardProps) {
  return (
    <div
      onClick={() => onSelect(product.slug)}
      className="cursor-pointer group rounded-lg overflow-hidden border border-allura-border/60 bg-allura-card hover:shadow-subtle transition-all duration-300"
    >
      <div className="aspect-[4/5] overflow-hidden bg-allura-bgSecondary relative">
        <img
          src={product.images.primary}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
        />
        {product.occasion && (
          <span className="absolute top-2 left-2 bg-allura-darkBrown/80 backdrop-blur-sm text-allura-card text-[9px] font-sans font-semibold tracking-wider uppercase px-2 py-0.5 rounded-sm">
            {product.occasion}
          </span>
        )}
      </div>
      <div className="p-3">
        <h5 className="font-serif text-sm font-medium text-allura-text group-hover:text-allura-goldDark transition-colors line-clamp-1">
          {product.name}
        </h5>
        <p className="font-serif text-xs font-semibold text-allura-text mt-1">{priceLabel}</p>
      </div>
    </div>
  );
});

const SearchResultSkeleton: React.FC = () => (
  <>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-lg overflow-hidden border border-allura-border/60 bg-allura-card animate-pulse">
        <div className="aspect-[4/5] bg-allura-bgSecondary" />
        <div className="p-3 space-y-2">
          <div className="h-3 w-3/4 rounded bg-allura-bgSecondary" />
          <div className="h-3 w-1/3 rounded bg-allura-bgSecondary" />
        </div>
      </div>
    ))}
  </>
);

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, formatPrice, categories } = useShop();
  const [query, setQuery] = useState('');
  // Results + the exact query they belong to; the empty state is only valid when these match
  const [results, setResults] = useState<Product[]>([]);
  const [resultsQuery, setResultsQuery] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorQuery, setErrorQuery] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [storeCollections, setStoreCollections] = useState<StoreCollection[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  // Short-lived per-query cache: re-typing or reopening the modal doesn't hit the API again
  const cacheRef = useRef(new Map<string, { products: Product[]; at: number }>());
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    getStoreCollections()
      .then(cols => {
        if (active && Array.isArray(cols) && cols.length > 0) {
          setStoreCollections(cols);
        }
      })
      .catch(err => {
        console.warn('Failed to load collections in SearchModal:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Real collections from the store API only (no static fallback)
  const collectionList = useMemo(
    () =>
      storeCollections
        .filter(c => c.name || (c as any).title)
        .map(c => ({
          name: c.name || (c as any).title,
          to: c.slug ? `/collections/${c.slug}` : `/shop?collection=${encodeURIComponent(c.name)}`,
        })),
    [storeCollections]
  );

  // Quick-search tags come from the live store categories
  const popularTags = useMemo(
    () =>
      Array.from(
        new Set(
          categories
            .filter(c => !c.status || String(c.status).toUpperCase() === 'ACTIVE')
            .map(c => c.name?.trim())
            .filter((name): name is string => !!name)
        )
      ).slice(0, 10),
    [categories]
  );

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  const trimmedQuery = query.trim();
  const cacheKey = trimmedQuery.toLowerCase();
  const isSearchable = trimmedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!isSearchable) {
      setStatus('idle');
      setErrorMessage(null);
      return;
    }

    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setResults(cached.products);
      setResultsQuery(trimmedQuery);
      setStatus('success');
      setErrorMessage(null);
      return;
    }

    // Loading starts as soon as the query changes (before the debounce), and previous
    // results stay on screen, so "No matching..." can never flash while we wait.
    setStatus('loading');
    setErrorMessage(null);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await searchProducts({ q: trimmedQuery, page: 1, limit: SEARCH_LIMIT }, undefined, controller.signal);
        if (controller.signal.aborted) return; // a newer query owns the state now
        const products = res.products || [];
        const cache = cacheRef.current;
        cache.set(cacheKey, { products, at: Date.now() });
        if (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
        setResults(products);
        setResultsQuery(trimmedQuery);
        setStatus('success');
      } catch (err: any) {
        if (controller.signal.aborted || isRequestCanceled(err)) return;
        console.warn('Product search failed:', err);
        setErrorMessage(err?.response?.data?.message || 'We couldn’t complete your search. Please try again.');
        setErrorQuery(cacheKey);
        setStatus('error');
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort(); // cancel the stale request when the user keeps typing / closes the modal
    };
  }, [cacheKey, trimmedQuery, isSearchable, retryToken]);

  const handleSelectProduct = useCallback(
    (slug: string) => {
      setIsSearchOpen(false);
      navigate(`/product/${slug}`);
    },
    [setIsSearchOpen, navigate]
  );

  if (!isSearchOpen) return null;

  const handleSearchTag = (tag: string) => {
    setQuery(tag);
  };

  const handleRetry = () => {
    cacheRef.current.delete(cacheKey);
    setRetryToken(t => t + 1);
  };

  // Status is only trusted when it belongs to the query currently in the input; anything not yet
  // answered for this query counts as loading (covers the first render before the effect runs).
  const isCurrentSuccess = status === 'success' && resultsQuery.toLowerCase() === cacheKey;
  const isCurrentError = status === 'error' && errorQuery === cacheKey;
  const isLoading = isSearchable && !isCurrentSuccess && !isCurrentError;
  const showEmptyState = isCurrentSuccess && results.length === 0;
  // While loading a new query, keep showing the previous results (dimmed) instead of an empty list
  const visibleResults = isLoading || isCurrentSuccess ? results : [];

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
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-allura-gold flex-shrink-0" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-allura-muted hover:text-allura-text"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          ) : null}
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
        {!isSearchable ? (
          <div className="space-y-8">
            {trimmedQuery.length > 0 && (
              <p className="text-xs font-sans text-allura-muted">
                Keep typing — enter at least {MIN_QUERY_LENGTH} characters to search.
              </p>
            )}
            {popularTags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-allura-goldDark text-xs font-sans font-bold tracking-[0.2em] uppercase mb-4">
                  <TrendingUp size={15} />
                  <span>POPULAR CATEGORY</span>
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
            )}

            {collectionList.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-allura-goldDark text-xs font-sans font-bold tracking-[0.2em] uppercase mb-4">
                  <Layers size={15} />
                  <span>EXPLORE BY COLLECTION</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {collectionList.map(item => (
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
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-allura-border/60">
              <span className="text-xs font-sans text-allura-muted tracking-wider uppercase" aria-live="polite">
                {isLoading
                  ? `SEARCHING FOR "${trimmedQuery}"…`
                  : isCurrentError
                    ? `SEARCH FAILED FOR "${trimmedQuery}"`
                    : `${results.length} RESULTS FOUND FOR "${trimmedQuery}"`}
              </span>
            </div>

            {isCurrentError ? (
              <div className="py-16 text-center space-y-4">
                <p className="text-sm text-red-600 font-sans">{errorMessage}</p>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 bg-allura-goldDark text-allura-card text-xs font-sans font-bold tracking-[0.2em] uppercase py-2.5 px-5 rounded-sm"
                >
                  <RotateCcw size={14} />
                  <span>RETRY</span>
                </button>
              </div>
            ) : showEmptyState ? (
              <div className="py-16 text-center space-y-3">
                <h4 className="font-serif text-xl text-allura-text font-medium">
                  No matching boutique pieces found
                </h4>
                <p className="text-xs text-allura-muted max-w-sm mx-auto">
                  Try a different keyword or check the spelling.
                </p>
              </div>
            ) : (
              <div
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 transition-opacity duration-200 ${isLoading && visibleResults.length > 0 ? 'opacity-60' : 'opacity-100'
                  }`}
                aria-busy={isLoading}
              >
                {isLoading && visibleResults.length === 0 ? (
                  <SearchResultSkeleton />
                ) : (
                  visibleResults.map(product => (
                    <SearchResultCard
                      key={product.id}
                      product={product}
                      priceLabel={formatPrice(product.price)}
                      onSelect={handleSelectProduct}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
