import React, { useState } from 'react';
import { SeoPreviewEditor } from '../../components/admin/SeoPreviewEditor';
import type { ProductSEO } from '../../types';

export const AdminSeoPage: React.FC = () => {
  const [globalSeo, setGlobalSeo] = useState<ProductSEO>({
    metaTitle: 'Allura Boutique | Luxury Indian & Modest Couture Atelier',
    metaDescription: 'Discover handcrafted Anarkalis, delicate silks, and ethereal modest silhouettes crafted in Kerala. Complimentary express courier delivery on domestic orders above ₹2,999.',
    keywords: ['Allura boutique', 'Kerala fashion', 'luxury anarkali', 'modest couture', 'chanderi silk'],
    canonicalUrl: 'https://alluraboutique.in',
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            ORGANIC DISCOVERY & METADATA
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Global Storefront SEO Health
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Audit meta titles, OpenGraph social cards, and Google SERP snippets across the boutique ecosystem.
          </p>
        </div>
      </div>

      {/* SEO Health Audit Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Products with SEO</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">100%</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Categories Optimized</span>
          <p className="font-serif text-2xl font-bold text-stone-900">5 / 5</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Missing Alt Tags</span>
          <p className="font-serif text-2xl font-bold text-emerald-700">0</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">SEO Health Indicator</span>
          <p className="font-serif text-2xl font-bold text-emerald-800">Optimal</p>
        </div>
      </div>

      {/* Main Global SEO Editor */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="font-serif text-xl text-stone-900">Homepage & Storefront Default Metadata</h3>
        <SeoPreviewEditor
          seo={globalSeo}
          onChange={setGlobalSeo}
          defaultSlug=""
        />
      </div>
    </div>
  );
};
