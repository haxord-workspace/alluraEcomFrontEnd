import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, ArrowUpDown, Check, RotateCcw, Sparkles, ArrowRight, ChevronDown } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAdmin } from '../context/AdminContext';
import { ProductCard } from '../components/ui/ProductCard';
import { ProductCardSkeleton } from '../components/ui/ProductCardSkeleton';
import { BottomSheet } from '../components/modals/BottomSheet';
import {
  searchProducts,
  buildProductQuery,
  isRequestCanceled,
  getStoreCollections,
  type ProductSearchParams,
  type ProductSearchPagination,
  type StoreCollection,
} from '../service/store';
import { collectionsData } from '../data/collections';
import type { Product } from '../types';

type SortOptionValue = 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: { label: string; value: 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'rating' }[] = [
  { label: 'Featured Curations', value: 'featured' },
  { label: 'New Arrivals', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Customer Rating', value: 'rating' },
];

// TODO(backend): sort values must match the Swagger enum for GET /products/search `sort`.
// Unchanged from before; verify once the exact enum is confirmed.
const getBackendSortValue = (sort: string): string => {
  if (sort === 'price_asc' || sort === 'price-asc') return 'price_asc';
  if (sort === 'price_desc' || sort === 'price-desc') return 'price_desc';
  if (sort === 'newest') return 'newest';
  if (sort === 'rating') return 'popularity';
  return 'featured';
};

// TODO(backend): availability value must match the Swagger enum for `availability`. Unchanged from before.
const IN_STOCK_AVAILABILITY = 'IN_STOCK';

const PAGE_SIZE = 8;
const PRICE_MIN = 3000;
const PRICE_MAX = 25000; // slider max = "no price limit"
const PRICE_DEBOUNCE_MS = 400;
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SORT_VALUES = new Set<string>(['featured', 'newest', 'price_asc', 'price_desc', 'rating', 'price-asc', 'price-desc']);

const parseSizesParam = (raw: string | null): string[] =>
  (raw || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter((s, i, all) => SIZE_OPTIONS.includes(s) && all.indexOf(s) === i);

const parseMaxPriceParam = (raw: string | null): number => {
  const n = raw === null || raw.trim() === '' ? NaN : Number(raw);
  if (!Number.isFinite(n)) return PRICE_MAX;
  return Math.min(PRICE_MAX, Math.max(PRICE_MIN, n));
};

export const ShopPage: React.FC = () => {
  const { categories, isLoadingProducts } = useShop();
  const { banners } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const catParam = searchParams.get('category');
  const colParam = searchParams.get('collection');
  const qParam = searchParams.get('q') || searchParams.get('search');
  // TODO(backend): `?occasion=` and colour filtering are not supported by GET /products/search,
  // so they are intentionally not applied until the backend adds query params for them.

  // Size, max price and sort live in the URL (written with replace, so no history spam)
  const sizesParam = searchParams.get('sizes') || searchParams.get('size');
  const selectedSizes = useMemo(() => parseSizesParam(sizesParam), [sizesParam]);
  const maxPrice = parseMaxPriceParam(searchParams.get('maxPrice'));
  const sortParam = searchParams.get('sort');
  const defaultSort: SortOptionValue = filterParam === 'new' ? 'newest' : 'featured';
  const sortBy: SortOptionValue =
    sortParam && SORT_VALUES.has(sortParam) ? (sortParam as SortOptionValue) : defaultSort;

  const updateUrlParams = useCallback(
    (changes: Record<string, string | null>) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([key, value]) => {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          });
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setSortBy = useCallback(
    (value: SortOptionValue) => updateUrlParams({ sort: value === defaultSort ? null : value }),
    [updateUrlParams, defaultSort]
  );

  // Slider moves instantly; the URL (and therefore the request) is updated after a 400ms pause
  const [priceDraft, setPriceDraft] = useState<number>(maxPrice);
  useEffect(() => {
    setPriceDraft(maxPrice);
  }, [maxPrice]);
  useEffect(() => {
    if (priceDraft === maxPrice) return;
    const timer = setTimeout(() => {
      updateUrlParams({ maxPrice: priceDraft >= PRICE_MAX ? null : String(priceDraft) });
    }, PRICE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [priceDraft, maxPrice, updateUrlParams]);

  const [selectedCategory, setSelectedCategory] = useState<string>(catParam || 'All');
  const [selectedCollection, setSelectedCollection] = useState<string>(colParam || 'All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [storeCollections, setStoreCollections] = useState<StoreCollection[]>([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getStoreCollections()
      .then(cols => {
        if (active && Array.isArray(cols) && cols.length > 0) {
          setStoreCollections(cols);
        }
      })
      .catch(err => {
        console.warn('Failed to load store collections for filter:', err);
      })
      .finally(() => {
        if (active) setCollectionsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const collectionOptions = useMemo(() => {
    if (storeCollections && storeCollections.length > 0) {
      return [
        { id: 'all', name: 'All', slug: 'all' },
        ...storeCollections.map(c => ({
          id: c.id,
          name: c.name || (c as any).title || 'Collection',
          slug: c.slug || c.id,
        })),
      ];
    }
    return [
      { id: 'all', name: 'All', slug: 'all' },
      ...collectionsData.map(c => ({
        id: c.id,
        name: c.title,
        slug: c.slug,
      })),
    ];
  }, [storeCollections]);

  const selectedCollectionId = useMemo(() => {
    if (!selectedCollection || selectedCollection === 'All' || selectedCollection === 'all') {
      return undefined;
    }
    const found = collectionOptions.find(
      c =>
        c.name.toLowerCase() === selectedCollection.toLowerCase() ||
        c.id.toLowerCase() === selectedCollection.toLowerCase() ||
        c.slug.toLowerCase() === selectedCollection.toLowerCase()
    );
    // Local fallback collections (e.g. "col-festive") are not backend IDs, so never send them as collectionId
    if (storeCollections.length === 0) return undefined;
    return found && found.id !== 'all' ? found.id : undefined;
  }, [selectedCollection, collectionOptions, storeCollections.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSortOption = useMemo(() => {
    const normalized = getBackendSortValue(sortBy);
    return SORT_OPTIONS.find(opt => opt.value === sortBy || opt.value === normalized) || SORT_OPTIONS[0];
  }, [sortBy]);

  // Paginated products state (infinite scroll, server-side pagination)
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [meta, setMeta] = useState<ProductSearchPagination>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
    hasNextPage: true,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // The single in-flight request; aborted whenever the query changes so stale responses never land
  const requestRef = useRef<AbortController | null>(null);
  const pageRef = useRef(1);

  // Category map for resolving category names from IDs
  const categoryMap = useMemo(() => {
    return categories.reduce<Record<string, string>>((acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    }, {});
  }, [categories]);

  const selectedCategoryId = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'All') return undefined;
    const found = categories.find(
      c => c.name.toLowerCase() === selectedCategory.toLowerCase() || c.id === selectedCategory
    );
    return found ? found.id : undefined;
  }, [selectedCategory, categories]);

  // Wait until a category/collection name from the URL can be resolved to its backend ID,
  // otherwise we'd fire one unfiltered request first and then a second filtered one.
  const isCategoryPending = selectedCategory !== 'All' && categories.length === 0 && isLoadingProducts;
  const isCollectionPending =
    selectedCollection !== 'All' && selectedCollection !== 'all' && !collectionsLoaded;
  const isQueryReady = !isCategoryPending && !isCollectionPending;

  // All filters that the backend supports, using the exact Swagger param names
  const queryParams = useMemo<ProductSearchParams>(
    () => ({
      limit: PAGE_SIZE,
      sort: getBackendSortValue(sortBy),
      q: qParam || undefined,
      categoryId: selectedCategoryId,
      collectionId: selectedCollectionId,
      maxPrice: maxPrice < PRICE_MAX ? maxPrice : undefined,
      sizes: selectedSizes,
      availability: inStockOnly ? IN_STOCK_AVAILABILITY : undefined,
      bestSeller: filterParam === 'bestseller' ? true : undefined,
      newArrival: filterParam === 'new' ? true : undefined,
    }),
    [sortBy, qParam, selectedCategoryId, selectedCollectionId, maxPrice, selectedSizes, inStockOnly, filterParam]
  );
  // Stable string key: identical queries never trigger a second request
  const queryKey = useMemo(() => JSON.stringify(buildProductQuery(queryParams)), [queryParams]);
  const queryParamsRef = useRef(queryParams);
  queryParamsRef.current = queryParams;

  const loadPage = useCallback(async (pageNum: number) => {
    const append = pageNum > 1;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (append) {
      setIsLoadingMore(true);
      setLoadMoreError(null);
    } else {
      setIsLoading(true);
      setInitialError(null);
      setLoadMoreError(null);
    }

    try {
      const res = await searchProducts({ ...queryParamsRef.current, page: pageNum }, undefined, controller.signal);
      if (controller.signal.aborted) return;

      const items = res.products || [];
      const pagination = res.pagination;
      if (append) {
        setProductsList(prev => {
          const seen = new Set(prev.map(p => p.id));
          return [...prev, ...items.filter(p => !seen.has(p.id))];
        });
      } else {
        setProductsList(items);
      }

      pageRef.current = pageNum;
      setMeta(pagination);

      const reachedEnd =
        pagination.hasNextPage === false ||
        items.length === 0 ||
        items.length < PAGE_SIZE ||
        (pagination.totalPages ? pageNum >= pagination.totalPages : false) ||
        (pagination.total ? pageNum * PAGE_SIZE >= pagination.total : false);
      setHasMore(!reachedEnd);
    } catch (err: any) {
      if (controller.signal.aborted || isRequestCanceled(err)) return;
      const message = err?.response?.data?.message || err?.message || 'Failed to load products';
      if (append) {
        console.error('Failed to load more products:', err);
        setLoadMoreError(message);
      } else {
        console.error('Failed to load initial products:', err);
        setInitialError(message);
        setProductsList([]);
        setHasMore(false);
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, []);

  const fetchInitialProducts = useCallback(() => loadPage(1), [loadPage]);

  const fetchNextProducts = useCallback(() => {
    if (requestRef.current || !hasMore || isLoading || isLoadingMore) return;
    loadPage(pageRef.current + 1);
  }, [hasMore, isLoading, isLoadingMore, loadPage]);

  // Reset to page 1 and fetch whenever the actual backend query changes
  useEffect(() => {
    if (!isQueryReady) return;
    pageRef.current = 1;
    loadPage(1);
  }, [queryKey, isQueryReady, loadPage]);

  // Abort any in-flight request when leaving the page
  useEffect(() => () => requestRef.current?.abort(), []);

  // IntersectionObserver to auto-fetch next batch when near bottom
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        const [first] = entries;
        if (first.isIntersecting && hasMore && !isLoading && !isLoadingMore && !requestRef.current) {
          fetchNextProducts();
        }
      },
      {
        root: null,
        rootMargin: '250px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, fetchNextProducts]);

  // Scroll listener fallback for rapid window scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore || isLoading || isLoadingMore || requestRef.current) return;
      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 400;
      if (scrollPosition >= threshold) {
        fetchNextProducts();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, isLoadingMore, fetchNextProducts]);

  const activeShopBanner = useMemo(() => {
    const activeBanners = (banners || []).filter(
      b => (b.status?.toLowerCase() === 'active' || b.status === 'Active' || (b as any).isActive === true) &&
           Boolean(b.desktopImage)
    );

    if (selectedCategory && selectedCategory !== 'All') {
      const catBanner = activeBanners.find(
        b => b.placement === 'CATEGORY_BANNER' && 
             (b.title?.toLowerCase().includes(selectedCategory.toLowerCase()) || 
              b.headline?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
              b.targetUrl?.toLowerCase().includes(encodeURIComponent(selectedCategory.toLowerCase())))
      );
      if (catBanner) return catBanner;
    }

    return activeBanners.find(b => b.placement === 'SHOP_BANNER' || b.placement === 'CATEGORY_BANNER');
  }, [banners, selectedCategory]);

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);

  useEffect(() => {
    if (catParam) setSelectedCategory(catParam);
    if (colParam) setSelectedCollection(colParam);
  }, [catParam, colParam]);

  const categoryOptions = ['All', ...categories.map(c => c.name)];
  const sizes = SIZE_OPTIONS;
  // TODO(backend): colour filter UI is hidden because GET /products/search has no colour param.
  // Re-enable once the backend supports e.g. `colors=Ivory,Rose`.

  const handleSizeToggle = (size: string) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter(s => s !== size)
      : [...selectedSizes, size];
    updateUrlParams({ sizes: next.length > 0 ? next.join(',') : null, size: null });
  };

  const resetFilters = () => {
    setSelectedCategory('All');
    setSelectedCollection('All');
    setPriceDraft(PRICE_MAX);
    setInStockOnly(false);
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    (selectedCollection !== 'All' && selectedCollection !== 'all') ||
    selectedSizes.length > 0 ||
    maxPrice < PRICE_MAX ||
    inStockOnly;

  // Results come filtered & paginated from the server; only fill in category names
  // when the search response returned bare category IDs.
  const displayProducts = useMemo(
    () =>
      productsList.map(p =>
        !p.category && p.categoryId && categoryMap[p.categoryId]
          ? { ...p, category: categoryMap[p.categoryId] }
          : p
      ),
    [productsList, categoryMap]
  );
  const totalCount = meta.total || displayProducts.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 sm:py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-3 sm:mb-12">
        <span className="text-[10px] sm:text-[11px] font-sans font-bold tracking-[0.28em] uppercase text-allura-goldDark block mb-1 sm:mb-2">
          THE ALLURA EDIT
        </span>
        <h1 className="font-serif text-2xl sm:text-5xl text-allura-text font-normal tracking-tight uppercase">
          SHOP ALL
        </h1>
        <p className="hidden sm:block text-sm text-allura-muted font-sans mt-2">
          Handcrafted ethnic silhouettes, contemporary modest co-ords and bespoke festive wear.
        </p>
      </div>

      {/* Horizontal Category Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-3 sm:pb-3 sm:mb-8 sm:border-b sm:border-allura-border/60">
        {categoryOptions.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-sans font-medium whitespace-nowrap transition-all duration-200 ${
              selectedCategory === cat
                ? 'bg-allura-darkBrown text-allura-card border border-allura-darkBrown shadow-xs'
                : 'bg-allura-card text-allura-text border border-allura-border hover:border-allura-gold'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Mobile Top Filter & Sort Bar */}
      <div className="lg:hidden flex items-center justify-between gap-2 mb-4">
        <button
          onClick={() => setIsFilterSheetOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 text-xs font-sans font-bold text-allura-text py-2.5 rounded-lg border border-allura-border bg-allura-card uppercase tracking-wider"
        >
          <SlidersHorizontal size={14} className="text-allura-goldDark" />
          <span>Filters {hasActiveFilters && '•'}</span>
        </button>

        <button
          onClick={() => setIsSortSheetOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 text-xs font-sans font-bold text-allura-text py-2.5 rounded-lg border border-allura-border bg-allura-card uppercase tracking-wider"
        >
          <ArrowUpDown size={14} className="text-allura-goldDark" />
          <span>Sort By</span>
        </button>
      </div>

      {/* Active Shop / Category Banner from Admin Studio */}
      {activeShopBanner && (
        <div className="relative mb-6 sm:mb-8 rounded-2xl overflow-hidden shadow-md border border-allura-border/60 aspect-[21/9] sm:aspect-[24/7] min-h-[140px] max-h-[260px] group">
          <picture className="w-full h-full">
            {activeShopBanner.mobileImage && (
              <source media="(max-width: 640px)" srcSet={activeShopBanner.mobileImage} />
            )}
            <img
              src={activeShopBanner.desktopImage}
              alt={activeShopBanner.headline || activeShopBanner.title}
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-102 ${
                activeShopBanner.mobileImage && activeShopBanner.mobileImage !== activeShopBanner.desktopImage
                  ? 'object-[center_35%]'
                  : 'object-[80%_35%] sm:object-[center_35%]'
              }`}
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-allura-darkBrown/90 via-allura-darkBrown/50 to-transparent flex items-center p-6 sm:p-10">
            <div className="max-w-xl text-white space-y-2">
              {activeShopBanner.badge && (
                <span className="inline-block text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-allura-gold">
                  {activeShopBanner.badge}
                </span>
              )}
              <h2 className="font-serif text-xl sm:text-3xl font-medium tracking-tight">
                {activeShopBanner.headline || activeShopBanner.title}
              </h2>
              {(activeShopBanner.subtitle || activeShopBanner.description) && (
                <p className="text-xs sm:text-sm text-allura-bgSecondary/90 font-sans max-w-md line-clamp-2">
                  {activeShopBanner.subtitle || activeShopBanner.description}
                </p>
              )}
              {activeShopBanner.targetUrl && (
                <div className="pt-1">
                  <a
                    href={activeShopBanner.targetUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-sans font-bold tracking-wider text-allura-gold hover:text-white uppercase transition-colors"
                  >
                    <span>{activeShopBanner.ctaText || 'EXPLORE NOW'}</span>
                    <ArrowRight size={13} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Layout: Desktop Sidebar + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar Filters */}
        <div className="hidden lg:block space-y-8 pr-4">
          <div className="flex items-center justify-between border-b border-allura-border pb-3">
            <span className="font-serif text-base font-semibold tracking-wide uppercase text-allura-text">
              FILTERS
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-allura-goldDark hover:text-allura-darkBrown flex items-center gap-1 font-sans underline"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Collection Filter */}
          <div className="space-y-3">
            <h4 className="text-xs font-sans font-bold tracking-[0.2em] text-allura-darkBrown uppercase">
              COLLECTION
            </h4>
            <div className="space-y-1.5">
              {collectionOptions.map(col => {
                const isSelected =
                  selectedCollection.toLowerCase() === col.name.toLowerCase() ||
                  selectedCollection.toLowerCase() === col.id.toLowerCase() ||
                  selectedCollection.toLowerCase() === col.slug.toLowerCase() ||
                  (col.id === 'all' && (selectedCollection === 'All' || selectedCollection === 'all'));
                return (
                  <button
                    key={col.id}
                    onClick={() => setSelectedCollection(col.name)}
                    className={`w-full text-left text-xs font-sans py-1 flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'text-allura-goldDark font-semibold'
                        : 'text-allura-muted hover:text-allura-text'
                    }`}
                  >
                    <span>{col.name}</span>
                    {isSelected && <Check size={12} className="text-allura-goldDark" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size Filter */}
          <div className="space-y-3">
            <h4 className="text-xs font-sans font-bold tracking-[0.2em] text-allura-darkBrown uppercase">
              SIZE
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {sizes.map(size => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    onClick={() => handleSizeToggle(size)}
                    className={`py-1.5 px-2 rounded text-xs font-sans font-medium transition-all ${
                      isSelected
                        ? 'bg-allura-darkBrown text-allura-card border border-allura-darkBrown'
                        : 'border border-allura-border bg-allura-card text-allura-text hover:border-allura-gold'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Filter: hidden until GET /products/search supports a colour param (see TODO above) */}

          {/* Price Range Slider (debounced ~400ms before it hits the URL / API) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-sans">
              <h4 className="font-bold tracking-[0.2em] text-allura-darkBrown uppercase">MAX PRICE</h4>
              <span className="font-serif font-semibold text-allura-text">₹ {priceDraft.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={500}
              value={priceDraft}
              onChange={e => setPriceDraft(Number(e.target.value))}
              className="w-full accent-allura-goldDark cursor-pointer"
            />
          </div>

          {/* In Stock Toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={e => setInStockOnly(e.target.checked)}
                className="w-4 h-4 accent-allura-goldDark rounded cursor-pointer"
              />
              <span className="text-xs font-sans text-allura-text">In-stock pieces only</span>
            </label>
          </div>
        </div>

        {/* Product Grid Area (3 Columns on Desktop) */}
        <div className="lg:col-span-3">
          <div className="hidden lg:flex items-center justify-between mb-6 pb-3 border-b border-allura-border/60">
            <span className="text-xs font-sans text-allura-muted tracking-wider uppercase">
              Showing <strong className="text-allura-text">{isLoading ? '…' : totalCount}</strong> items
            </span>

            {/* Custom Luxury Sort Dropdown */}
            <div ref={sortDropdownRef} className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen(prev => !prev)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#561C08]/20 bg-white/95 hover:bg-white text-stone-800 text-xs font-sans shadow-2xs hover:shadow-sm hover:border-[#561C08]/40 transition-all duration-200 cursor-pointer select-none group"
                aria-expanded={isSortDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className="text-stone-400 font-medium">Sort By:</span>
                <span className="font-semibold text-[#561C08] tracking-tight">{currentSortOption.label}</span>
                <ChevronDown
                  size={14}
                  className={`text-[#561C08] transition-transform duration-200 ${
                    isSortDropdownOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'
                  }`}
                />
              </button>

              {isSortDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-56 bg-white/98 backdrop-blur-md border border-[#561C08]/15 rounded-xl shadow-xl shadow-stone-900/10 py-1.5 z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  role="listbox"
                >
                  <div className="px-3.5 py-1.5 border-b border-stone-100 text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-stone-400">
                    Sort Order
                  </div>
                  {SORT_OPTIONS.map(opt => {
                    const isSelected = sortBy === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSortBy(opt.value);
                          setIsSortDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 text-left text-xs font-sans flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-[#F7E6C8]/45 text-[#561C08] font-bold'
                            : 'text-stone-700 hover:bg-stone-50 hover:text-[#561C08]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && (
                          <Check size={14} className="text-[#561C08] stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
              <ProductCardSkeleton count={8} />
            </div>
          ) : initialError ? (
            <div className="py-20 text-center space-y-4 bg-allura-card rounded-xl border border-allura-border p-8">
              <p className="text-sm text-red-600 font-sans">{initialError}</p>
              <button
                onClick={() => fetchInitialProducts()}
                className="bg-allura-goldDark text-allura-card text-xs font-sans font-bold tracking-[0.2em] uppercase py-2.5 px-5 rounded-sm transition-all inline-flex items-center gap-2"
              >
                <RotateCcw size={14} />
                <span>RETRY</span>
              </button>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-allura-card rounded-xl border border-allura-border p-8">
              <div className="w-16 h-16 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-gold mx-auto">
                <Sparkles size={24} />
              </div>
              <h3 className="font-serif text-xl font-medium text-allura-text">
                No designs match your criteria
              </h3>
              <p className="text-xs text-allura-muted max-w-sm mx-auto">
                Try loosening your filters or explore our signature collections.
              </p>
              <button
                onClick={resetFilters}
                className="bg-allura-goldDark text-allura-card text-xs font-sans font-bold tracking-[0.2em] uppercase py-2.5 px-5 rounded-sm transition-all"
              >
                RESET ALL FILTERS
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                {displayProducts.map(product => (
                  <ProductCard key={product.id} product={product} showCategory={true} />
                ))}
              </div>

              {/* Next batch skeleton / loading indicator */}
              {isLoadingMore && (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                    <ProductCardSkeleton count={4} />
                  </div>
                  <div className="flex items-center justify-center gap-2 py-4 text-allura-goldDark">
                    <div className="w-5 h-5 rounded-full border-2 border-allura-goldDark border-t-transparent animate-spin" />
                    <span className="text-xs font-sans tracking-widest uppercase font-semibold">
                      Loading more products...
                    </span>
                  </div>
                </div>
              )}

              {/* Load more error with retry button */}
              {loadMoreError && (
                <div className="mt-6 py-4 px-6 text-center bg-red-50/50 border border-red-200 rounded-xl space-y-2">
                  <p className="text-xs text-red-600 font-sans">{loadMoreError}</p>
                  <button
                    onClick={() => fetchNextProducts()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-allura-darkBrown hover:bg-allura-goldDark text-white text-xs font-sans font-bold uppercase tracking-wider rounded-lg transition-colors shadow-xs"
                  >
                    <RotateCcw size={13} />
                    <span>Retry loading</span>
                  </button>
                </div>
              )}

              {/* End of products indicator */}
              {!hasMore && !isLoadingMore && productsList.length > 0 && (
                <div className="py-12 text-center border-t border-allura-border/40 mt-8">
                  <span className="text-[11px] font-sans font-bold tracking-[0.22em] uppercase text-allura-muted block">
                    ✦ You've reached the end of the collection ✦
                  </span>
                  <span className="text-[10px] text-allura-muted/80 font-sans mt-1 block">
                    Showing all {displayProducts.length} pieces
                  </span>
                </div>
              )}

              {/* Sentinel trigger element for IntersectionObserver */}
              <div ref={sentinelRef} className="h-4 w-full pointer-events-none" aria-hidden="true" />
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter BottomSheet */}
      <BottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter Collection"
        footerActions={
          <div className="flex gap-3">
            <button
              onClick={() => {
                resetFilters();
                setIsFilterSheetOpen(false);
              }}
              className="flex-1 py-3 border border-allura-border text-allura-text rounded-sm text-xs font-sans font-semibold uppercase tracking-wider"
            >
              Clear All
            </button>
            <button
              onClick={() => setIsFilterSheetOpen(false)}
              className="flex-1 py-3 bg-allura-goldDark text-allura-card rounded-sm text-xs font-sans font-bold uppercase tracking-wider"
            >
              Apply ({isLoading ? '…' : totalCount})
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-sans font-bold tracking-widest text-allura-darkBrown uppercase mb-3">
              Category
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {categoryOptions.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-2 rounded text-xs font-sans text-left border ${
                    selectedCategory === cat
                      ? 'bg-allura-darkBrown text-allura-card border-allura-darkBrown'
                      : 'border-allura-border bg-allura-bg text-allura-text'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-sans font-bold tracking-widest text-allura-darkBrown uppercase mb-3">
              Collection
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {collectionOptions.map(col => {
                const isSelected =
                  selectedCollection.toLowerCase() === col.name.toLowerCase() ||
                  selectedCollection.toLowerCase() === col.id.toLowerCase() ||
                  selectedCollection.toLowerCase() === col.slug.toLowerCase() ||
                  (col.id === 'all' && (selectedCollection === 'All' || selectedCollection === 'all'));
                return (
                  <button
                    key={col.id}
                    onClick={() => setSelectedCollection(col.name)}
                    className={`p-2 rounded text-xs font-sans text-left border ${
                      isSelected
                        ? 'bg-allura-darkBrown text-allura-card border-allura-darkBrown'
                        : 'border-allura-border bg-allura-bg text-allura-text'
                    }`}
                  >
                    {col.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-sans font-bold tracking-widest text-allura-darkBrown uppercase mb-3">
              Sizes
            </h4>
            <div className="flex flex-wrap gap-2">
              {sizes.map(size => (
                <button
                  key={size}
                  onClick={() => handleSizeToggle(size)}
                  className={`w-10 h-10 rounded text-xs font-sans font-semibold border ${
                    selectedSizes.includes(size)
                      ? 'bg-allura-darkBrown text-allura-card border-allura-darkBrown'
                      : 'border-allura-border bg-allura-bg text-allura-text'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* Mobile Sort BottomSheet */}
      <BottomSheet
        isOpen={isSortSheetOpen}
        onClose={() => setIsSortSheetOpen(false)}
        title="Sort By"
      >
        <div className="space-y-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setSortBy(opt.value);
                setIsSortSheetOpen(false);
              }}
              className={`w-full p-3.5 text-left text-sm font-sans flex items-center justify-between border-b border-allura-border/40 ${
                sortBy === opt.value
                  ? 'font-bold text-allura-goldDark'
                  : 'text-allura-text hover:text-allura-gold'
              }`}
            >
              <span>{opt.label}</span>
              {sortBy === opt.value && <Check size={16} className="text-allura-goldDark" />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
};
