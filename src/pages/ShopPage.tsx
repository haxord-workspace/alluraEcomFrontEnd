import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, ArrowUpDown, Check, RotateCcw, Sparkles } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from '../components/ui/ProductCard';
import { BottomSheet } from '../components/modals/BottomSheet';

export const ShopPage: React.FC = () => {
  const { products, categories, isLoadingProducts } = useShop();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const catParam = searchParams.get('category');
  const occParam = searchParams.get('occasion');

  const [selectedCategory, setSelectedCategory] = useState<string>(catParam || 'All');
  const [selectedOccasion, setSelectedOccasion] = useState<string>(occParam || 'All');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(25000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating'>(
    filterParam === 'new' ? 'newest' : 'featured'
  );

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
    let result = [...products];

    if (filterParam === 'bestseller') {
      result = result.filter(p => p.isBestSeller);
    } else if (filterParam === 'new') {
      result = result.filter(p => p.isNewArrival);
    }

    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (selectedOccasion !== 'All') {
      result = result.filter(p => p.occasion === selectedOccasion);
    }

    if (selectedSizes.length > 0) {
      result = result.filter(p => p.sizes.some(s => selectedSizes.includes(s)));
    }

    if (selectedColors.length > 0) {
      result = result.filter(p =>
        p.colors.some(c =>
          selectedColors.some(sc => c.name.toLowerCase().includes(sc.toLowerCase()))
        )
      );
    }

    result = result.filter(p => p.price <= maxPrice);

    if (inStockOnly) {
      result = result.filter(p => p.inStock);
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
        break;
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'featured':
      default:
        result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        break;
    }

    return result;
  }, [
    products,
    selectedCategory,
    selectedOccasion,
    selectedSizes,
    selectedColors,
    maxPrice,
    inStockOnly,
    sortBy,
    filterParam,
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
        <span className="text-[11px] font-sans font-bold tracking-[0.28em] uppercase text-allura-goldDark block mb-2">
          THE ALLURA EDIT
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl text-allura-text font-normal tracking-tight uppercase">
          SHOP ALL
        </h1>
        <p className="text-xs sm:text-sm text-allura-muted font-sans mt-2">
          Handcrafted ethnic silhouettes, contemporary modest co-ords and bespoke festive wear.
        </p>
      </div>

      {/* Horizontal Category Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-8 border-b border-allura-border/60">
        {categoryOptions.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-sans font-medium whitespace-nowrap transition-all duration-200 ${
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
      <div className="lg:hidden flex items-center justify-between gap-3 mb-6 bg-allura-card p-3 rounded-lg border border-allura-border">
        <button
          onClick={() => setIsFilterSheetOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 text-xs font-sans font-bold text-allura-text py-2 rounded border border-allura-border/80 bg-allura-bg uppercase tracking-wider"
        >
          <SlidersHorizontal size={14} className="text-allura-goldDark" />
          <span>Filters {hasActiveFilters && '•'}</span>
        </button>

        <button
          onClick={() => setIsSortSheetOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 text-xs font-sans font-bold text-allura-text py-2 rounded border border-allura-border/80 bg-allura-bg uppercase tracking-wider"
        >
          <ArrowUpDown size={14} className="text-allura-goldDark" />
          <span>Sort By</span>
        </button>
      </div>

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

            <div className="flex items-center gap-2 text-xs font-sans">
              <span className="text-allura-muted">Sort By:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-allura-card border border-allura-border rounded px-3 py-1.5 text-xs text-allura-text focus:outline-none focus:border-allura-gold font-sans cursor-pointer"
              >
                <option value="featured">Featured Curations</option>
                <option value="newest">New Arrivals</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Customer Rating</option>
              </select>
            </div>
          </div>

          {isLoadingProducts ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-allura-goldDark border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-sans text-allura-muted">Loading the atelier catalog...</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} showCategory={true} />
              ))}
            </div>
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
          {[
            { label: 'Featured Curations', value: 'featured' },
            { label: 'Newest First', value: 'newest' },
            { label: 'Price: Low to High', value: 'price-asc' },
            { label: 'Price: High to Low', value: 'price-desc' },
            { label: 'Highest Rated', value: 'rating' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setSortBy(opt.value as any);
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
