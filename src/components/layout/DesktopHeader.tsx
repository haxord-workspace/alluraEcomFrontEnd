import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, UserRound, ChevronDown } from 'lucide-react';
import { AlluraLogo } from '../common/AlluraLogo';
import { useShop } from '../../context/ShopContext';

export const DesktopHeader: React.FC = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { cartCount, wishlist, setIsCartOpen, setIsSearchOpen } = useShop();
  const location = useLocation();

  const navLinks = [
    { label: 'HOME', to: '/' },
    {
      label: 'SHOP',
      to: '/shop',
      hasDropdown: true,
      items: [
        { label: 'All Products', to: '/shop' },
        { label: 'New Arrivals', to: '/shop?filter=new' },
        { label: 'Best Sellers', to: '/shop?filter=bestseller' },
        { label: 'Ethnic Wear', to: '/collections/ethnic' },
        { label: 'Modest Wear', to: '/collections/modest-wear' },
        { label: 'Party Wear', to: '/collections/party-wear' },
      ],
    },
    {
      label: 'COLLECTIONS',
      to: '/collections/festive-edit',
      hasDropdown: true,
      items: [
        { label: 'Festive Edit', to: '/collections/festive-edit' },
        { label: 'Bridal Edit', to: '/collections/bridal-edit' },
        { label: 'The Occasion Edit', to: '/collections/party-wear' },
        { label: 'Everyday Elegance', to: '/collections/ethnic' },
        { label: 'Lookbook', to: '/lookbook' },
      ],
    },
    { label: 'ABOUT', to: '/about' },
  ];

  return (
    <header className="hidden lg:block sticky top-0 z-40 bg-[#FCFAF6] border-b border-[#DED2C1] shadow-xs transition-all duration-200">
      <div className="max-w-7xl mx-auto px-6 xl:px-8 h-20 flex items-center justify-between gap-4">
        {/* Left Navigation (30% width) */}
        <nav className="flex items-center gap-6 xl:gap-8 flex-1 justify-start">
          {navLinks.map(link => {
            const isActive = location.pathname === link.to;
            return (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.hasDropdown && setActiveDropdown(link.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  to={link.to}
                  className={`text-[12px] tracking-[0.2em] font-sans font-medium flex items-center gap-1 transition-colors py-2 ${
                    isActive ? 'text-[#8B6335] font-bold' : 'text-[#2C2926] hover:text-[#A77B43]'
                  }`}
                >
                  {link.label}
                  {link.hasDropdown && (
                    <ChevronDown
                      size={11}
                      className={`transition-transform duration-200 opacity-60 ${
                        activeDropdown === link.label ? 'rotate-180 text-[#A77B43]' : ''
                      }`}
                    />
                  )}
                </Link>

                {/* Dropdown */}
                {link.hasDropdown && activeDropdown === link.label && (
                  <div className="absolute top-full left-0 w-48 bg-[#FCFAF6] border border-[#DED2C1] rounded-sm shadow-luxury py-2 animate-fade-in z-50">
                    {link.items?.map(item => (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setActiveDropdown(null)}
                        className="block px-4 py-2 text-xs font-sans text-[#2C2926] hover:bg-[#EFE5D5]/60 hover:text-[#8B6335] transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Center Logo */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <AlluraLogo size="md" showTagline={true} />
        </div>

        {/* Right Actions (30% width) */}
        <div className="flex items-center gap-5 xl:gap-6 flex-1 justify-end">
          {/* Search Pill Input matching Reference */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2.5 bg-[#F2EDE4] hover:bg-[#EAE2D5] border border-[#DED2C1] rounded-full px-4 py-2 text-xs text-[#746A60] hover:text-[#2C2926] transition-all w-52 xl:w-60 justify-start group"
          >
            <Search size={14} className="text-[#A77B43] flex-shrink-0" />
            <span className="truncate text-xs font-sans">Search for dresses, sets, ...</span>
          </button>

          {/* Account */}
          <Link
            to="/account"
            className="text-[#2C2926] hover:text-[#A77B43] transition-colors p-1"
            title="My Account"
            aria-label="Account"
          >
            <UserRound size={20} strokeWidth={1.7} />
          </Link>

          {/* Wishlist */}
          <Link
            to="/wishlist"
            className="text-[#2C2926] hover:text-[#A77B43] transition-colors relative p-1"
            title="Wishlist"
            aria-label="Wishlist"
          >
            <Heart size={20} strokeWidth={1.7} />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#A77B43] text-[#FCFAF6] text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {wishlist.length}
              </span>
            )}
          </Link>

          {/* Cart Bag */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="text-[#2C2926] hover:text-[#A77B43] transition-colors relative p-1 group"
            title="Shopping Bag"
            aria-label="Shopping Bag"
          >
            <ShoppingBag size={21} strokeWidth={1.7} />
            <span className="absolute -top-1.5 -right-1.5 bg-[#342A25] text-[#FCFAF6] text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center leading-none group-hover:bg-[#A77B43] transition-colors">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
