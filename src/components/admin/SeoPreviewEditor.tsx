import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import type { ProductSEO } from '../../types';

interface SeoPreviewEditorProps {
  seo: ProductSEO;
  onChange: (updated: ProductSEO) => void;
  defaultSlug?: string;
}

export const SeoPreviewEditor: React.FC<SeoPreviewEditorProps> = ({
  seo,
  onChange,
  defaultSlug = 'classic-cream-anarkali-gown',
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'social'>('google');

  const titleLength = seo.metaTitle?.length || 0;
  const descLength = seo.metaDescription?.length || 0;

  const isTitleIdeal = titleLength >= 30 && titleLength <= 60;
  const isDescIdeal = descLength >= 100 && descLength <= 160;

  const calculateScore = () => {
    let score = 20;
    if (seo.metaTitle) score += 25;
    if (isTitleIdeal) score += 15;
    if (seo.metaDescription) score += 20;
    if (isDescIdeal) score += 10;
    if (seo.keywords && seo.keywords.length > 0) score += 10;
    return Math.min(100, score);
  };

  const completeness = calculateScore();

  return (
    <div className="space-y-6 text-xs font-sans">
      {/* Completeness Score Bar */}
      <div className="p-4 bg-allura-bgSecondary/60 rounded-xl border border-allura-border flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-allura-muted">
            SEO HEALTH & COMPLETENESS
          </span>
          <div className="flex items-center gap-2">
            <div className="w-32 bg-stone-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  completeness >= 80 ? 'bg-emerald-600' : completeness >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="font-bold text-allura-darkBrown">{completeness}% Score</span>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
            completeness >= 80
              ? 'bg-emerald-100 text-emerald-800'
              : completeness >= 50
              ? 'bg-amber-100 text-amber-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {completeness >= 80 ? 'Healthy' : completeness >= 50 ? 'Needs Attention' : 'Incomplete'}
        </span>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-allura-muted">
              Page Meta Title
            </label>
            <span
              className={`text-[10px] ${
                isTitleIdeal ? 'text-emerald-700 font-semibold' : 'text-stone-400'
              }`}
            >
              {titleLength} / 60 characters
            </span>
          </div>
          <input
            type="text"
            value={seo.metaTitle || ''}
            onChange={e => onChange({ ...seo, metaTitle: e.target.value })}
            placeholder="E.g. Classic Cream Anarkali Gown | Allura Boutique Kerala"
            className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-allura-muted">
              Meta Description
            </label>
            <span
              className={`text-[10px] ${
                isDescIdeal ? 'text-emerald-700 font-semibold' : 'text-stone-400'
              }`}
            >
              {descLength} / 160 characters
            </span>
          </div>
          <textarea
            rows={3}
            value={seo.metaDescription || ''}
            onChange={e => onChange({ ...seo, metaDescription: e.target.value })}
            placeholder="E.g. Handcrafted pure georgette Anarkali gown with golden zari threadwork and organza dupatta. Complimentary express delivery across India from Allura Atelier."
            className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-allura-muted mb-1">
            Keywords (Comma separated)
          </label>
          <input
            type="text"
            value={seo.keywords?.join(', ') || ''}
            onChange={e =>
              onChange({
                ...seo,
                keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean),
              })
            }
            placeholder="anarkali dress, modest fashion, kerala boutique, bridal lehenga"
            className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold"
          />
        </div>
      </div>

      {/* Live SERP Preview */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-allura-border/60 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-allura-goldDark flex items-center gap-1.5">
            <Globe size={13} />
            <span>Search Engine Snippet Preview</span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('google')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                activeTab === 'google' ? 'bg-allura-darkBrown text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              Google Search
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('social')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                activeTab === 'social' ? 'bg-allura-darkBrown text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              Social Card
            </button>
          </div>
        </div>

        {activeTab === 'google' ? (
          <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-xs space-y-1 font-sans">
            <p className="text-[11px] text-stone-500 truncate">
              https://alluraboutique.in &gt; product &gt; {defaultSlug}
            </p>
            <h4 className="text-blue-800 hover:underline text-sm font-medium font-serif leading-snug cursor-pointer">
              {seo.metaTitle || 'Classic Cream Anarkali Gown | Handcrafted Fashion Kerala | Allura'}
            </h4>
            <p className="text-stone-600 text-xs leading-relaxed line-clamp-2">
              {seo.metaDescription ||
                'Discover handcrafted Anarkalis, delicate silks, and ethereal modest silhouettes. Handcrafted in Kerala with pure textiles and complimentary luxury express delivery.'}
            </p>
          </div>
        ) : (
          <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="h-28 bg-stone-100 flex items-center justify-center text-stone-400 text-xs">
              <span>{seo.ogImage ? 'Social OpenGraph Image Attached' : 'Default Atelier Social Card'}</span>
            </div>
            <div className="p-3 space-y-1">
              <span className="text-[10px] text-stone-400 uppercase font-mono">ALLURABOUTIQUE.IN</span>
              <p className="font-serif text-xs font-bold text-stone-900">{seo.ogTitle || seo.metaTitle || 'Allura Boutique Kerala'}</p>
              <p className="text-[11px] text-stone-500 line-clamp-2">{seo.ogDescription || seo.metaDescription}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
