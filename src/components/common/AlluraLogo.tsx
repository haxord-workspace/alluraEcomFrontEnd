import React from 'react';
import { Link } from 'react-router-dom';

interface AlluraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'brown' | 'light' | 'dark' | 'gold';
  showTagline?: boolean;
  clickable?: boolean;
  className?: string;
}

export const AlluraLogo: React.FC<AlluraLogoProps> = ({
  size = 'md',
  variant = 'brown',
  showTagline = false,
  clickable = true,
  className = '',
}) => {
  const isLight = variant === 'light';
  const brandColor = isLight ? '#FFFFFF' : '#561C08';

  const imgHeight = 
    size === 'sm' ? 'h-9' :
    size === 'lg' ? 'h-16' :
    size === 'xl' ? 'h-20' : 'h-12';

  const logoContent = (
    <div className={`flex flex-col items-center justify-center text-center select-none group cursor-pointer leading-none ${className}`}>
      {isLight ? (
        /* Crisp Vector for dark/inverted backgrounds (e.g. Footer) */
        <div className="flex flex-col items-center">
          <svg
            width={size === 'sm' ? 24 : size === 'lg' ? 44 : size === 'xl' ? 56 : 34}
            height={size === 'sm' ? 18 : size === 'lg' ? 32 : size === 'xl' ? 40 : 25}
            viewBox="0 0 72 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-1 transition-transform duration-300 group-hover:scale-105"
          >
            {/* 3 Diamond Star Tips */}
            <path d="M14 10C14 7.5 12.5 6 10 6C12.5 6 14 4.5 14 2C14 4.5 15.5 6 18 6C15.5 6 14 7.5 14 10Z" fill={brandColor} />
            <path d="M36 8C36 5.5 34.5 4 32 4C34.5 4 36 2.5 36 0C36 2.5 37.5 4 40 4C37.5 4 36 5.5 36 8Z" fill={brandColor} />
            <path d="M58 10C58 7.5 56.5 6 54 6C56.5 6 58 4.5 58 2C58 4.5 59.5 6 62 6C59.5 6 58 7.5 58 10Z" fill={brandColor} />
            {/* Outer Silhouette */}
            <path d="M14 9L25 36L36 7L47 36L58 9L51 46H21L14 9Z" stroke={brandColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Monogram A */}
            <path d="M26 38L36 15L46 38" stroke={brandColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M28 35H44" stroke={brandColor} strokeWidth="3" strokeLinecap="round" />
            <path d="M18 46H54" stroke={brandColor} strokeWidth="3.2" strokeLinecap="round" />
          </svg>
          <span
            className={`font-heading font-bold uppercase tracking-[0.24em] ${
              size === 'sm' ? 'text-base' : size === 'lg' ? 'text-3xl' : size === 'xl' ? 'text-4xl' : 'text-2xl'
            }`}
            style={{ color: brandColor, fontFamily: '"Quicksand", sans-serif' }}
          >
            ALLURA
          </span>
          <span
            className={`font-heading font-medium uppercase tracking-[0.38em] mt-0.5 ${
              size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-[12px]' : size === 'xl' ? 'text-[14px]' : 'text-[10px]'
            }`}
            style={{ color: brandColor, fontFamily: '"Quicksand", sans-serif' }}
          >
            BOUTIQUE
          </span>
        </div>
      ) : (
        /* Official Brand Logo Asset for clean white/beige backgrounds */
        <img
          src="/allura-logo-official.png"
          alt="ALLURA BOUTIQUE"
          className={`${imgHeight} w-auto object-contain transition-transform duration-300 group-hover:scale-105 mix-blend-multiply`}
        />
      )}

      {/* Official Brand Tagline */}
      {showTagline && (
        <span
          className="font-body font-semibold uppercase mt-1.5 tracking-[0.2em] text-[8px]"
          style={{ color: brandColor, fontFamily: '"Poppins", sans-serif' }}
        >
          WEAR YOUR STORY WITH ALLURA
        </span>
      )}
    </div>
  );

  if (clickable) {
    return (
      <Link to="/" className="inline-flex items-center justify-center" aria-label="Allura Boutique Home">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};

