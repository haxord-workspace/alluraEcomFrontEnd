import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { productsData } from '../data/products';
import { ProductCard } from '../components/ui/ProductCard';
import type { Product } from '../types';

export const WishlistPage: React.FC = () => {
  const { wishlist, addToCart } = useShop();

  const wishlistProducts = productsData.filter((p: Product) => wishlist.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-[11px] font-sans font-bold tracking-[0.28em] uppercase text-allura-goldDark">
          SAVED PIECES
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl text-allura-text font-normal uppercase tracking-tight">
          YOUR ALLURA EDIT ({wishlistProducts.length})
        </h1>
        <p className="text-xs sm:text-sm text-allura-muted font-sans">
          Saved bespoke silhouettes and outfits ready for your next celebration.
        </p>
      </div>

      {wishlistProducts.length === 0 ? (
        <div className="py-20 text-center space-y-4 max-w-md mx-auto bg-allura-card rounded-2xl border border-allura-border p-8">
          <div className="w-16 h-16 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-gold mx-auto">
            <Heart size={28} />
          </div>
          <h3 className="font-serif text-2xl font-medium text-allura-text">
            Your Wishlist is Empty
          </h3>
          <p className="text-xs text-allura-muted font-sans leading-relaxed">
            Tap the heart icon on any outfit while browsing to curate your personal luxury collection.
          </p>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-allura-goldDark text-allura-card text-xs font-sans font-bold tracking-[0.2em] uppercase py-3 px-6 rounded-sm"
            >
              <span>EXPLORE EDITS</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {wishlistProducts.map((product: Product) => (
            <div key={product.id} className="space-y-2">
              <ProductCard product={product} />
              <button
                onClick={() => addToCart(product, product.sizes[0] || 'M', product.colors[0])}
                className="w-full bg-allura-darkBrown hover:bg-allura-goldDark text-allura-card text-[10px] sm:text-xs font-sans font-bold tracking-wider uppercase py-2.5 px-3 rounded-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <ShoppingBag size={13} />
                <span>MOVE TO BAG</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
