import React, { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  Database,
  Layers,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { SeoPreviewEditor } from '../../components/admin/SeoPreviewEditor';
import { useShop } from '../../context/ShopContext';
import {
  getEntitySEO,
  updateEntitySEO,
  resetEntitySEO,
  type SEOEntityType,
  type SEOMetadata,
} from '../../service/seo.api';
import { getDashboardSeo, type SeoAnalyticsResponse } from '../../service/adminDashboard';
import type { ProductSEO } from '../../types';
import { getBackendErrorMessage, getBackendSuccessMessage } from '../../utils/apiResponse';

export const AdminSeoPage: React.FC = () => {
  const { showToast } = useShop();

  const [entityType, setEntityType] = useState<SEOEntityType>('HOMEPAGE');
  const [entityId, setEntityId] = useState<string>('main');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [seoDashboard, setSeoDashboard] = useState<SeoAnalyticsResponse | null>(null);

  useEffect(() => {
    getDashboardSeo()
      .then(setSeoDashboard)
      .catch(err => console.warn('Could not load SEO dashboard analytics:', err));
  }, []);

  // Form state
  const [seoState, setSeoState] = useState<ProductSEO>({
    metaTitle: 'Allura Boutique | Luxury Indian & Modest Couture Atelier',
    metaDescription:
      'Discover handcrafted Anarkalis, delicate silks, and ethereal modest silhouettes crafted in Kerala. Complimentary express courier delivery on domestic orders above ₹2,999.',
    keywords: ['Allura boutique', 'Kerala fashion', 'luxury anarkali', 'modest couture', 'chanderi silk'],
    canonicalUrl: 'https://alluraboutique.in',
  });

  const [robotsIndex, setRobotsIndex] = useState<boolean>(true);
  const [robotsFollow, setRobotsFollow] = useState<boolean>(true);
  const [ogImage, setOgImage] = useState<string>('');

  // Fetch SEO whenever entityType or entityId changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getEntitySEO(entityType, entityId)
      .then((data) => {
        if (cancelled) return;
        if (data && (data.metaTitle || data.metaDescription)) {
          setSeoState({
            metaTitle: data.metaTitle || '',
            metaDescription: data.metaDescription || '',
            keywords: data.keywords || [],
            canonicalUrl: data.canonicalUrl || '',
          });
          setRobotsIndex(data.robots?.index !== false);
          setRobotsFollow(data.robots?.follow !== false);
          setOgImage(data.openGraph?.image || '');
        } else if (entityType === 'HOMEPAGE') {
          // Default boutique baseline
          setSeoState({
            metaTitle: 'Allura Boutique | Luxury Indian & Modest Couture Atelier',
            metaDescription:
              'Discover handcrafted Anarkalis, delicate silks, and ethereal modest silhouettes crafted in Kerala. Complimentary express courier delivery on domestic orders above ₹2,999.',
            keywords: ['Allura boutique', 'Kerala fashion', 'luxury anarkali', 'modest couture', 'chanderi silk'],
            canonicalUrl: 'https://alluraboutique.in',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  // Handle entity switch
  const handleTypeChange = (type: SEOEntityType) => {
    setEntityType(type);
    if (type === 'HOMEPAGE') {
      setEntityId('main');
    } else if (type === 'CONTENT_PAGE') {
      setEntityId('about-us');
    } else {
      setEntityId('');
    }
  };

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId.trim()) {
      showToast('Please enter an Entity ID or slug to save SEO overrides', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload: SEOMetadata = {
        metaTitle: seoState.metaTitle,
        metaDescription: seoState.metaDescription,
        canonicalUrl: seoState.canonicalUrl,
        keywords: seoState.keywords,
        robots: {
          index: robotsIndex,
          follow: robotsFollow,
        },
        openGraph: {
          title: seoState.metaTitle,
          description: seoState.metaDescription,
          image: ogImage || undefined,
        },
      };

      const res = await updateEntitySEO(entityType, entityId, payload);
      showToast(getBackendSuccessMessage(res, `SEO overrides saved for ${entityType}.`), 'success');
    } catch (err: any) {
      console.error(err);
      showToast(getBackendErrorMessage(err, 'Failed to update SEO metadata'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to auto defaults
  const handleReset = async () => {
    if (!entityId.trim()) return;
    if (!window.confirm(`Reset SEO metadata for ${entityType} (${entityId}) back to system defaults?`)) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetEntitySEO(entityType, entityId);
      showToast(getBackendSuccessMessage(res, 'SEO overrides removed. System will now generate dynamic tags automatically.'), 'gold');
      // Refetch
      const refreshed = await getEntitySEO(entityType, entityId);
      if (refreshed) {
        setSeoState({
          metaTitle: refreshed.metaTitle || '',
          metaDescription: refreshed.metaDescription || '',
          keywords: refreshed.keywords || [],
          canonicalUrl: refreshed.canonicalUrl || '',
        });
      }
    } catch (err: any) {
      showToast(getBackendErrorMessage(err, 'Failed to reset SEO metadata'), 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            ORGANIC DISCOVERY & METADATA ENGINE
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Storefront SEO & Crawler Management
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Control search engine titles, social graph previews, and live XML sitemaps with Redis cache invalidation.
          </p>
        </div>

        {/* Live Sitemap Links */}
        <div className="flex items-center gap-2">
          <a
            href="https://alluraecombackend.onrender.com/api/v1/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-sans font-medium flex items-center gap-1.5 transition-colors border border-stone-200 shadow-xs"
          >
            <FileCode size={13} />
            <span>Live sitemap.xml</span>
            <ExternalLink size={12} className="text-stone-400" />
          </a>
          <a
            href="https://alluraecombackend.onrender.com/api/v1/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-sans font-medium flex items-center gap-1.5 transition-colors border border-stone-200 shadow-xs"
          >
            <Database size={13} />
            <span>robots.txt</span>
            <ExternalLink size={12} className="text-stone-400" />
          </a>
        </div>
      </div>

      {/* Health Audit Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-bold uppercase text-stone-400">XML SITEMAP</span>
            <CheckCircle2 size={13} className="text-emerald-600" />
          </div>
          <p className="font-serif text-xl font-bold text-stone-900">
            {seoDashboard?.sitemapStatus.isAvailable ? 'Streaming Live' : 'Active'}
          </p>
          <span className="text-[10px] text-stone-400 font-mono">
            {seoDashboard?.sitemapStatus.route || '/sitemap.xml'}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-bold uppercase text-stone-400">ROBOTS POLICY</span>
            <CheckCircle2 size={13} className="text-emerald-600" />
          </div>
          <p className="font-serif text-xl font-bold text-stone-900">
            {seoDashboard?.robotsStatus.isAvailable ? 'Crawlers Allowed' : 'Active'}
          </p>
          <span className="text-[10px] text-stone-400 font-mono">
            {seoDashboard?.robotsStatus.route || '/robots.txt'}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-bold uppercase text-stone-400">MANAGED ENTITIES</span>
            <Sparkles size={13} className="text-allura-goldDark" />
          </div>
          <p className="font-serif text-xl font-bold text-emerald-800">
            {seoDashboard?.totalManagedEntities ?? 0}
          </p>
          <span className="text-[10px] text-stone-400">
            {seoDashboard?.byEntityType ? `${Object.keys(seoDashboard.byEntityType).length} categories/pages` : 'Storefront entities'}
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-bold uppercase text-stone-400">NOINDEX EXCLUSIONS</span>
            <Layers size={13} className="text-blue-600" />
          </div>
          <p className="font-serif text-xl font-bold text-stone-900">
            {seoDashboard?.noIndexEntitiesCount ?? 0}
          </p>
          <span className="text-[10px] text-stone-400">Pages hidden from bot crawl</span>
        </div>
      </div>

      {/* Entity Selector Tabs */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div>
          <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-stone-500 mb-2">
            Target Entity Type
          </label>
          <div className="flex flex-wrap gap-2">
            {(['HOMEPAGE', 'PRODUCT', 'CATEGORY', 'COLLECTION', 'CONTENT_PAGE'] as SEOEntityType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={`px-4 py-2 rounded-xl text-xs font-sans font-semibold transition-all ${
                  entityType === type
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Entity Identifier Input (if not homepage) */}
        {entityType !== 'HOMEPAGE' && (
          <div className="space-y-1">
            <label className="block text-[11px] font-sans font-bold uppercase tracking-wider text-stone-500">
              Entity ID or URL Slug
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder={
                  entityType === 'PRODUCT'
                    ? 'Enter Product ID or slug (e.g. 664a7891... or bridal-saree1)'
                    : entityType === 'CONTENT_PAGE'
                    ? 'e.g. about-us, privacy-policy, terms-and-conditions'
                    : 'Enter category or collection ID/slug'
                }
                className="flex-1 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>
            <p className="text-[10px] text-stone-400">
              The backend uses a hybrid strategy: if custom overrides exist here, they take precedence; otherwise, system auto-generates tags from entity properties.
            </p>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-500 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
            <span>Checking Redis cache and MongoDB SEO overrides...</span>
          </div>
        )}

        {/* SEO Preview Editor Form */}
        <SeoPreviewEditor
          seo={seoState}
          onChange={setSeoState}
          defaultSlug={entityId || 'preview-page'}
        />

        {/* Advanced Crawler Controls */}
        <div className="border-t border-stone-100 pt-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Advanced Search Engine & Social Directives
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Robots Directives */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <span className="text-[10px] font-bold uppercase text-stone-500">Robots Meta Tags</span>
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={robotsIndex}
                    onChange={(e) => setRobotsIndex(e.target.checked)}
                    className="rounded border-stone-300 text-stone-900 focus:ring-0"
                  />
                  <span>Allow Indexing (index)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={robotsFollow}
                    onChange={(e) => setRobotsFollow(e.target.checked)}
                    className="rounded border-stone-300 text-stone-900 focus:ring-0"
                  />
                  <span>Follow Links (follow)</span>
                </label>
              </div>
            </div>

            {/* OpenGraph Image URL */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <span className="text-[10px] font-bold uppercase text-stone-500">Social Share Image (OpenGraph)</span>
              <input
                type="text"
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
                placeholder="https://images.alluraboutique.com/og-banner.jpg"
                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-stone-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting || !entityId.trim()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw size={13} />
            <span>{isResetting ? 'Resetting...' : 'Reset to System Defaults'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !entityId.trim()}
            className="w-full sm:w-auto px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving & Purging Cache...' : 'Save SEO Overrides'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSeoPage;
