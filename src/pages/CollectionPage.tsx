import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useAdmin } from '../context/AdminContext';
import { ProductCard } from '../components/ui/ProductCard';
import { ProductCardSkeleton } from '../components/ui/ProductCardSkeleton';
import { 
  ArrowRight, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { 
  getStoreCollections,
  getStoreCollectionBySlug,
  getStoreProduct,
  mapStoreProduct,
  searchProducts,
  isRequestCanceled,
  type StoreCollection,
  type ProductSearchPagination 
} from '../service/store';
import { collectionsData } from '../data/collections';
import type { Product } from '../types';

export const CollectionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { products: localFallbackProducts } = useShop();
  const { banners } = useAdmin();

  // Dynamic store collections from API
  const [storeCollections, setStoreCollections] = useState<StoreCollection[]>([]);
  const [activeCollection, setActiveCollection] = useState<StoreCollection | null>(null);

  // Search & Filter & Sort state for /products/search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price_asc' | 'price_desc'>('newest');
  const [priceFilter, setPriceFilter] = useState<'all' | 'under1k' | '1k-2k' | 'above2k'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_LIMIT = 12;

  // Products & pagination result from /products/search
  const [collectionProducts, setCollectionProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<ProductSearchPagination>({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // True once we know which collection (if any) the slug maps to; products are only fetched after
  // this, so we don't fire an unfiltered request first and a collection request second.
  const [collectionResolved, setCollectionResolved] = useState(false);

  const [collectionLoadError, setCollectionLoadError] = useState(false);
  const [collectionAttempt, setCollectionAttempt] = useState(0);

  // Helper to resolve products belonging to a collection
  const resolveCollectionProducts = async (
    rawProducts: any[],
    catalog: Product[],
    signal?: AbortSignal
  ): Promise<Product[]> => {
    if (!rawProducts || rawProducts.length === 0) return [];

    // If already populated product objects
    if (typeof rawProducts[0] === 'object' && rawProducts[0] !== null && (rawProducts[0].name || rawProducts[0].pricing)) {
      return rawProducts.map((p: any) => (p.name ? mapStoreProduct(p) : p));
    }

    const ids = rawProducts.map(p => String(typeof p === 'string' ? p : p?._id || p?.id || '').trim()).filter(Boolean);
    const productMap = new Map<string, Product>();

    // Match with catalog from ShopContext
    for (const p of catalog) {
      if (p.id) productMap.set(p.id, p);
      if ((p as any)._id) productMap.set((p as any)._id, p);
    }

    // Any missing IDs, fetch concurrently
    const missing = ids.filter(id => !productMap.has(id));
    if (missing.length > 0 && !signal?.aborted) {
      try {
        const fetched = await Promise.all(
          missing.map(id => getStoreProduct(id).catch(() => null))
        );
        for (const p of fetched) {
          if (p && p.id) {
            productMap.set(p.id, p);
            if ((p as any)._id) productMap.set((p as any)._id, p);
          }
        }
      } catch (e) {
        console.warn('Failed fetching missing collection products:', e);
      }
    }

    return ids.map(id => productMap.get(id)).filter((p): p is Product => Boolean(p));
  };

  // 1a. Resolve the current collection: GET /store/collections/{slug} (with list & local fallbacks)
  useEffect(() => {
    let active = true;
    setCollectionResolved(false);
    setCollectionLoadError(false);
    setActiveCollection(null);
    if (!slug) {
      setCollectionResolved(true);
      return;
    }
    getStoreCollectionBySlug(slug)
      .then(col => {
        if (!active) return;
        if (col) {
          setActiveCollection(col);
        } else {
          // Check local collectionsData fallback
          const target = slug.toLowerCase();
          const localMatch = collectionsData.find(
            c =>
              c.slug?.toLowerCase() === target ||
              c.id?.toLowerCase() === target ||
              c.title?.toLowerCase() === slug.replace(/-/g, ' ').toLowerCase()
          );
          if (localMatch) {
            setActiveCollection({
              id: localMatch.id,
              name: localMatch.title,
              slug: localMatch.slug,
              description: localMatch.description,
              image: localMatch.image,
              products: [],
            });
          } else {
            setActiveCollection(null);
          }
        }
        setCollectionResolved(true);
      })
      .catch(err => {
        if (!active) return;
        console.warn('Failed to load collection in CollectionPage:', err);
        setCollectionLoadError(true);
      });
    return () => { active = false; };
  }, [slug, collectionAttempt]);

  // 1b. Other ACTIVE collections for the "Explore other edits" section
  useEffect(() => {
    let active = true;
    getStoreCollections().then(cols => {
      if (active) setStoreCollections(cols);
    });
    return () => { active = false; };
  }, []);

  // Banner content from the API collection (neutral text while it loads, no dummy data)
  const currentCollectionMeta = useMemo(() => {
    const rawImg = activeCollection
      ? typeof activeCollection.image === 'string'
        ? activeCollection.image
        : (activeCollection.image?.url || activeCollection.image?.thumbnailUrl)
      : undefined;
    return {
      id: activeCollection?.id || '',
      title: activeCollection?.name || '',
      tagline: 'CURATED COLLECTION',
      description: activeCollection?.description || '',
      image: rawImg || '/images/editorial-banners/allura-collection.jpeg',
    };
  }, [activeCollection]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Local catalogue is also an offline fallback on request failure
  const localFallbackRef = useRef(localFallbackProducts);
  localFallbackRef.current = localFallbackProducts;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, priceFilter, slug]);

  // The slug doesn't match any ACTIVE collection (inactive, archived or unknown)
  const isUnavailable = collectionResolved && !activeCollection;

  // 2. Fetch products for this collection: resolves collection.products, search, filter, sort & pagination
  useEffect(() => {
    if (!collectionResolved) return;
    if (!activeCollection) {
      setCollectionProducts([]);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    const loadProducts = async () => {
      setIsLoading(true);

      try {
        let baseProducts: Product[] = [];

        // 1. Direct products attached to the collection document
        if (Array.isArray(activeCollection.products) && activeCollection.products.length > 0) {
          baseProducts = await resolveCollectionProducts(
            activeCollection.products,
            localFallbackProducts,
            controller.signal
          );
        }

        // 2. If no products yet and it's a backend collection, try searchProducts with collectionId
        if (baseProducts.length === 0 && activeCollection.id && !activeCollection.id.startsWith('col-')) {
          try {
            const res = await searchProducts(
              {
                collectionId: activeCollection.id,
                page: 1,
                limit: 100,
              },
              undefined,
              controller.signal
            );
            if (res.products && res.products.length > 0) {
              baseProducts = res.products;
            }
          } catch {
            // searchProducts with collectionId might not be supported, ignore
          }
        }

        // 3. Fallback for theme/occasion collections
        if (baseProducts.length === 0) {
          const normSlug = (activeCollection.slug || activeCollection.name || '').toLowerCase();
          const matched = localFallbackProducts.filter(p => {
            const occ = (p.occasion || '').toLowerCase();
            const cat = (p.category || '').toLowerCase();
            if (normSlug.includes('festive') && (occ.includes('festive') || cat.includes('ethnic'))) return true;
            if (normSlug.includes('bridal') && (occ.includes('bridal') || occ.includes('wedding'))) return true;
            if (normSlug.includes('modest') && (occ.includes('modest') || cat.includes('modest'))) return true;
            if (normSlug.includes('party') && (occ.includes('party') || occ.includes('evening'))) return true;
            if (normSlug.includes('ethnic') && (occ.includes('ethnic') || cat.includes('ethnic'))) return true;
            return false;
          });
          if (matched.length > 0) {
            baseProducts = matched;
          }
        }

        if (controller.signal.aborted) return;

        // Apply Search Query filter
        let filtered = [...baseProducts];
        if (debouncedQuery) {
          const q = debouncedQuery.toLowerCase();
          filtered = filtered.filter(
            p =>
              p.name.toLowerCase().includes(q) ||
              p.description?.toLowerCase().includes(q) ||
              p.category?.toString().toLowerCase().includes(q)
          );
        }

        // Apply Price filter
        if (priceFilter === 'under1k') {
          filtered = filtered.filter(p => p.price < 1000);
        } else if (priceFilter === '1k-2k') {
          filtered = filtered.filter(p => p.price >= 1000 && p.price <= 2000);
        } else if (priceFilter === 'above2k') {
          filtered = filtered.filter(p => p.price > 2000);
        }

        // Apply Sort
        if (sortBy === 'price_asc') {
          filtered.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price_desc') {
          filtered.sort((a, b) => b.price - a.price);
        } else if (sortBy === 'featured') {
          filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        } else if (sortBy === 'newest') {
          filtered.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
          });
        }

        // Pagination
        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
        const paginated = filtered.slice((currentPage - 1) * PAGE_LIMIT, currentPage * PAGE_LIMIT);

        setCollectionProducts(paginated);
        setPagination({
          page: currentPage,
          limit: PAGE_LIMIT,
          total,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        });
      } catch (err) {
        if (controller.signal.aborted || isRequestCanceled(err)) return;
        console.warn('Failed to load products in CollectionPage:', err);
        setCollectionProducts([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadProducts();
    return () => controller.abort();
  }, [collectionResolved, activeCollection, debouncedQuery, sortBy, priceFilter, currentPage, localFallbackProducts]);

  // Check for live collection banner configured in Admin Studio
  const liveCollectionBanner = (banners || []).find(
    b => b.placement === 'COLLECTION_BANNER' &&
         (b.status?.toLowerCase() === 'active' || b.status === 'Active' || (b as any).isActive === true) &&
         Boolean(b.desktopImage) &&
         (
           (slug && b.targetUrl?.includes(slug)) ||
           (slug && b.title?.toLowerCase().includes(slug.replace('-', ' '))) ||
           (slug && b.headline?.toLowerCase().includes(slug.replace('-', ' ')))
         )
  ) || (banners || []).find(
    b => b.placement === 'COLLECTION_BANNER' &&
         (b.status?.toLowerCase() === 'active' || b.status === 'Active' || (b as any).isActive === true) &&
         Boolean(b.desktopImage)
  );

  const bannerImg = liveCollectionBanner?.desktopImage || currentCollectionMeta.image;
  const bannerMobileImg = liveCollectionBanner?.mobileImage;
  const bannerTitle = liveCollectionBanner?.headline || liveCollectionBanner?.title || currentCollectionMeta.title;
  const bannerTagline = liveCollectionBanner?.badge || currentCollectionMeta.tagline;
  const bannerDesc = liveCollectionBanner?.subtitle || liveCollectionBanner?.description || currentCollectionMeta.description;

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSortBy('newest');
    setPriceFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery !== '' || priceFilter !== 'all' || sortBy !== 'newest';

  if (collectionLoadError) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center space-y-5">
        <h1 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">We couldn't load this collection</h1>
        <p className="text-xs sm:text-sm font-sans text-allura-muted">Please check your connection and try again.</p>
        <button
          type="button"
          onClick={() => setCollectionAttempt(a => a + 1)}
          className="inline-flex items-center gap-2 min-h-11 px-6 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold tracking-wider uppercase rounded-xl transition-colors"
        >
          <RotateCcw size={14} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (isUnavailable) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center space-y-5">
        <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark block">
          COLLECTION UNAVAILABLE
        </span>
        <h1 className="font-serif text-2xl sm:text-4xl text-allura-text font-normal">
          This collection is no longer available
        </h1>
        <p className="text-xs sm:text-sm font-sans text-allura-muted max-w-md mx-auto">
          It may have been retired or is not live yet. Explore our latest pieces in the shop instead.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 min-h-11 px-6 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold tracking-wider uppercase rounded-xl transition-colors"
          >
            <span>Shop all</span>
            <ArrowRight size={14} />
          </Link>
        </div>
        {storeCollections.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2.5 pt-6">
            {storeCollections.slice(0, 6).map(col => (
              <Link
                key={col.id}
                to={`/collections/${col.slug || col.id}`}
                className="px-4 py-2 rounded-full border border-allura-border bg-allura-bg hover:border-allura-gold hover:bg-allura-bgSecondary text-xs font-sans text-allura-text transition-colors"
              >
                {col.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-12 pb-16">
      {/* Editorial Collection Hero Banner */}
      <section className="relative h-[40vh] sm:h-[48vh] min-h-[300px] sm:min-h-[360px] w-full overflow-hidden bg-allura-bgSecondary">
        <picture className="w-full h-full">
          {bannerMobileImg && (
            <source media="(max-width: 640px)" srcSet={bannerMobileImg} />
          )}
          <img
            src={bannerImg}
            alt={bannerTitle}
            className={`w-full h-full object-cover ${
              bannerMobileImg && bannerMobileImg !== bannerImg
                ? 'object-[center_top]'
                : 'object-[80%_20%] sm:object-[center_top]'
            }`}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-allura-darkBrown/90 via-allura-darkBrown/45 to-transparent flex items-end">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 sm:py-10 w-full text-allura-card space-y-2 sm:space-y-3">
            <span className="text-[10px] sm:text-[11px] font-sans font-bold tracking-[0.3em] uppercase text-allura-gold">
              {bannerTagline}
            </span>
            <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-normal uppercase tracking-tight">
              {bannerTitle}
            </h1>
            <p className="text-xs sm:text-sm text-allura-bgSecondary/90 font-sans max-w-xl leading-relaxed">
              {bannerDesc}
            </p>
          </div>
        </div>
      </section>

      {/* Main Collection Content: Filter, Search, Sort & Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Interactive Filter, Search & Sort Control Bar */}
        <div className="bg-white/95 rounded-2xl p-4 sm:p-5 border border-[#561C08]/15 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            {/* Search Input Bar (GET /products/search?q=...) */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#561C08]/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search pieces in this collection..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#FAF7F2] border border-[#561C08]/15 rounded-xl text-xs sm:text-sm font-sans text-[#561C08] placeholder-[#561C08]/45 focus:outline-none focus:ring-2 focus:ring-[#561C08]/30 focus:border-[#561C08] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#561C08]/50 hover:text-[#561C08]"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Sort & Quick Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#561C08]/15 rounded-xl px-3 py-2 text-xs">
                <ArrowUpDown size={14} className="text-[#561C08]" />
                <span className="text-[#561C08]/60 font-sans hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent font-medium font-sans text-[#561C08] focus:outline-none cursor-pointer"
                >
                  <option value="newest">Newest Arrivals</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="featured">Featured</option>
                </select>
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 transition-colors font-medium font-sans"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Price Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#561C08]/10 text-xs">
            <span className="text-[#561C08]/60 font-sans flex items-center gap-1.5 mr-1 font-medium">
              <SlidersHorizontal size={12} className="text-[#561C08]" />
              <span>Price:</span>
            </span>
            {[
              { id: 'all', label: 'All Prices' },
              { id: 'under1k', label: 'Under ₹1,000' },
              { id: '1k-2k', label: '₹1,000 - ₹2,000' },
              { id: 'above2k', label: 'Above ₹2,000' },
            ].map(chip => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setPriceFilter(chip.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all duration-200 ${
                  priceFilter === chip.id
                    ? 'bg-[#561C08] text-white shadow-xs font-semibold'
                    : 'bg-[#FAF7F2] text-[#561C08] border border-[#561C08]/15 hover:bg-[#F3EDE2] hover:border-[#561C08]/30'
                }`}
              >
                {chip.label}
              </button>
            ))}

            <div className="ml-auto text-[11px] text-[#561C08]/60 font-sans tracking-wider uppercase hidden md:block">
              {pagination.total} {pagination.total === 1 ? 'Piece' : 'Pieces'} Available
            </div>
          </div>
        </div>

        {/* Product Grid Status Header */}
        <div className="flex items-center justify-between pb-2 border-b border-allura-border/60">
          <span className="text-xs font-sans text-allura-muted tracking-wider uppercase">
            Showing <strong className="text-allura-text">{collectionProducts.length}</strong> of{' '}
            <strong className="text-allura-text">{pagination.total}</strong> pieces
          </span>
          <Link
            to="/shop"
            className="text-xs font-sans font-bold tracking-wider text-allura-goldDark hover:text-allura-darkBrown uppercase inline-flex items-center gap-1"
          >
            <span>View All Collections</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Product Grid / Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <ProductCardSkeleton count={8} />
          </div>
        ) : collectionProducts.length === 0 ? (
          <div className="text-center py-12 text-allura-muted font-sans text-xs space-y-2 bg-allura-card/60 rounded-2xl border border-allura-border/50 p-6">
            <p className="text-base font-serif text-allura-darkBrown font-medium">No matching pieces found</p>
            <p>Try modifying your search or clearing your active filters to explore more of our collection.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#561C08] text-white rounded-lg text-xs font-semibold hover:bg-[#3D1406] transition-colors"
              >
                <RotateCcw size={13} />
                <span>Clear All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {collectionProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination Bar (GET /products/search?page=...&limit=12) */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-8 sm:pt-10">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => {
                setCurrentPage(prev => Math.max(1, prev - 1));
                window.scrollTo({ top: 350, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-sans font-medium border border-[#561C08]/15 bg-white text-[#561C08] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAF7F2] transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                type="button"
                onClick={() => {
                  setCurrentPage(pageNum);
                  window.scrollTo({ top: 350, behavior: 'smooth' });
                }}
                className={`w-9 h-9 rounded-xl text-xs font-sans font-medium transition-all ${
                  currentPage === pageNum
                    ? 'bg-[#561C08] text-white shadow-xs font-bold'
                    : 'bg-white border border-[#561C08]/15 hover:bg-[#FAF7F2] text-[#561C08]'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= pagination.totalPages || isLoading}
              onClick={() => {
                setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1));
                window.scrollTo({ top: 350, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-sans font-medium border border-[#561C08]/15 bg-white text-[#561C08] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAF7F2] transition-colors"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>

      {/* Other Curated Edits Carousel / Links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 border-t border-allura-border/60">
        <div className="text-center mb-4 sm:mb-8">
          <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark block mb-1">
            CONTINUE BROWSING
          </span>
          <h3 className="font-serif text-2xl text-allura-text font-normal uppercase">
            EXPLORE OTHER EDITS
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {storeCollections
            .filter(c => c.slug !== slug && c.id !== slug && (!activeCollection || c.name?.toLowerCase() !== activeCollection.name?.toLowerCase()))
            .slice(0, 4)
            .map(col => {
              const rawImg = typeof (col as any).image === 'string'
                ? (col as any).image
                : ((col as any).image?.url || (col as any).image?.thumbnailUrl || '/images/editorial-banners/allura-collection.jpeg');
              const colTitle = (col as any).name || (col as any).title;
              return (
                <Link
                  key={col.id}
                  to={`/collections/${col.slug || col.id}`}
                  className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-allura-border/60 shadow-xs"
                >
                  <img
                    src={rawImg}
                    alt={colTitle}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-allura-darkBrown/60 flex items-center justify-center p-3 text-center text-allura-card group-hover:bg-allura-darkBrown/40 transition-colors">
                    <h4 className="font-serif text-sm sm:text-base font-medium tracking-wider uppercase">
                      {colTitle}
                    </h4>
                  </div>
                </Link>
              );
            })}
        </div>
      </section>
    </div>
  );
};

