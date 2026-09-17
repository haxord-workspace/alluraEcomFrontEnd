import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Share2 } from 'lucide-react';
import { AlluraLogo } from '../common/AlluraLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-allura-bgSecondary/60 border-t border-allura-border pt-16 pb-24 lg:pb-12 text-allura-text">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-14 border-b border-allura-border/70">
          {/* Col 1: Brand & Logo */}
          <div className="lg:col-span-1 flex flex-col items-start space-y-4">
            <AlluraLogo size="md" showTagline={true} />
            <p className="text-xs text-allura-muted font-sans leading-relaxed pt-2">
              A curated destination for modern women who appreciate elegance, quality and individuality.
            </p>
            <div className="pt-2 text-xs font-serif italic text-allura-goldDark">
              "Confidence looks good on you"
            </div>
          </div>

          {/* Col 2: Shop */}
          <div className="space-y-4">
            <h4 className="text-[12px] font-sans font-bold tracking-[0.25em] text-allura-darkBrown uppercase">
              SHOP
            </h4>
            <ul className="space-y-2.5 text-xs text-allura-muted font-sans">
              <li>
                <Link to="/shop" className="hover:text-allura-goldDark transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=new" className="hover:text-allura-goldDark transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/collections/festive-edit" className="hover:text-allura-goldDark transition-colors">
                  Collections
                </Link>
              </li>
              <li>
                <Link to="/size-guide" className="hover:text-allura-goldDark transition-colors">
                  Size Guide
                </Link>
              </li>
              <li>
                <Link to="/lookbook" className="hover:text-allura-goldDark transition-colors">
                  Lookbook
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: About */}
          <div className="space-y-4">
            <h4 className="text-[12px] font-sans font-bold tracking-[0.25em] text-allura-darkBrown uppercase">
              ABOUT
            </h4>
            <ul className="space-y-2.5 text-xs text-allura-muted font-sans">
              <li>
                <Link to="/about" className="hover:text-allura-goldDark transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-allura-goldDark transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/contact#location" className="hover:text-allura-goldDark transition-colors">
                  Store Location
                </Link>
              </li>
              <li>
                <Link to="/about#craftsmanship" className="hover:text-allura-goldDark transition-colors">
                  Craftsmanship
                </Link>
              </li>
              <li>
                <span className="text-allura-muted/70 cursor-not-allowed">Careers (Coming Soon)</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Customer Care */}
          <div className="space-y-4">
            <h4 className="text-[12px] font-sans font-bold tracking-[0.25em] text-allura-darkBrown uppercase">
              CUSTOMER CARE
            </h4>
            <ul className="space-y-2.5 text-xs text-allura-muted font-sans">
              <li>
                <Link to="/account" className="hover:text-allura-goldDark transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/shipping-returns" className="hover:text-allura-goldDark transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link to="/shipping-returns#exchange" className="hover:text-allura-goldDark transition-colors">
                  Exchange & Returns
                </Link>
              </li>
              <li>
                <Link to="/shipping-returns#faqs" className="hover:text-allura-goldDark transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link to="/shipping-returns#terms" className="hover:text-allura-goldDark transition-colors">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Get In Touch */}
          <div className="space-y-4">
            <h4 className="text-[12px] font-sans font-bold tracking-[0.25em] text-allura-darkBrown uppercase">
              GET IN TOUCH
            </h4>
            <ul className="space-y-3 text-xs text-allura-muted font-sans">
              <li className="flex items-center gap-2.5">
                <Phone size={14} className="text-allura-gold flex-shrink-0" />
                <a href="tel:+919037991774" className="hover:text-allura-goldDark transition-colors">
                  +91 9037991774
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={14} className="text-allura-gold flex-shrink-0" />
                <a href="tel:+919207801775" className="hover:text-allura-goldDark transition-colors">
                  +91 9207801775
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin size={14} className="text-allura-gold flex-shrink-0 mt-0.5" />
                <span className="leading-snug">OOTY ROAD, PERINTHALMANNA, KERALA</span>
              </li>
            </ul>

            {/* Social Icons */}
            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg=="
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-allura-card border border-allura-border flex items-center justify-center text-allura-muted hover:text-allura-gold hover:border-allura-gold transition-all"
                aria-label="Allura Boutique Instagram"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-allura-card border border-allura-border flex items-center justify-center text-allura-muted hover:text-allura-gold hover:border-allura-gold transition-all"
                aria-label="Allura Boutique Facebook"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-allura-card border border-allura-border flex items-center justify-center text-allura-muted hover:text-allura-gold hover:border-allura-gold transition-all"
                aria-label="Allura Boutique YouTube"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
                  <polygon points="10 15 15 12 10 9 10 15"/>
                </svg>
              </a>
              <a
                href="https://pinterest.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-allura-card border border-allura-border flex items-center justify-center text-allura-muted hover:text-allura-gold hover:border-allura-gold transition-all"
                aria-label="Allura Boutique Pinterest"
              >
                <Share2 size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Rights Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-sans text-allura-muted tracking-wide">
          <p>© 2026 Allura Boutique. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-allura-goldDark hover:text-allura-gold font-semibold uppercase tracking-wider text-[10px]">
              Staff / Admin Portal →
            </Link>
            <span className="opacity-40">•</span>
            <p className="flex items-center gap-1.5 font-serif italic text-xs">
              Designed for the modern you.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
