import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collectionsData } from '../data/collections';
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
  searchProducts, 
  type StoreCollection, 
  type ProductSearchPagination 
} from '../service/store';
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

  // 1. Fetch store collections to resolve current collection
  useEffect(() => {
    let active = true;
    const fetchCols = async () => {
      try {
        const cols = await getStoreCollections();
        if (active && Array.isArray(cols) && cols.length > 0) {
          setStoreCollections(cols);
          const matched = cols.find(c => c.slug === slug || c.id === slug);
          if (matched) setActiveCollection(matched);
        }
      } catch (err) {
        console.warn('Failed to fetch store collections in CollectionPage:', err);
      }
    };
    fetchCols();
    return () => { active = false; };
  }, [slug]);

  // Fallback to local collection meta if API hasn't loaded it yet
  const currentCollectionMeta = useMemo(() => {
    if (activeCollection) {
      const rawImg = typeof activeCollection.image === 'string'
        ? activeCollection.image
        : (activeCollection.image?.url || activeCollection.image?.thumbnailUrl);
      return {
        id: activeCollection.id,
        title: activeCollection.name,
        tagline: 'CURATED COLLECTION',
        description: activeCollection.description || 'Handcrafted luxury silhouettes designed with timeless elegance.',
        image: rawImg || '/images/editorial-banners/allura-collection.jpeg',
      };
    }
    const local = collectionsData.find(c => c.slug === slug) || collectionsData[0];
    return {
      id: local.id,
      title: local.title,
      tagline: local.tagline,
      description: local.description,
      image: local.image,
    };
  }, [activeCollection, slug]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, priceFilter, slug]);

  // 2. Fetch products using GET /products/search with search, filter, sort & pagination
  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      setIsLoading(true);

      let minPrice: number | undefined;
      let maxPrice: number | undefined;
      if (priceFilter === 'under1k') {
        maxPrice = 1000;
      } else if (priceFilter === '1k-2k') {
        minPrice = 1000;
        maxPrice = 2000;
      } else if (priceFilter === 'above2k') {
        minPrice = 2000;
      }

      try {
        // Query /products/search with collectionId, query, sort, price, page, limit
        let res = await searchProducts({
          collectionId: activeCollection?.id,
          q: debouncedQuery || undefined,
          sort: sortBy,
          minPrice,
          maxPrice,
          page: currentPage,
          limit: PAGE_LIMIT,
        });

        // If collection has 0 tagged products in backend DB, fall back to global /products/search
        if ((!res.products || res.products.length === 0) && !debouncedQuery && priceFilter === 'all') {
          const fallbackRes = await searchProducts({
            sort: sortBy,
            page: currentPage,
            limit: PAGE_LIMIT,
          });
          if (fallbackRes.products && fallbackRes.products.length > 0) {
            res = fallbackRes;
          }
        }

        if (active) {
          setCollectionProducts(res.products || []);
          setPagination(res.pagination);
        }
      } catch (err) {
        console.warn('Failed to load products from /products/search in CollectionPage:', err);
        // Fallback to local products
        if (active) {
          const local = localFallbackProducts.filter(p => {
            if (debouncedQuery && !p.name.toLowerCase().includes(debouncedQuery.toLowerCase())) return false;
            return true;
          });
          setCollectionProducts(local);
          setPagination({
            page: 1,
            limit: PAGE_LIMIT,
            total: local.length,
            totalPages: Math.ceil(local.length / PAGE_LIMIT) || 1,
            hasNextPage: false,
            hasPreviousPage: false,
          });
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadProducts();
    return () => { active = false; };
  }, [activeCollection, debouncedQuery, sortBy, priceFilter, currentPage, localFallbackProducts, slug]);

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
        <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-allura-border/60 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            {/* Search Input Bar (GET /products/search?q=...) */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search pieces in this collection..."
                className="w-full pl-10 pr-9 py-2.5 bg-stone-100/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-allura-gold/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Sort & Quick Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-stone-100/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs">
                <ArrowUpDown size={14} className="text-allura-goldDark" />
                <span className="text-stone-500 font-sans hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent font-medium font-sans text-stone-800 dark:text-stone-200 focus:outline-none cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-3 py-2 transition-colors font-medium font-sans"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Price Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
            <span className="text-stone-400 font-sans flex items-center gap-1.5 mr-1">
              <SlidersHorizontal size={12} />
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
                className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all ${
                  priceFilter === chip.id
                    ? 'bg-[#561C08] text-white shadow-xs font-semibold'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                {chip.label}
              </button>
            ))}

            <div className="ml-auto text-[11px] text-stone-400 font-sans tracking-wider uppercase hidden md:block">
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
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-sans font-medium border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 transition-colors"
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
                    : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 text-stone-700 dark:text-stone-300'
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
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-sans font-medium border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 transition-colors"
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
          {(storeCollections.length > 0 ? storeCollections : collectionsData)
            .filter(c => c.slug !== slug)
            .slice(0, 4)
            .map(col => {
              const rawImg = typeof (col as any).image === 'string'
                ? (col as any).image
                : ((col as any).image?.url || (col as any).image?.thumbnailUrl || '/images/editorial-banners/allura-collection.jpeg');
              const colTitle = (col as any).name || (col as any).title;
              return (
                <Link
                  key={col.id}
                  to={`/collections/${col.slug}`}
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

