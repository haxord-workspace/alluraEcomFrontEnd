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
  type ProductSearchParams,
  type ProductSearchPagination,
} from '../service/store';
import type { Product } from '../types';

type SortOptionValue = 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: { label: string; value: 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'rating' }[] = [
  { label: 'Featured Curations', value: 'featured' },
  { label: 'New Arrivals', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Customer Rating', value: 'rating' },
];

const getBackendSortValue = (sort: string): string => {
  if (sort === 'price_asc' || sort === 'price-asc') return 'price_asc';
  if (sort === 'price_desc' || sort === 'price-desc') return 'price_desc';
  if (sort === 'newest') return 'newest';
  if (sort === 'rating') return 'popularity';
  return 'featured';
};

export const ShopPage: React.FC = () => {
  const { categories } = useShop();
  const { banners } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const catParam = searchParams.get('category');
  const occParam = searchParams.get('occasion');
  const qParam = searchParams.get('q') || searchParams.get('search');

  const [selectedCategory, setSelectedCategory] = useState<string>(catParam || 'All');
  const [selectedOccasion, setSelectedOccasion] = useState<string>(occParam || 'All');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(25000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOptionValue>(
    filterParam === 'new' ? 'newest' : 'featured'
  );
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

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

  // Paginated products state (Infinite scroll batches of 8)
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [page, setPage] = useState<number>(1);
  const [meta, setMeta] = useState<ProductSearchPagination>({
    total: 0,
    page: 1,
    limit: 8,
    totalPages: 1,
    hasNextPage: true,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const isRequestInProgressRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  // Construct backend search query params with sorting, pagination, and filters
  const buildSearchParams = useCallback((pageNum: number): ProductSearchParams => {
    const params: ProductSearchParams = {
      page: pageNum,
      limit: 8,
      sort: getBackendSortValue(sortBy),
    };

    if (selectedCategoryId) {
      params.categoryId = selectedCategoryId;
    }

    if (qParam) {
      params.q = qParam;
    }

    if (maxPrice < 25000) {
      params.maxPrice = maxPrice;
    }

    if (inStockOnly) {
      params.availability = 'IN_STOCK';
    }

    if (filterParam === 'bestseller') {
      params.bestSeller = true;
    } else if (filterParam === 'new') {
      params.newArrival = true;
    }

    return params;
  }, [sortBy, selectedCategoryId, qParam, maxPrice, inStockOnly, filterParam]);

  // Initial batch load: page 1, limit 8 using backend search & sort
  const fetchInitialProducts = useCallback(async () => {
    isRequestInProgressRef.current = true;
    setIsLoading(true);
    setInitialError(null);
    setLoadMoreError(null);
    setPage(1);

    try {
      const searchParams = buildSearchParams(1);
      const res = await searchProducts(searchParams, categoryMap);

      const items = res.products || [];
      const newPagination = res.pagination;

      setProductsList(items);
      setMeta(newPagination);

      const reachedEnd =
        newPagination.hasNextPage === false ||
        items.length === 0 ||
        items.length < 8 ||
        (newPagination.totalPages ? 1 >= newPagination.totalPages : false) ||
        (newPagination.total ? items.length >= newPagination.total : false);

      setHasMore(!reachedEnd);
    } catch (err: any) {
      console.error('Failed to load initial products:', err);
      setInitialError(err?.response?.data?.message || err?.message || 'Failed to load products');
      setProductsList([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      isRequestInProgressRef.current = false;
    }
  }, [buildSearchParams, categoryMap]);

  // Next batch load: page + 1, limit 8
  const fetchNextProducts = useCallback(async () => {
    if (isRequestInProgressRef.current || !hasMore || isLoading || isLoadingMore) {
      return;
    }

    isRequestInProgressRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    const nextPage = page + 1;

    try {
      const searchParams = buildSearchParams(nextPage);
      const res = await searchProducts(searchParams, categoryMap);

      const newItems = res.products || [];
      const newPagination = res.pagination;

      setProductsList(prev => {
        const seen = new Set(prev.map(p => p.id));
        const unique = newItems.filter(p => !seen.has(p.id));
        const combined = [...prev, ...unique];

        const reachedEnd =
          newPagination.hasNextPage === false ||
          newItems.length === 0 ||
          newItems.length < 8 ||
          (newPagination.totalPages ? nextPage >= newPagination.totalPages : false) ||
          (newPagination.total ? combined.length >= newPagination.total : false);

        setHasMore(!reachedEnd);
        return combined;
      });

      setPage(nextPage);
      setMeta(newPagination);
    } catch (err: any) {
      console.error('Failed to load more products:', err);
      setLoadMoreError(err?.response?.data?.message || err?.message || 'Failed to load more products');
    } finally {
      setIsLoadingMore(false);
      isRequestInProgressRef.current = false;
    }
  }, [hasMore, isLoading, isLoadingMore, page, buildSearchParams, categoryMap]);

  // Reset and fetch initial batch whenever category, search, or filters change
  useEffect(() => {
    fetchInitialProducts();
  }, [
    fetchInitialProducts,
    selectedOccasion,
    selectedSizes,
    selectedColors,
    maxPrice,
    inStockOnly,
    sortBy,
    filterParam,
  ]);

  // IntersectionObserver to auto-fetch next batch when near bottom
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        const [first] = entries;
        if (first.isIntersecting && hasMore && !isLoading && !isLoadingMore && !isRequestInProgressRef.current) {
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
      if (!hasMore || isLoading || isLoadingMore || isRequestInProgressRef.current) return;
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
    if (occParam) setSelectedOccasion(occParam);
    if (filterParam === 'new') setSortBy('newest');
  }, [catParam, occParam, filterParam]);

  const categoryOptions = ['All', ...categories.map(c => c.name)];
  const occasions = ['All', 'Bridal', 'Festive', 'Party Wear', 'Modest Wear', 'Ethnic'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const colors = [
    { name: 'Ivory', hex: '#EBE3D5' },
    { name: 'Rose', hex: '#E5BFB8' },
    { name: 'Sage', hex: '#C2CBB8' },
    { name: 'Black', hex: '#1C1B1A' },
    { name: 'Crimson', hex: '#7A1C28' },
    { name: 'Emerald', hex: '#1C4A3A' },
    { name: 'Navy', hex: '#151F30' },
  ];

  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const handleColorToggle = (colorName: string) => {
    setSelectedColors(prev =>
      prev.includes(colorName) ? prev.filter(c => c !== colorName) : [...prev, colorName]
    );
  };

  const resetFilters = () => {
    setSelectedCategory('All');
    setSelectedOccasion('All');
    setSelectedSizes([]);
    setSelectedColors([]);
    setMaxPrice(25000);
    setInStockOnly(false);
    setSortBy('featured');
    setSearchParams({});
  };

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    selectedOccasion !== 'All' ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    maxPrice < 25000 ||
    inStockOnly;

  const filteredProducts = useMemo(() => {
    let result = [...productsList];

    if (filterParam === 'bestseller') {
      result = result.filter(p => p.isBestSeller);
    } else if (filterParam === 'new') {
      result = result.filter(p => p.isNewArrival);
    }

    if (selectedCategory !== 'All') {
      result = result.filter(
        p => (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase()) ||
             p.categoryId === selectedCategoryId
      );
    }

    if (selectedOccasion !== 'All') {
      result = result.filter(p => p.occasion && p.occasion.toLowerCase() === selectedOccasion.toLowerCase());
    }

    if (selectedSizes.length > 0) {
      result = result.filter(p => p.sizes && p.sizes.some(s => selectedSizes.includes(s)));
    }

    if (selectedColors.length > 0) {
      result = result.filter(p =>
        p.colors && p.colors.some(c =>
          selectedColors.some(sc => c.name.toLowerCase().includes(sc.toLowerCase()))
        )
      );
    }

    result = result.filter(p => p.price <= maxPrice);

    if (inStockOnly) {
      result = result.filter(p => p.inStock);
    }

    return result;
  }, [
    productsList,
    selectedCategory,
    selectedCategoryId,
    selectedOccasion,
    selectedSizes,
    selectedColors,
    maxPrice,
    inStockOnly,
    filterParam,
  ]);

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

          {/* Occasion Filter */}
          <div className="space-y-3">
            <h4 className="text-xs font-sans font-bold tracking-[0.2em] text-allura-darkBrown uppercase">
              OCCASION
            </h4>
            <div className="space-y-1.5">
              {occasions.map(occ => (
                <button
                  key={occ}
                  onClick={() => setSelectedOccasion(occ)}
                  className={`w-full text-left text-xs font-sans py-1 flex items-center justify-between transition-colors ${
                    selectedOccasion === occ
                      ? 'text-allura-goldDark font-semibold'
                      : 'text-allura-muted hover:text-allura-text'
                  }`}
                >
                  <span>{occ}</span>
                  {selectedOccasion === occ && <Check size={12} className="text-allura-goldDark" />}
                </button>
              ))}
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

          {/* Color Filter */}
          <div className="space-y-3">
            <h4 className="text-xs font-sans font-bold tracking-[0.2em] text-allura-darkBrown uppercase">
              COLOUR
            </h4>
            <div className="flex flex-wrap gap-2">
              {colors.map(color => {
                const isSelected = selectedColors.includes(color.name);
                return (
                  <button
                    key={color.name}
                    onClick={() => handleColorToggle(color.name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-sans transition-all ${
                      isSelected
                        ? 'border-allura-gold bg-allura-bgSecondary/60 font-semibold'
                        : 'border-allura-border bg-allura-card text-allura-muted hover:border-allura-gold'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-allura-border"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span>{color.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-sans">
              <h4 className="font-bold tracking-[0.2em] text-allura-darkBrown uppercase">MAX PRICE</h4>
              <span className="font-serif font-semibold text-allura-text">₹ {maxPrice.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min={3000}
              max={25000}
              step={500}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
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
              Showing <strong className="text-allura-text">{filteredProducts.length}</strong> items
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
          ) : filteredProducts.length === 0 ? (
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
                {filteredProducts.map(product => (
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
                    Showing all {filteredProducts.length} pieces
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
              Apply ({filteredProducts.length})
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
              Occasion
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {occasions.map(occ => (
                <button
                  key={occ}
                  onClick={() => setSelectedOccasion(occ)}
                  className={`p-2 rounded text-xs font-sans text-left border ${
                    selectedOccasion === occ
                      ? 'bg-allura-darkBrown text-allura-card border-allura-darkBrown'
                      : 'border-allura-border bg-allura-bg text-allura-text'
                  }`}
                >
                  {occ}
                </button>
              ))}
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
