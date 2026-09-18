import React, { useState } from 'react';
import { Plus, Monitor, Smartphone, Trash2 } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminBannersPage: React.FC = () => {
  const { banners, addBanner, deleteBanner } = useAdmin();
  const [selectedViewport, setSelectedViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('Explore The Edit');
  const [targetUrl, setTargetUrl] = useState('/shop');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    addBanner({
      title,
      headline,
      description,
      ctaText,
      targetUrl,
      desktopImage: '/images/hero-banners/festive-hero-desktop.jpg',
      mobileImage: '/images/hero-banners/festive-hero-mobile.jpg',
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      status: 'Active',
      position: 'Hero',
    });
    setTitle('');
    setHeadline('');
    setDescription('');
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            EDITORIAL VISUAL ASSETS
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Storefront Banners ({banners.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Hero carousel banners, editorial campaign callouts, and multi-device preview layouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200 text-xs font-sans">
            <button
              onClick={() => setSelectedViewport('desktop')}
              className={`p-1.5 rounded-lg flex items-center gap-1 font-semibold ${
                selectedViewport === 'desktop' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              <Monitor size={14} />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setSelectedViewport('mobile')}
              className={`p-1.5 rounded-lg flex items-center gap-1 font-semibold ${
                selectedViewport === 'mobile' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>Upload Banner</span>
          </button>
        </div>
      </div>

      {/* Banners List */}
      <div className="space-y-6">
        {banners.map(banner => (
          <div
            key={banner.id}
            className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs space-y-4 p-6"
          >
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                  {banner.position} Banner
                </span>
                <h3 className="font-serif text-lg font-medium text-stone-900">{banner.title}</h3>
              </div>
              <StatusBadge status={banner.status} size="sm" />
            </div>

            {/* Viewport Preview Box */}
            <div
              className={`mx-auto rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 relative group transition-all ${
                selectedViewport === 'mobile' ? 'max-w-xs h-96' : 'w-full h-56'
              }`}
            >
              <img
                src={selectedViewport === 'mobile' ? banner.mobileImage : banner.desktopImage}
                alt={banner.headline}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent flex flex-col justify-end p-6 text-white space-y-1">
                <p className="font-serif text-2xl font-bold">{banner.headline}</p>
                <p className="text-xs text-stone-200 line-clamp-1">{banner.description}</p>
                <div className="pt-2">
                  <span className="inline-block px-4 py-1.5 bg-allura-gold text-white text-[11px] font-sans font-bold uppercase tracking-wider rounded-lg">
                    {banner.ctaText}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-sans text-stone-500 pt-2">
              <span className="font-mono text-[11px]">Link: {banner.targetUrl}</span>
              <button
                onClick={() => deleteBanner(banner.id)}
                className="text-rose-700 hover:underline text-xs flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span>Delete Banner</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs font-sans shadow-2xl">
            <h3 className="font-serif text-xl text-stone-900">Add Campaign Banner</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Banner Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="E.g. Autumn Editorial Edit"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Overlay Headline</label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder="E.g. Timeless Grace & Silks"
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Subtext</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={e => setCtaText(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Target Link URL</label>
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={e => setTargetUrl(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 text-white rounded-xl font-bold uppercase"
                >
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
