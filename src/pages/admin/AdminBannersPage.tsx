import React, { useState } from 'react';
import { 
  Plus, 
  Monitor, 
  Smartphone, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Tag, 
  ArrowRight, 
  ExternalLink,
  RotateCcw 
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ImageUploadDropzone } from '../../components/admin/ImageUploadDropzone';
import type { Banner } from '../../types';

export const AdminBannersPage: React.FC = () => {
  const { banners, addBanner, updateBanner, deleteBanner, resetBannersToDefault, hasPermission } = useAdmin();
  const { showToast } = useShop();

  const [selectedViewport, setSelectedViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [positionFilter, setPositionFilter] = useState<'All' | 'Hero' | 'Editorial' | 'Secondary'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteModalBanner, setDeleteModalBanner] = useState<Banner | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [headline, setHeadline] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badge, setBadge] = useState('PERINTHALMANNA ATELIER');
  const [eyebrow, setEyebrow] = useState('FESTIVE \'26 COLLECTION • HANDCRAFTED');
  const [offerPill, setOfferPill] = useState('Use Code FESTIVE15 for 15% Off • Free Express Shipping > ₹2,999');
  const [ctaText, setCtaText] = useState('SHOP NOW');
  const [targetUrl, setTargetUrl] = useState('/shop');
  const [secondaryCtaText, setSecondaryCtaText] = useState('AI LUXURY STYLIST');
  const [secondaryTargetUrl, setSecondaryTargetUrl] = useState('/ai-assistant');
  const [desktopImage, setDesktopImage] = useState('/images/hero-banners/slide-1.jpeg');
  const [mobileImage, setMobileImage] = useState('/images/hero-banners/slide-1.jpeg');
  const [position, setPosition] = useState<'Hero' | 'Editorial' | 'Secondary'>('Hero');
  const [status, setStatus] = useState<'Active' | 'Scheduled' | 'Draft'>('Active');

  const imagePresets = [
    { label: 'Slide 1 — Ivory Anarkali', url: '/images/hero-banners/slide-1.jpeg' },
    { label: 'Slide 2 — Royal Crimson Bridal', url: '/images/hero-banners/slide-2.jpeg' },
    { label: 'Slide 3 — Modest Pleated Set', url: '/images/hero-banners/slide-3.jpeg' },
    { label: 'Slide 4 — Festive Zari Weave', url: '/images/hero-banners/slide-4.jpeg' },
    { label: 'Editorial 1 — New Arrivals', url: '/images/editorial-banners/new-arrivals.jpeg' },
    { label: 'Editorial 2 — Allura Collection', url: '/images/editorial-banners/allura-collection.jpeg' },
  ];

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setTitle('');
    setHeadline('HANDCRAFTED MODEST & ETHNIC COUTURE');
    setSubtitle('Heirloom Kasavu zari, pure silk weaves, and graceful modest silhouettes tailored for your celebrations.');
    setBadge('PERINTHALMANNA ATELIER');
    setEyebrow('FESTIVE \'26 COLLECTION • HANDCRAFTED');
    setOfferPill('Use Code FESTIVE15 for 15% Off • Free Kerala Express Delivery > ₹2,999');
    setCtaText('SHOP NOW');
    setTargetUrl('/shop');
    setSecondaryCtaText('AI LUXURY STYLIST');
    setSecondaryTargetUrl('/ai-assistant');
    setDesktopImage('/images/hero-banners/slide-1.jpeg');
    setMobileImage('/images/hero-banners/slide-1.jpeg');
    setPosition('Hero');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setHeadline(banner.headline || banner.title);
    setSubtitle(banner.subtitle || banner.description);
    setBadge(banner.badge || 'PERINTHALMANNA ATELIER');
    setEyebrow(banner.eyebrow || 'CURATED ATELIER WEAR');
    setOfferPill(banner.offerPill || '');
    setCtaText(banner.ctaText || 'SHOP NOW');
    setTargetUrl(banner.targetUrl || '/shop');
    setSecondaryCtaText(banner.secondaryCtaText || '');
    setSecondaryTargetUrl(banner.secondaryTargetUrl || '');
    setDesktopImage(banner.desktopImage);
    setMobileImage(banner.mobileImage || banner.desktopImage);
    setPosition(banner.position as 'Hero' | 'Editorial' | 'Secondary');
    setStatus(banner.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline && !title) return;

    if (editingBanner) {
      updateBanner(editingBanner.id, {
        title: title || headline,
        headline,
        subtitle,
        description: subtitle,
        badge,
        eyebrow,
        offerPill,
        ctaText,
        targetUrl,
        secondaryCtaText,
        secondaryTargetUrl,
        desktopImage,
        mobileImage,
        position,
        status,
      });
      showToast('Banner updated successfully. Live storefront updated!', 'gold');
    } else {
      addBanner({
        title: title || headline,
        headline,
        subtitle,
        description: subtitle,
        badge,
        eyebrow,
        offerPill,
        ctaText,
        targetUrl,
        secondaryCtaText,
        secondaryTargetUrl,
        desktopImage,
        mobileImage,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '2026-12-31',
        status,
        position,
      });
      showToast('New hero banner published to homepage!', 'success');
    }

    setIsModalOpen(false);
  };

  const filteredBanners = banners.filter(
    b => positionFilter === 'All' || b.position === positionFilter
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            HOMEPAGE HERO & CAMPAIGN STUDIO
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Hero Banners & CTAs ({banners.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Customize homepage hero titles, subtitles, "Shop Now" buttons, links, and responsive photography in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Viewport Preview Selector */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200 text-xs font-sans">
            <button
              onClick={() => setSelectedViewport('desktop')}
              className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                selectedViewport === 'desktop' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              <Monitor size={14} />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setSelectedViewport('mobile')}
              className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                selectedViewport === 'mobile' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          <button
            type="button"
            onClick={resetBannersToDefault}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 border border-stone-200"
            title="Reset all marketing banners to default boutique photography and high-conversion copy"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          {hasPermission('marketing', 'create') && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Create Slide / Banner</span>
            </button>
          )}
        </div>
      </div>

      {/* Position Filters */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 text-xs font-sans">
        {(['All', 'Hero', 'Editorial', 'Secondary'] as const).map(pos => (
          <button
            key={pos}
            onClick={() => setPositionFilter(pos)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              positionFilter === pos
                ? 'bg-stone-900 text-white font-bold shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {pos === 'Hero' ? 'Homepage Hero Slider' : pos}
          </button>
        ))}
      </div>

      {/* Live Storefront Hero Preview Callout */}
      <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between text-xs font-sans">
        <div className="flex items-center gap-2 text-amber-900">
          <Sparkles size={16} className="text-allura-goldDark flex-shrink-0" />
          <span>
            <strong>Active Hero Slider:</strong> Banners marked as <span className="font-bold">"Hero"</span> and <span className="font-bold">"Active"</span> are automatically rendered live on the customer homepage slider.
          </span>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-allura-goldDark font-bold hover:underline"
        >
          <span>View Live Storefront</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Banners Grid / List */}
      <div className="space-y-6">
        {filteredBanners.map(banner => (
          <div
            key={banner.id}
            className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs space-y-4 p-6 hover:border-allura-gold/50 transition-colors"
          >
            {/* Header & Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  banner.position === 'Hero'
                    ? 'bg-amber-100 text-amber-900 border border-amber-200 font-mono'
                    : 'bg-stone-100 text-stone-700'
                }`}>
                  {banner.position === 'Hero' ? '★ Homepage Hero Slide' : `${banner.position} Banner`}
                </span>
                <h3 className="font-serif text-lg font-medium text-stone-900">
                  {banner.headline || banner.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={banner.status} size="sm" />
              </div>
            </div>

            {/* Viewport Live Simulation Box */}
            <div
              className={`mx-auto rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 relative group transition-all duration-300 ${
                selectedViewport === 'mobile' ? 'max-w-xs h-[420px]' : 'w-full h-72'
              }`}
            >
              <img
                src={selectedViewport === 'mobile' ? (banner.mobileImage || banner.desktopImage) : banner.desktopImage}
                alt={banner.headline || banner.title}
                className="w-full h-full object-cover object-[center_20%] sm:object-[center_top]"
              />
              
              {/* Subtle Luxury Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent flex flex-col justify-end p-6 text-white space-y-2">
                
                {/* Eyebrow / Badge */}
                {banner.badge && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-allura-gold bg-stone-900/60 backdrop-blur-sm px-2 py-0.5 rounded w-max">
                    <Sparkles size={10} />
                    <span>{banner.badge}</span>
                  </span>
                )}

                {/* Main Headline Title */}
                <p className={`font-serif font-normal uppercase leading-tight tracking-tight ${
                  selectedViewport === 'mobile' ? 'text-2xl' : 'text-3xl'
                }`}>
                  {banner.headline || banner.title}
                </p>

                {/* Subtitle / Description */}
                <p className="text-xs text-stone-200 line-clamp-2 leading-relaxed max-w-lg">
                  {banner.subtitle || banner.description}
                </p>

                {/* Offer Pill */}
                {banner.offerPill && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/20 backdrop-blur-sm text-[10px] font-sans text-stone-100 w-max">
                    <Tag size={10} className="text-allura-gold" />
                    <span>{banner.offerPill}</span>
                  </div>
                )}

                {/* CTA Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2C2926] text-white text-[11px] font-sans font-bold uppercase tracking-wider rounded-xl shadow-xs border border-white/20">
                    <span>{banner.ctaText || 'SHOP NOW'}</span>
                    <ArrowRight size={12} />
                  </span>

                  {banner.secondaryCtaText && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/30 backdrop-blur-sm text-white text-[10px] font-sans font-bold uppercase tracking-wider rounded-xl border border-white/30">
                      <span>{banner.secondaryCtaText}</span>
                    </span>
                  )}
                </div>

              </div>
            </div>

            {/* Banner Metadata & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-sans text-stone-500 pt-3 border-t border-stone-100 gap-3">
              <div className="flex flex-wrap items-center gap-4 text-[11px]">
                <span>
                  <strong className="text-stone-700">Button:</strong> "{banner.ctaText || 'SHOP NOW'}" &rarr; <span className="font-mono text-stone-600">{banner.targetUrl || '/shop'}</span>
                </span>
                {banner.secondaryCtaText && (
                  <span>
                    <strong className="text-stone-700">Secondary:</strong> "{banner.secondaryCtaText}" &rarr; <span className="font-mono text-stone-600">{banner.secondaryTargetUrl}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasPermission('marketing', 'edit') && (
                  <button
                    onClick={() => handleOpenEdit(banner)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit3 size={13} />
                    <span>Edit Hero Slide</span>
                  </button>
                )}

                {hasPermission('marketing', 'delete') && (
                  <button
                    onClick={() => setDeleteModalBanner(banner)}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-5 text-xs font-sans shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-serif text-2xl text-stone-900 font-normal">
                  {editingBanner ? 'Edit Hero Banner & CTAs' : 'Create New Hero Banner'}
                </h3>
                <p className="text-xs text-stone-500">
                  Configure titles, subtitles, "Shop Now" buttons, offer vouchers, and imagery for the homepage slider.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Position & Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
                    Banner Placement Position
                  </label>
                  <select
                    value={position}
                    onChange={e => setPosition(e.target.value as 'Hero' | 'Editorial' | 'Secondary')}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:outline-none"
                  >
                    <option value="Hero">★ Hero (Homepage Main Slider)</option>
                    <option value="Editorial">Editorial Split Campaign</option>
                    <option value="Secondary">Secondary Promo Banner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'Active' | 'Scheduled' | 'Draft')}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:outline-none"
                  >
                    <option value="Active">Active (Visible on Storefront)</option>
                    <option value="Draft">Draft (Hidden)</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">
                  Main Hero Title / Headline <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder="E.g. HANDCRAFTED MODEST & ETHNIC COUTURE"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-serif font-medium text-stone-900 focus:outline-none focus:border-stone-800"
                />
                <p className="text-[11px] text-stone-400 mt-0.5">
                  The primary bold serif title prominently displayed on the homepage slider.
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">
                  Hero Subtitle / Description <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={subtitle}
                  onChange={e => setSubtitle(e.target.value)}
                  placeholder="E.g. Heirloom Kasavu zari, pure silk weaves, and graceful modest silhouettes tailored for your sacred celebrations."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-stone-800"
                />
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Descriptive narrative subtitle providing context, fabric details, or occasion styling advice.
                </p>
              </div>

              {/* Eyebrow Badge & Offer Voucher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
                    Atelier Badge / Eyebrow Text
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={e => setBadge(e.target.value)}
                    placeholder="E.g. PERINTHALMANNA ATELIER"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
                    Offer / Promo Voucher Pill
                  </label>
                  <input
                    type="text"
                    value={offerPill}
                    onChange={e => setOfferPill(e.target.value)}
                    placeholder="E.g. Code FESTIVE15 for 15% Off"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Primary Call-to-Action Buttons */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-600">
                  Primary Action Button (e.g. "SHOP NOW")
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                      Button Label Text <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ctaText}
                      onChange={e => setCtaText(e.target.value)}
                      placeholder="E.g. SHOP NOW, SHOP COLLECTION"
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                      Button Target URL / Page <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={targetUrl}
                      onChange={e => setTargetUrl(e.target.value)}
                      placeholder="E.g. /shop, /collections/bridal-edit"
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Call-to-Action Button */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-600">
                  Secondary Action Button (Optional)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                      Secondary Button Text
                    </label>
                    <input
                      type="text"
                      value={secondaryCtaText}
                      onChange={e => setSecondaryCtaText(e.target.value)}
                      placeholder="E.g. AI LUXURY STYLIST, LOOKBOOK"
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                      Secondary Target URL
                    </label>
                    <input
                      type="text"
                      value={secondaryTargetUrl}
                      onChange={e => setSecondaryTargetUrl(e.target.value)}
                      placeholder="E.g. /ai-assistant, /lookbook"
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload & Presets Section */}
              <div className="space-y-4 pt-2 border-t border-stone-100">
                <ImageUploadDropzone
                  label="Desktop Banner Photography"
                  required
                  value={desktopImage}
                  onChange={(val) => {
                    setDesktopImage(val);
                    if (!mobileImage || mobileImage === desktopImage) {
                      setMobileImage(val);
                    }
                  }}
                  aspectRatioLabel="Recommended: 1920×800px (16:9 or 21:9 Wide)"
                  presets={imagePresets}
                  helperText="Upload any high-res banner directly from your computer/device or choose from presets. It automatically syncs to the customer storefront."
                />

                {/* Optional Mobile Image Upload */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-stone-600">
                      Mobile Viewport Image (Optional Portrait Crop)
                    </span>
                    {mobileImage !== desktopImage && (
                      <button
                        type="button"
                        onClick={() => setMobileImage(desktopImage)}
                        className="text-[10px] text-[#561C08] font-bold hover:underline"
                      >
                        Reset to Desktop Image
                      </button>
                    )}
                  </div>
                  
                  <ImageUploadDropzone
                    label="Mobile Banner Photography"
                    value={mobileImage}
                    onChange={(val) => setMobileImage(val)}
                    aspectRatioLabel="Recommended: 800×1000px (Portrait or Square)"
                    presets={imagePresets}
                    helperText="If omitted or identical, the desktop banner image will be used automatically on mobile viewports."
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider shadow-sm transition-colors"
                >
                  {editingBanner ? 'Save & Update Homepage' : 'Publish Hero Slide'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModalBanner}
        onClose={() => setDeleteModalBanner(null)}
        onConfirm={() => {
          if (deleteModalBanner) {
            deleteBanner(deleteModalBanner.id);
            showToast('Hero banner deleted from storefront', 'info');
            setDeleteModalBanner(null);
          }
        }}
        title="Delete Storefront Banner?"
        message={`Are you sure you want to remove "${deleteModalBanner?.headline || deleteModalBanner?.title}" from the storefront slider?`}
        confirmLabel="Delete Banner"
        isDestructive={true}
      />
    </div>
  );
};

export default AdminBannersPage;
