import React from 'react';
import { Link } from 'react-router-dom';

interface AlluraLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light' | 'gold';
  showTagline?: boolean;
  clickable?: boolean;
}

export const AlluraLogo: React.FC<AlluraLogoProps> = ({
  size = 'md',
  variant = 'dark',
  showTagline = true,
  clickable = true,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'light':
        return {
          crown: '#FCFAF6',
          text: '#FCFAF6',
          subtext: '#EFE5D5',
          tagline: '#DED2C1',
        };
      case 'gold':
        return {
          crown: '#A77B43',
          text: '#8B6335',
          subtext: '#A77B43',
          tagline: '#A77B43',
        };
      case 'dark':
      default:
        return {
          crown: '#A77B43',
          text: '#2C2926',
          subtext: '#8B6335',
          tagline: '#A77B43',
        };
    }
  };

  const colors = getColors();

  const logoContent = (
    <div className="flex flex-col items-center justify-center text-center select-none group cursor-pointer leading-none">
      {/* Crown Emblem */}
      <svg
        width={size === 'sm' ? 22 : size === 'lg' ? 34 : 26}
        height={size === 'sm' ? 16 : size === 'lg' ? 24 : 18}
        viewBox="0 0 60 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-1 transition-transform duration-300 group-hover:scale-105"
      >
        {/* Crown 3 pearls */}
        <circle cx="30" cy="5" r="3.2" fill={colors.crown} />
        <circle cx="10" cy="11" r="2.8" fill={colors.crown} />
        <circle cx="50" cy="11" r="2.8" fill={colors.crown} />
        {/* Crown peaks */}
        <path
          d="M30 9L43 28L51 13L46 36H14L9 13L17 28L30 9Z"
          stroke={colors.crown}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Monogram A/W */}
        <path
          d="M23 27L30 17L37 27"
          stroke={colors.crown}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 36C22 34 38 34 44 36"
          stroke={colors.crown}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>

      {/* ALLURA */}
      <span
        className={`font-serif font-medium uppercase tracking-[0.22em] ${
          size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'
        }`}
        style={{ color: colors.text }}
      >
        ALLURA
      </span>

      {/* BOUTIQUE */}
      <span
        className={`font-serif font-light uppercase tracking-[0.32em] mt-0.5 ${
          size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-[11px]' : 'text-[9px]'
        }`}
        style={{ color: colors.subtext }}
      >
        BOUTIQUE
      </span>

      {/* Tagline */}
      {showTagline && (
        <span
          className="font-sans uppercase font-semibold mt-1 tracking-[0.22em] text-[7px]"
          style={{ color: colors.tagline }}
        >
          PARTY WEAR • ETHNIC • MODEST WEAR
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
