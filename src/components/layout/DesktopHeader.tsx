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
    <header className="hidden lg:block sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#561C08]/15 shadow-xs transition-all duration-200">
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
                  className={`text-[12px] tracking-[0.2em] font-heading font-medium flex items-center gap-1 transition-colors py-2 ${
                    isActive ? 'text-[#561C08] font-bold' : 'text-[#000000] hover:text-[#561C08]'
                  }`}
                >
                  {link.label}
                  {link.hasDropdown && (
                    <ChevronDown
                      size={11}
                      className={`transition-transform duration-200 opacity-60 ${
                        activeDropdown === link.label ? 'rotate-180 text-[#561C08]' : ''
                      }`}
                    />
                  )}
                </Link>

                {/* Dropdown */}
                {link.hasDropdown && activeDropdown === link.label && (
                  <div className="absolute top-full left-0 w-48 bg-[#FFFFFF] border border-[#561C08]/15 rounded-xl shadow-md py-2 animate-fade-in z-50">
                    {link.items?.map(item => (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setActiveDropdown(null)}
                        className="block px-4 py-2.5 text-xs font-body text-[#000000] hover:bg-[#F7E6C8] hover:text-[#561C08] transition-colors font-medium"
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
            className="flex items-center gap-2.5 bg-[#F5F5F5] hover:bg-[#F7E6C8] border border-[#561C08]/15 rounded-full px-4 py-2 text-xs font-body text-[#561C08] transition-colors w-48 xl:w-56"
            aria-label="Search boutique collection"
          >
            <Search size={14} className="text-[#561C08]" />
            <span className="truncate text-[11px] font-medium">Search dresses, sets...</span>
          </button>

          {/* Account */}
          <Link
            to="/account"
            className="text-[#000000] hover:text-[#561C08] transition-colors p-1 relative"
            aria-label="Account profile"
          >
            <UserRound size={20} />
          </Link>

          {/* Wishlist */}
          <Link
            to="/wishlist"
            className="text-[#000000] hover:text-[#561C08] transition-colors p-1 relative"
            aria-label={`Wishlist with ${wishlist.length} items`}
          >
            <Heart size={20} />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-[#561C08] text-white text-[9px] font-bold flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </Link>

          {/* Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="text-[#000000] hover:text-[#561C08] transition-colors p-1 relative"
            aria-label={`Cart drawer with ${cartCount} items`}
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-[#561C08] text-white text-[9px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
