import React from 'react';
import { Menu, Search, ShoppingBag } from 'lucide-react';
import { AlluraLogo } from '../common/AlluraLogo';
import { useShop } from '../../context/ShopContext';

export const MobileHeader: React.FC = () => {
  const { cartCount, setIsMobileMenuOpen, setIsSearchOpen, setIsCartOpen } = useShop();

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#561C08]/15 h-16 px-4 grid grid-cols-3 items-center safe-top">
      {/* Left Menu Trigger */}
      <div className="flex items-center justify-start">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1.5 -ml-1 text-[#000000] hover:text-[#561C08] transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} strokeWidth={1.8} />
        </button>
      </div>

      {/* Center Logo - Mathematically centered */}
      <div className="flex items-center justify-center">
        <AlluraLogo size="sm" showTagline={false} imgClassName="h-11" />
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="p-1.5 text-[#000000] hover:text-[#561C08] transition-colors"
          aria-label="Open Search"
        >
          <Search size={20} strokeWidth={1.8} />
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="p-1.5 -mr-1 text-[#000000] hover:text-[#561C08] transition-colors relative flex items-center justify-center"
          aria-label="Open Cart"
        >
          <ShoppingBag size={20} strokeWidth={1.8} />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-[#561C08] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
