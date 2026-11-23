import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { AlluraLogo } from '../common/AlluraLogo';
import { useShop } from '../../context/ShopContext';
import { getFooterContentPages } from '../../service/cms.api';
import type { ContentPageLink } from '../../service/cms.api';
import { cleanProfileValue as clean, formatPhoneDisplay } from '../../utils/storeProfile';

const DEFAULT_LEGAL_NAME = 'Allura Boutique';
const DEFAULT_TAGLINE = 'WEAR YOUR STORY WITH ALLURA';

const InstagramIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

// Social links for the "Follow Us" column. Add WhatsApp / Facebook / YouTube here later;
// extra entries render as a row of icon circles with a 12px gap.
const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    handle: '@alluraboutiqueofficial',
    href: 'https://www.instagram.com/alluraboutiqueofficial',
    Icon: InstagramIcon,
  },
];

const HEADING_CLASS = 'text-[12px] font-heading font-bold tracking-[0.25em] text-white uppercase';

export const Footer: React.FC = () => {
  const { storeSettings } = useShop();
  const profile = storeSettings?.boutiqueProfile;

  // Strip trailing periods so "Pvt. Ltd." + ". All rights reserved." doesn't render "Ltd.."
  const legalName = (clean(profile?.legalName) || DEFAULT_LEGAL_NAME).replace(/\.+$/, '');
  const tagline = clean(profile?.tagline) || DEFAULT_TAGLINE;
  const whatsappNumber = clean(profile?.whatsappNumber);
  const address = clean(profile?.address);
  const supportEmail = clean(profile?.supportEmail);

  // Published content pages for "Customer Care"; null while loading, [] when none or on error
  const [contentPages, setContentPages] = useState<ContentPageLink[] | null>(null);
  useEffect(() => {
    let active = true;
    getFooterContentPages().then((pages) => {
      if (active) setContentPages(pages);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="print:hidden bg-[#561C08] border-t border-[#3D1406] pt-16 pb-24 lg:pb-12 text-[#F7E6C8] max-md:pt-7 max-md:pb-[88px]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.4fr_1fr] items-start gap-10 lg:gap-12 pb-14 border-b border-white/15 max-md:gap-6 max-md:pb-6">
          {/* Col 1: Brand & Logo */}
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col items-start space-y-4 max-md:space-y-2.5">
            <AlluraLogo size="md" variant="light" showTagline={false} />
            <p className="text-xs text-[#F7E6C8]/80 font-body leading-relaxed pt-2 max-w-sm">
              A curated destination for modern women who appreciate elegance, quality and individuality.
            </p>
            {/* On mobile the tagline is shown in the bottom bar instead */}
            <div className="pt-2 text-xs font-heading font-bold uppercase tracking-wider text-[#F7E6C8] max-md:hidden">
              {tagline}
            </div>
          </div>

          {/* Col 2: Shop
          <div className="space-y-4">
            <h4 className="text-[12px] font-heading font-bold tracking-[0.25em] text-white uppercase">
              SHOP
            </h4>
            <ul className="space-y-2.5 text-xs text-[#F7E6C8]/80 font-body font-medium">
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/shop?filter=new" className="hover:text-white transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/collections" className="hover:text-white transition-colors">
                  Collections
                </Link>
              </li>
              <li>
                <Link to="/size-guide" className="hover:text-white transition-colors">
                  Size Guide
                </Link>
              </li>
              LOOKBOOK DISABLED (already inside this commented-out column; no nested comment markers)
              <li>
                <Link to="/lookbook" className="hover:text-white transition-colors">
                  Lookbook
                </Link>
              </li>
            </ul>
          </div> */}

          {/* Col 3: About
          <div className="space-y-4">
            <h4 className="text-[12px] font-heading font-bold tracking-[0.25em] text-white uppercase">
              ABOUT
            </h4>
            <ul className="space-y-2.5 text-xs text-[#F7E6C8]/80 font-body font-medium">
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/contact#location" className="hover:text-white transition-colors">
                  Store Location
                </Link>
              </li>
              <li>
                <Link to="/about#craftsmanship" className="hover:text-white transition-colors">
                  Craftsmanship
                </Link>
              </li>
              <li>
                <span className="text-[#F7E6C8]/50 cursor-not-allowed">Careers (Coming Soon)</span>
              </li>
            </ul>
          </div> */}

          {/* Col 4: Customer Care */}
          <div className="space-y-4">
            <h4 className={HEADING_CLASS}>
              CUSTOMER CARE
            </h4>
            <ul className="space-y-2.5 text-xs text-[#F7E6C8]/80 font-body font-medium">
              <li>
                <Link to="/account" className="hover:text-white transition-colors">
                  Track Order
                </Link>
              </li>
              {/* TEMPORARILY DISABLED — hardcoded dummy policy links, replaced by the
                  dynamic content-page links rendered after FAQs below. Kept for restore.
              <li>
                <Link to="/shipping-returns" className="hover:text-white transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link to="/shipping-returns#exchange" className="hover:text-white transition-colors">
                  Exchange & Returns
                </Link>
              </li>
              */}
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  FAQs
                </Link>
              </li>
              {/* TEMPORARILY DISABLED — hardcoded dummy policy links (see note above).
              <li>
                <Link to="/pages/privacy-policy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/pages/terms-and-conditions" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              */}
              {/* Published content pages from GET /content/{slug}; skeleton while loading, nothing on error */}
              {contentPages === null
                ? [0, 1].map((i) => (
                  <li key={`content-skeleton-${i}`} aria-hidden="true" className="h-4 flex items-center">
                    <span className="block h-2.5 w-24 rounded bg-white/10 animate-pulse" />
                  </li>
                ))
                : contentPages.map((page) => (
                  <li key={page.slug}>
                    <Link to={`/pages/${page.slug}`} className="hover:text-white transition-colors">
                      {page.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Col 5: Get In Touch */}
          <div className="space-y-4">
            <h4 className={HEADING_CLASS}>
              GET IN TOUCH
            </h4>
            <ul className="space-y-3 text-xs text-[#F7E6C8]/80 font-body">
              {whatsappNumber && (
                <li className="flex items-center">
                  <span className="w-5 flex-shrink-0 flex items-center">
                    <Phone size={16} className="text-[#F7E6C8]" />
                  </span>
                  <a href={`tel:${whatsappNumber}`} className="pl-1.5 hover:text-white transition-colors">
                    {formatPhoneDisplay(whatsappNumber)}
                  </a>
                </li>
              )}
              {supportEmail && (
                <li className="flex items-center">
                  <span className="w-5 flex-shrink-0 flex items-center">
                    <Mail size={16} className="text-[#F7E6C8]" />
                  </span>
                  <a href={`mailto:${supportEmail}`} className="pl-1.5 break-all hover:text-white transition-colors">
                    {supportEmail}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start">
                  <span className="w-5 flex-shrink-0 flex items-center pt-px">
                    <MapPin size={16} className="text-[#F7E6C8]" />
                  </span>
                  <span className="pl-1.5 leading-snug">{address}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Col 4: Follow Us */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-4 max-md:space-y-2.5">
            <h4 className={HEADING_CLASS}>
              FOLLOW US
            </h4>
            {SOCIAL_LINKS.length === 1 ? (
              // Single network: icon + handle as one clickable row
              <a
                href={SOCIAL_LINKS[0].href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={SOCIAL_LINKS[0].label}
                className="group inline-flex items-center gap-3 text-xs font-body text-[#F7E6C8]/80 hover:text-white transition-colors duration-200"
              >
                <span className="w-9 h-9 rounded-full border border-[#F7E6C8]/30 flex items-center justify-center text-[#F7E6C8] transition-colors duration-200 group-hover:bg-[#F7E6C8] group-hover:text-[#561C08]">
                  {React.createElement(SOCIAL_LINKS[0].Icon)}
                </span>
                <span>{SOCIAL_LINKS[0].handle}</span>
              </a>
            ) : (
              // Multiple networks: row of icon circles
              <div className="flex items-center gap-3">
                {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-9 h-9 rounded-full border border-[#F7E6C8]/30 flex items-center justify-center text-[#F7E6C8] transition-colors duration-200 hover:bg-[#F7E6C8] hover:text-[#561C08]"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            )}
            <p className="text-xs text-[#F7E6C8]/60 font-body leading-relaxed">
              Follow us for new arrivals and festive collections.
            </p>
          </div>
        </div>

        {/* Bottom Rights Bar — mobile: centered stack; desktop: copyright left, credit right */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 text-[11px] max-md:pt-5 font-body text-[#F7E6C8]/70 tracking-wide text-center">
          <p>© 2026 {legalName}. All rights reserved.</p>
          <p className="font-heading font-semibold uppercase text-xs text-[#F7E6C8] md:hidden">
            {tagline}
          </p>
          <p>
            Developed by <span className="font-semibold text-[#F7E6C8]">Haxord Technologies</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
