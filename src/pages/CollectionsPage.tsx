import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, RotateCcw } from 'lucide-react';
import { useStoreCollections, collectionImageUrl } from '../hooks/useStoreCollections';

const PLACEHOLDER_IMAGE = '/images/editorial-banners/allura-collection.jpeg';

/** Card-shaped shimmer placeholders that mirror the real collection tiles */
const CollectionsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" aria-busy="true" aria-label="Loading collections">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="allura-shimmer relative aspect-[4/3] rounded-2xl bg-allura-bgSecondary border border-allura-border/60"
      >
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 space-y-2.5">
          <div className="h-5 sm:h-6 w-2/3 rounded-md bg-allura-border/70" />
          <div className="h-3 w-5/6 rounded bg-allura-border/50" />
          <div className="h-3 w-1/4 rounded bg-allura-border/50" />
        </div>
      </div>
    ))}
  </div>
);

/** Shows a shimmer until the (often large, base64) image is decoded, then fades it in */
const FadeInImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      {!loaded && <div className="allura-shimmer absolute inset-0 bg-allura-bgSecondary" aria-hidden="true" />}
      <img
        src={failed ? PLACEHOLDER_IMAGE : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!failed) setFailed(true);
          else setLoaded(true);
        }}
        className={`w-full h-full object-cover object-top group-hover:scale-105 transition-[transform,opacity] duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
};

/** /collections — every ACTIVE collection from GET /store/collections */
export const CollectionsPage: React.FC = () => {
  const { collections, status, retry } = useStoreCollections();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8 sm:space-y-12">
      <header className="text-center space-y-2">
        <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark block">
          CURATED EDITS
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal uppercase">Our Collections</h1>
      </header>

      {status === 'loading' ? (
        <CollectionsSkeleton />
      ) : status === 'error' ? (
        <div className="py-16 text-center space-y-4">
          <p className="text-sm font-sans text-allura-muted">We couldn't load collections right now.</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 min-h-11 px-6 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold tracking-wider uppercase rounded-xl transition-colors"
          >
            <RotateCcw size={14} />
            <span>Retry</span>
          </button>
        </div>
      ) : collections.length === 0 ? (
        <div className="py-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-allura-bgSecondary text-allura-goldDark flex items-center justify-center mx-auto border border-allura-border">
            <Layers size={24} />
          </div>
          <p className="text-sm font-sans text-allura-muted">New collections are coming soon.</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 min-h-11 px-6 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold tracking-wider uppercase rounded-xl transition-colors"
          >
            <span>Shop all</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {collections.map(col => (
            <Link
              key={col.id}
              to={`/collections/${col.slug || col.id}`}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-allura-border/60 shadow-subtle bg-allura-bgSecondary"
            >
              <FadeInImage src={collectionImageUrl(col) || PLACEHOLDER_IMAGE} alt={col.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-allura-darkBrown/85 via-allura-darkBrown/30 to-transparent flex items-end">
                <div className="p-5 sm:p-6 text-allura-card space-y-1.5 w-full">
                  {col.isFeatured && (
                    <span className="text-[10px] font-sans font-bold tracking-[0.25em] uppercase text-allura-gold">Featured</span>
                  )}
                  <h2 className="font-serif text-xl sm:text-2xl font-normal uppercase tracking-tight">{col.name}</h2>
                  {col.description && <p className="text-xs font-sans text-allura-card/80 line-clamp-2">{col.description}</p>}
                  {Array.isArray(col.products) && col.products.length > 0 && (
                    <span className="text-[11px] font-sans text-allura-card/75 block">
                      {col.products.length} {col.products.length === 1 ? 'Piece' : 'Pieces'}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 pt-1 text-[11px] font-sans font-bold tracking-[0.2em] uppercase">
                    Explore <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
