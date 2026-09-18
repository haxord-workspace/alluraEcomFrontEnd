import React from 'react';
import { Menu, Search, ShoppingBag } from 'lucide-react';
import { AlluraLogo } from '../common/AlluraLogo';
import { useShop } from '../../context/ShopContext';

export const MobileHeader: React.FC = () => {
  const { cartCount, setIsMobileMenuOpen, setIsSearchOpen, setIsCartOpen } = useShop();

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#561C08]/15 py-3 px-4 flex items-center justify-between safe-top">
      {/* Left Menu Trigger */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="p-1.5 text-[#000000] hover:text-[#561C08] transition-colors"
        aria-label="Open Navigation Menu"
      >
        <Menu size={22} strokeWidth={1.8} />
      </button>

      {/* Center Logo */}
      <div className="flex-1 flex justify-center">
        <AlluraLogo size="sm" showTagline={false} />
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="p-1.5 text-[#000000] hover:text-[#561C08] transition-colors"
          aria-label="Open Search"
        >
          <Search size={20} strokeWidth={1.8} />
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="p-1.5 text-[#000000] hover:text-[#561C08] transition-colors relative"
          aria-label="Open Cart"
        >
          <ShoppingBag size={20} strokeWidth={1.8} />
          {cartCount > 0 && (
            <span className="absolute 0 top-0.5 right-0.5 bg-[#561C08] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
