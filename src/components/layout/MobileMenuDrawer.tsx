import React from 'react';
import { Link } from 'react-router-dom';
import { X, MessageCircle, Phone, MapPin, ChevronRight } from 'lucide-react';
import { AlluraLogo } from '../common/AlluraLogo';
import { useShop } from '../../context/ShopContext';

export const MobileMenuDrawer: React.FC = () => {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useShop();

  if (!isMobileMenuOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-allura-darkBrown/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Drawer */}
      <div className="relative w-4/5 max-w-sm bg-allura-bg h-full flex flex-col z-10 shadow-drawer overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-allura-border flex items-center justify-between bg-allura-card">
          <AlluraLogo size="sm" showTagline={true} />
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-allura-muted hover:text-allura-text transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-6 py-6 space-y-6">
          {/* Shop Section */}
          <div>
            <h3 className="text-[11px] font-sans font-bold tracking-[0.25em] text-allura-gold uppercase mb-3">
              Shop Categories
            </h3>
            <div className="space-y-1">
              {[
                { label: 'All Products', to: '/shop' },
                { label: 'New Arrivals', to: '/shop?filter=new' },
                { label: 'Best Sellers', to: '/shop?filter=bestseller' },
                { label: 'Ethnic Wear', to: '/collections/ethnic' },
                { label: 'Modest Wear', to: '/collections/modest-wear' },
                { label: 'Party Wear', to: '/collections/party-wear' },
              ].map(item => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2.5 text-sm font-sans text-allura-text hover:text-allura-gold transition-colors border-b border-allura-border/40"
                >
                  <span>{item.label}</span>
                  <ChevronRight size={14} className="text-allura-muted" />
                </Link>
              ))}
            </div>
          </div>

          {/* Collections Section */}
          <div>
            <h3 className="text-[11px] font-sans font-bold tracking-[0.25em] text-allura-gold uppercase mb-3">
              Curated Edits
            </h3>
            <div className="space-y-1">
              {[
                { label: 'Festive Edit', to: '/collections/festive-edit' },
                { label: 'Bridal Edit', to: '/collections/bridal-edit' },
                { label: 'The Occasion Edit', to: '/collections/party-wear' },
                { label: 'Everyday Elegance', to: '/collections/ethnic' },
                { label: 'The Allura Lookbook', to: '/lookbook', badge: 'New' },
              ].map(item => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2.5 text-sm font-sans text-allura-text hover:text-allura-gold transition-colors border-b border-allura-border/40"
                >
                  <div className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] bg-allura-gold text-allura-card px-1.5 py-0.5 rounded font-bold uppercase">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-allura-muted" />
                </Link>
              ))}
            </div>
          </div>

          {/* About & Info */}
          <div>
            <h3 className="text-[11px] font-sans font-bold tracking-[0.25em] text-allura-gold uppercase mb-3">
              Boutique & Care
            </h3>
            <div className="space-y-1">
              {[
                { label: 'Our Story', to: '/about' },
                { label: 'Visit Boutique (Perinthalmanna)', to: '/contact' },
                { label: 'Size Guide & Measurement', to: '/size-guide' },
                { label: 'Shipping & Exchange Policy', to: '/shipping-returns' },
              ].map(item => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2.5 text-sm font-sans text-allura-text hover:text-allura-gold transition-colors border-b border-allura-border/40"
                >
                  <span>{item.label}</span>
                  <ChevronRight size={14} className="text-allura-muted" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Contact Bar in Menu */}
        <div className="p-6 bg-allura-card border-t border-allura-border space-y-3">
          <div className="flex items-center gap-2 text-xs text-allura-muted">
            <MapPin size={14} className="text-allura-gold flex-shrink-0" />
            <span>Ooty Road, Perinthalmanna, Kerala</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <a
              href="https://wa.me/919037991774"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 border border-[#25D366]/30 py-2.5 px-3 rounded text-xs font-semibold tracking-wider transition-colors"
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </a>

            <a
              href="tel:+919037991774"
              className="flex items-center justify-center gap-2 bg-allura-bgSecondary text-allura-text hover:bg-allura-border py-2.5 px-3 rounded text-xs font-semibold tracking-wider transition-colors"
            >
              <Phone size={14} />
              <span>Call Us</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
