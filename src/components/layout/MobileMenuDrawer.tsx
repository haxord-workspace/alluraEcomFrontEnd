import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Phone, MapPin, ChevronRight } from 'lucide-react';
import { AlluraLogo } from '../common/AlluraLogo';
import { useShop } from '../../context/ShopContext';
import { useStoreAddress } from '../../hooks/useStoreAddress';
import { useStoreCollections } from '../../hooks/useStoreCollections';
import { Modal } from '../common/Modal';

export const MobileMenuDrawer: React.FC = () => {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useShop();
  const { address } = useStoreAddress();
  const { collections } = useStoreCollections();

  return (
    <Modal
      open={isMobileMenuOpen}
      onClose={() => setIsMobileMenuOpen(false)}
      backdropClassName="lg:hidden fixed inset-0 z-50 flex"
      panelClassName="relative w-4/5 max-w-sm bg-allura-bg h-full flex flex-col z-10 shadow-drawer focus:outline-none"
      closeButtonClassName="absolute top-5 right-5 z-20 w-10 h-10 flex items-center justify-center rounded-full text-allura-muted hover:text-allura-text transition-colors"
    >
      <div className="flex-1 overflow-y-auto flex flex-col animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-allura-border flex items-center justify-between bg-allura-card">
          <AlluraLogo size="sm" showTagline={true} />
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
                { label: 'New Arrivals', to: '/shop?sort=new' },
                { label: 'Best Sellers', to: '/shop?sort=bestseller' },
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
                // Live ACTIVE collections from the API
                ...collections.slice(0, 8).map(c => ({ label: c.name, to: `/collections/${c.slug}`, badge: undefined as string | undefined })),
                { label: 'All Collections', to: '/collections', badge: undefined as string | undefined },
                // { label: 'The Allura Lookbook', to: '/lookbook', badge: 'New' }, // LOOKBOOK DISABLED
              ].map(item => (
                <Link
                  key={item.to}
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
                // Previously '/shipping-returns' (dummy page, now a redirect) — points at the dynamic content page
                { label: 'Shipping & Exchange Policy', to: '/pages/shipping-policy' },
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
          {address && (
            <div className="flex items-center gap-2 text-xs text-allura-muted">
              <MapPin size={14} className="text-allura-gold flex-shrink-0" />
              <span>{address}</span>
            </div>
          )}

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
    </Modal>
  );
};
