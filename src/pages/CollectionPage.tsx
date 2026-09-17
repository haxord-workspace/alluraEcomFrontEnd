import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { collectionsData } from '../data/collections';
import { productsData } from '../data/products';
import { ProductCard } from '../components/ui/ProductCard';
import { ArrowRight } from 'lucide-react';

export const CollectionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const currentCollection = collectionsData.find(c => c.slug === slug) || collectionsData[0];

  const collectionProducts = productsData.filter(p => {
    if (slug === 'bridal-edit') return p.occasion === 'Bridal' || p.price > 12000;
    if (slug === 'festive-edit') return p.occasion === 'Festive';
    if (slug === 'party-wear') return p.occasion === 'Party Wear';
    if (slug === 'modest-wear' || slug === 'western') return p.category === 'Modest Wear' || p.occasion === 'Modest Wear';
    if (slug === 'ethnic') return p.category === 'Ethnic Wear' || p.occasion === 'Ethnic';
    return true;
  });

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* Editorial Collection Hero Banner */}
      <section className="relative h-[48vh] sm:h-[55vh] min-h-[380px] w-full overflow-hidden bg-allura-bgSecondary">
        <img
          src={currentCollection.image}
          alt={currentCollection.title}
          className="w-full h-full object-cover object-[center_top]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-allura-darkBrown/85 via-allura-darkBrown/40 to-transparent flex items-end">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 w-full text-allura-card space-y-3">
            <span className="text-[11px] font-sans font-bold tracking-[0.3em] uppercase text-allura-gold">
              {currentCollection.tagline}
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal uppercase tracking-tight">
              {currentCollection.title}
            </h1>
            <p className="text-xs sm:text-sm text-allura-bgSecondary font-sans max-w-xl leading-relaxed">
              {currentCollection.description}
            </p>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-allura-border/60">
          <span className="text-xs font-sans text-allura-muted tracking-wider uppercase">
            Showing <strong className="text-allura-text">{collectionProducts.length}</strong> curated pieces
          </span>
          <Link
            to="/shop"
            className="text-xs font-sans font-bold tracking-wider text-allura-goldDark hover:text-allura-darkBrown uppercase inline-flex items-center gap-1"
          >
            <span>View All Collections</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {collectionProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Other Curated Edits Carousel / Links */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-8 border-t border-allura-border/60">
        <div className="text-center mb-8">
          <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark block mb-1">
            CONTINUE BROWSING
          </span>
          <h3 className="font-serif text-2xl text-allura-text font-normal uppercase">
            EXPLORE OTHER EDITS
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {collectionsData
            .filter(c => c.slug !== slug)
            .slice(0, 4)
            .map(col => (
              <Link
                key={col.id}
                to={`/collections/${col.slug}`}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-allura-border/60 shadow-xs"
              >
                <img
                  src={col.image}
                  alt={col.title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-allura-darkBrown/60 flex items-center justify-center p-3 text-center text-allura-card group-hover:bg-allura-darkBrown/40 transition-colors">
                  <h4 className="font-serif text-sm sm:text-base font-medium tracking-wider uppercase">
                    {col.title}
                  </h4>
                </div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
};
