import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Sparkles, Heart, UserRound } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const MobileBottomNav: React.FC = () => {
  const { wishlist } = useShop();
  const location = useLocation();

  const navItems = [
    { label: 'Home', to: '/', icon: Home, exact: true },
    { label: 'Shop', to: '/shop', icon: ShoppingBag },
    { label: 'Collections', to: '/collections/festive-edit', icon: Sparkles },
    { label: 'Wishlist', to: '/wishlist', icon: Heart, badge: wishlist.length },
    { label: 'Account', to: '/account', icon: UserRound },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-allura-card/95 backdrop-blur-md border-t border-allura-border shadow-bottom-sheet safe-bottom">
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {navItems.map(item => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to.split('?')[0]);

          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center justify-center relative py-1 transition-all duration-200 ${
                isActive ? 'text-allura-goldDark' : 'text-allura-muted hover:text-allura-text'
              }`}
            >
              {/* Active Indicator Top Line */}
              {isActive && (
                <span className="absolute top-0 w-8 h-[2px] bg-allura-gold rounded-full" />
              )}

              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.7}
                  className={`transition-transform duration-200 ${
                    isActive ? 'scale-110' : ''
                  }`}
                />
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2 bg-allura-gold text-allura-card text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] tracking-wider uppercase mt-1 font-sans ${
                  isActive ? 'font-semibold text-allura-goldDark' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
