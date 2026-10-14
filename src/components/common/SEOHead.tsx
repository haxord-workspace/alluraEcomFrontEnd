import React, { useEffect } from 'react';
import type { SEOMetadata } from '../../service/seo.api';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  robots?: { index: boolean; follow: boolean };
  structuredData?: Record<string, any> | Record<string, any>[];
  seoOverride?: SEOMetadata | null;
}

/**
 * Universal SEO Head Manager for Allura Storefront.
 * Dynamically synchronizes document title, meta tags, OpenGraph,
 * Twitter cards, canonical links, and Schema.org JSON-LD structured data.
 */
export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonicalUrl,
  keywords,
  ogImage,
  ogType = 'website',
  robots = { index: true, follow: true },
  structuredData,
  seoOverride,
}) => {
  // Apply fallback hierarchy: Explicit Override > Page Props > Defaults
  const finalTitle =
    seoOverride?.metaTitle ||
    (title ? `${title} | Allura Boutique` : 'Allura Boutique | Luxury Indian & Modest Couture Atelier');

  const finalDescription =
    seoOverride?.metaDescription ||
    description ||
    'Curated Indian luxury fashion, handcrafted Kasavu weaves, and elegant modest apparel from Kerala.';

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const finalCanonical = seoOverride?.canonicalUrl || canonicalUrl || currentUrl;

  const finalKeywords = seoOverride?.keywords || keywords;

  const finalOgImage =
    seoOverride?.openGraph?.image ||
    ogImage ||
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80';

  const finalOgTitle = seoOverride?.openGraph?.title || seoOverride?.metaTitle || title || finalTitle;
  const finalOgDescription = seoOverride?.openGraph?.description || finalDescription;

  const finalRobots = seoOverride?.robots || robots;
  const robotsContent = `${finalRobots.index ? 'index' : 'noindex'}, ${finalRobots.follow ? 'follow' : 'nofollow'}`;

  useEffect(() => {
    // 1. Update Document Title
    document.title = finalTitle;

    // Helper to set or update meta tag by name
    const setMetaTag = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper to set or update meta tag by property (OpenGraph)
    const setOgTag = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Standard Meta Tags
    setMetaTag('description', finalDescription);
    setMetaTag('robots', robotsContent);
    if (finalKeywords && finalKeywords.length > 0) {
      setMetaTag('keywords', finalKeywords.join(', '));
    }

    // 3. Canonical Link
    if (finalCanonical) {
      let linkEl = document.querySelector('link[rel="canonical"]');
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.setAttribute('rel', 'canonical');
        document.head.appendChild(linkEl);
      }
      linkEl.setAttribute('href', finalCanonical);
    }

    // 4. OpenGraph Social Cards
    setOgTag('og:title', finalOgTitle);
    setOgTag('og:description', finalOgDescription);
    setOgTag('og:type', ogType);
    setOgTag('og:url', finalCanonical);
    if (finalOgImage) {
      setOgTag('og:image', finalOgImage);
    }

    // 5. Twitter Social Cards
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', finalOgTitle);
    setMetaTag('twitter:description', finalOgDescription);
    if (finalOgImage) {
      setMetaTag('twitter:image', finalOgImage);
    }

    // 6. Schema.org JSON-LD Structured Data
    const scriptId = 'allura-schema-jsonld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (structuredData) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(structuredData);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [
    finalTitle,
    finalDescription,
    finalCanonical,
    finalKeywords,
    finalOgImage,
    finalOgTitle,
    finalOgDescription,
    robotsContent,
    ogType,
    structuredData,
  ]);

  return null;
};

export default SEOHead;
