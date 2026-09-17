import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { OccasionItem } from '../../types';

interface OccasionCardProps {
  item: OccasionItem;
}

export const OccasionCard: React.FC<OccasionCardProps> = ({ item }) => {
  return (
    <Link
      to={`/collections/${item.slug}`}
      className="group flex flex-col items-center select-none text-center"
    >
      {/* Arched Top Image Container */}
      <div className="relative w-full aspect-[3/4.2] overflow-hidden arch-top bg-allura-bgSecondary shadow-sm border border-allura-border/50">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-108"
          loading="lazy"
        />

        {/* Subtle Warm Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-allura-darkBrown/40 via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-300" />

        {/* Floating Explore Indicator on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="w-10 h-10 rounded-full bg-allura-card/90 backdrop-blur-md text-allura-darkBrown flex items-center justify-center shadow-luxury transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <ArrowRight size={16} />
          </span>
        </div>
      </div>

      {/* Typography Details Below */}
      <div className="mt-4 flex flex-col items-center">
        <h3 className="font-serif text-sm sm:text-base font-semibold tracking-[0.15em] uppercase text-allura-text group-hover:text-allura-goldDark transition-colors">
          {item.title}
        </h3>
        <p className="font-sans text-[11px] sm:text-xs text-allura-muted mt-0.5 tracking-wide">
          {item.subtitle}
        </p>
      </div>
    </Link>
  );
};
