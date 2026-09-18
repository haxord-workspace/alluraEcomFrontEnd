import type { Banner } from '../types';

export const mockBannersData: Banner[] = [
  {
    id: 'ban-1',
    title: 'Festive Luxury 2026 Collection',
    headline: 'Grace in Every Thread',
    description: 'Discover handcrafted Anarkalis, delicate silks, and ethereal modest silhouettes for celebrations.',
    ctaText: 'Explore The Edit',
    targetUrl: '/shop',
    desktopImage: '/images/hero-banners/festive-hero-desktop.jpg',
    mobileImage: '/images/hero-banners/festive-hero-mobile.jpg',
    startDate: '2026-08-01',
    endDate: '2026-11-30',
    status: 'Active',
    position: 'Hero',
  },
  {
    id: 'ban-2',
    title: 'Editorial Occasion Campaign',
    headline: 'Modern Heritage Couture',
    description: 'Designed in Kerala, crafted for discerning women worldwide.',
    ctaText: 'View Lookbook',
    targetUrl: '/lookbook',
    desktopImage: '/images/editorial-banners/editorial-autumn-desktop.jpg',
    mobileImage: '/images/editorial-banners/editorial-autumn-mobile.jpg',
    startDate: '2026-09-01',
    endDate: '2026-10-31',
    status: 'Active',
    position: 'Editorial',
  },
];
