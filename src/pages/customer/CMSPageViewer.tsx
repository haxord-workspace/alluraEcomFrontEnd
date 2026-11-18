import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  Calendar,
  Share2,
  Check,
  ChevronRight,
  Home,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  PhoneCall,
  Info,
} from 'lucide-react';
import { getCMSPageBySlug } from '../../service/cms.api';
import type { CMSPage } from '../../service/cms.api';
import { SEOHead } from '../../components/common/SEOHead';

// Fallback contents for standard store policies in case the backend database has not yet seeded them
const FALLBACK_PAGES: Record<string, { title: string; excerpt: string; content: string }> = {
  'privacy-policy': {
    title: 'Privacy Policy',
    excerpt: 'How Allura Boutique protects and respects your personal information and privacy.',
    content: `
      <h2>1. Introduction</h2>
      <p>Welcome to Allura Boutique. We value your trust and are committed to safeguarding your personal data. This Privacy Policy details our practices concerning data collection, usage, and protection across our online storefront and mobile experience.</p>
      
      <h2>2. Information We Collect</h2>
      <p>When you browse our boutique, create an account, or complete a purchase, we may collect:</p>
      <ul>
        <li><strong>Personal Identifiers:</strong> Name, phone number, shipping address, and email address.</li>
        <li><strong>Transaction Details:</strong> Order history, payment confirmation references, and customer service inquiries.</li>
        <li><strong>Technical Information:</strong> Device type, IP address, and browsing actions to personalize your shopping experience.</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We process your data strictly to fulfill your boutique orders, deliver parcels via our verified logistics partners, provide customer support, and inform you of new seasonal releases.</p>

      <h2>4. Data Protection & Security</h2>
      <p>All sensitive transaction data is transmitted using modern SSL/TLS encryption. We never store raw credit card numbers or banking passwords on our servers.</p>

      <h2>5. Contact Our Privacy Officer</h2>
      <p>If you have any questions or wish to exercise your data rights, please contact our concierge team at <strong>privacy@alluraboutique.com</strong> or via phone at <strong>+91 9037991774</strong>.</p>
    `,
  },
  'terms-and-conditions': {
    title: 'Terms & Conditions',
    excerpt: 'The terms governing your use of the Allura Boutique storefront, purchases, and boutique services.',
    content: `
      <h2>1. Agreement to Terms</h2>
      <p>By accessing or shopping at Allura Boutique, you agree to adhere to these Terms & Conditions. Please read them thoroughly prior to placing your orders.</p>
      
      <h2>2. Product Representation & Artistry</h2>
      <p>Our ethnic garments and handcrafted apparel are curated with artisan precision. Subtle variations in texture, weave, and hand embroidery are intrinsic hallmarks of authentic craftsmanship and shall not be deemed defects.</p>

      <h2>3. Pricing & Payments</h2>
      <p>All prices displayed are in Indian Rupees (INR) inclusive of applicable taxes unless specified otherwise. We reserve the right to correct accidental pricing errors.</p>

      <h2>4. Delivery & Exchange Policy</h2>
      <p>All dispatches are subject to our 7-Day Exchange Policy. Garments must remain unused, unaltered, and intact with all original brand tags and invoice documentation.</p>

      <h2>5. Governing Jurisdiction</h2>
      <p>These terms are governed by the laws of India, under the jurisdiction of the courts of Malappuram district, Kerala.</p>
    `,
  },
  'terms-conditions': {
    title: 'Terms & Conditions',
    excerpt: 'The terms governing your use of the Allura Boutique storefront, purchases, and boutique services.',
    content: `
      <h2>1. Agreement to Terms</h2>
      <p>By accessing or shopping at Allura Boutique, you agree to adhere to these Terms & Conditions. Please read them thoroughly prior to placing your orders.</p>
      
      <h2>2. Product Representation & Artistry</h2>
      <p>Our ethnic garments and handcrafted apparel are curated with artisan precision. Subtle variations in texture, weave, and hand embroidery are intrinsic hallmarks of authentic craftsmanship.</p>

      <h2>3. Pricing & Orders</h2>
      <p>All orders placed are subject to inventory confirmation and acceptance.</p>
    `,
  },
  'return-refund-policy': {
    title: 'Return & Refund Policy',
    excerpt: 'Complete information regarding our hassle-free exchange, returns, and refunds process.',
    content: `
      <h2>1. 7-Day Boutique Exchange Window</h2>
      <p>We take pride in our silhouettes and want you to be completely satisfied. If you require a different size or wish to exchange an item, you may request an exchange within 7 days of receiving your order.</p>

      <h2>2. Eligibility Criteria</h2>
      <p>Items must be in unwashed, unworn condition with original boutique tags attached. Customized, tailored, or altered items are non-returnable.</p>

      <h2>3. Refund Processing</h2>
      <p>Upon receipt and quality inspection at our atelier in Perinthalmanna, refunds will be credited back to your original payment method within 5–7 business days.</p>
    `,
  },
};

interface CMSPageViewerProps {
  slugOverride?: string;
}


export const CMSPageViewer: React.FC<CMSPageViewerProps> = ({ slugOverride }) => {
  const params = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const slug = slugOverride || params.slug || '';

  const [page, setPage] = useState<CMSPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setNotFound(false);
    setIsFallback(false);

    getCMSPageBySlug(slug)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setPage(data);
          setIsFallback(false);
        } else {
          // Check if we have a graceful boutique fallback for this standard slug
          const fallback = FALLBACK_PAGES[slug.toLowerCase()];
          if (fallback) {
            setPage({
              _id: `fallback-${slug}`,
              title: fallback.title,
              slug,
              content: fallback.content,
              excerpt: fallback.excerpt,
              status: 'PUBLISHED',
              visibility: 'PUBLIC',
              publishedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            setIsFallback(true);
          } else {
            setNotFound(true);
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching CMS page:', err);
        const fallback = FALLBACK_PAGES[slug.toLowerCase()];
        if (fallback) {
          setPage({
            _id: `fallback-${slug}`,
            title: fallback.title,
            slug,
            content: fallback.content,
            excerpt: fallback.excerpt,
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setIsFallback(true);
        } else {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Estimate reading time from content
  const content = page?.content;
  const readingTime = useMemo(() => {
    if (!content) return 1;
    const textOnly = content.replace(/<[^>]*>/g, ' ');
    const words = textOnly.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 180));
  }, [content]);

  // Handle Share / Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // ─── Loading Skeleton View ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[70vh] max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8 animate-pulse">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-stone-200/70 rounded-md" />
          <div className="h-4 w-4 bg-stone-200/50 rounded-md" />
          <div className="h-4 w-28 bg-stone-200/70 rounded-md" />
        </div>

        {/* Title & Metadata Skeleton */}
        <div className="space-y-4 pt-2 border-b border-allura-border/60 pb-8">
          <div className="h-10 sm:h-12 w-3/4 bg-stone-200/80 rounded-xl" />
          <div className="h-5 w-1/2 bg-stone-200/60 rounded-lg" />
          <div className="flex gap-4 pt-2">
            <div className="h-4 w-24 bg-stone-200/50 rounded-md" />
            <div className="h-4 w-24 bg-stone-200/50 rounded-md" />
          </div>
        </div>

        {/* Content Paragraph Skeletons */}
        <div className="space-y-4 pt-4">
          <div className="h-4 w-full bg-stone-200/60 rounded-md" />
          <div className="h-4 w-11/12 bg-stone-200/60 rounded-md" />
          <div className="h-4 w-4/5 bg-stone-200/60 rounded-md" />
          <div className="h-28 w-full bg-stone-100 rounded-2xl my-6" />
          <div className="h-4 w-full bg-stone-200/60 rounded-md" />
          <div className="h-4 w-5/6 bg-stone-200/60 rounded-md" />
        </div>
      </div>
    );
  }

  // ─── Not Found / 404 View ────────────────────────────────────────────────────
  if (notFound || !page) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 sm:py-24">
        <SEOHead
          title="Page Not Found"
          robots={{ index: false, follow: false }}
        />
        <div className="max-w-lg w-full bg-allura-card rounded-3xl border border-allura-border/80 p-8 sm:p-12 shadow-luxury text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-allura-bgSecondary border border-allura-border flex items-center justify-center text-allura-goldDark">
            <FileText size={28} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
              STOREFRONT DIRECTORY
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-allura-muted font-sans leading-relaxed">
              The page <code className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-mono text-xs">/{slug}</code> is either in draft mode, scheduled for future publication, or does not exist.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-allura-border text-xs font-sans font-semibold text-allura-text hover:bg-allura-bgSecondary transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} />
              <span>Go Back</span>
            </button>
            <Link
              to="/shop"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-allura-darkBrown text-white text-xs font-sans font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Explore Collection</span>
            </Link>
          </div>

          <div className="border-t border-allura-border/60 pt-6 text-xs text-allura-muted flex items-center justify-center gap-4">
            <Link to="/faq" className="hover:text-allura-darkBrown transition-colors inline-flex items-center gap-1">
              <HelpCircle size={13} />
              <span>Client FAQs</span>
            </Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-allura-darkBrown transition-colors inline-flex items-center gap-1">
              <PhoneCall size={13} />
              <span>Contact Atelier</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Format publication date
  const displayDate = page.publishedAt || page.updatedAt;
  const formattedDate = displayDate
    ? new Date(displayDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-[80vh] py-10 sm:py-16">
      <SEOHead
        title={page.title}
        description={page.excerpt || `Read ${page.title} on Allura Boutique.`}
        canonicalUrl={`https://alluraboutique.in/pages/${page.slug}`}
        ogType="article"
        structuredData={{
          '@context': 'https://schema.org/',
          '@type': 'WebPage',
          name: page.title,
          description: page.excerpt,
          url: `https://alluraboutique.in/pages/${page.slug}`,
        }}
      />
      {/* Container */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Navigation Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-sans text-allura-muted">
          <Link to="/" className="hover:text-allura-text transition-colors flex items-center gap-1">
            <Home size={13} />
            <span>Home</span>
          </Link>
          <ChevronRight size={12} className="text-stone-400" />
          <span className="text-stone-400">Pages</span>
          <ChevronRight size={12} className="text-stone-400" />
          <span className="text-allura-text font-medium truncate max-w-[200px] sm:max-w-none">
            {page.title}
          </span>
        </nav>

        {/* Page Header */}
        <header className="space-y-4 border-b border-allura-border pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-allura-bgSecondary border border-allura-border text-allura-goldDark text-[10px] font-sans font-bold tracking-[0.25em] uppercase shadow-xs">
              <Sparkles size={11} />
              <span>ALLURA EDITORIAL & POLICIES</span>
            </div>
            {isFallback && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-[10px] font-sans font-medium">
                <Info size={11} />
                <span>Boutique Default Policy</span>
              </div>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-normal text-allura-text tracking-tight uppercase leading-tight">
            {page.title}
          </h1>

          {/* Excerpt Summary */}
          {page.excerpt && (
            <p className="text-sm sm:text-base text-stone-600 font-sans leading-relaxed italic border-l-2 border-allura-darkBrown pl-4 py-1">
              {page.excerpt}
            </p>
          )}

          {/* Meta Bar: Date, Read Time, Copy Link */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs font-sans text-stone-500">
            <div className="flex items-center gap-4 sm:gap-6">
              {formattedDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-stone-400" />
                  <span>{formattedDate}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-stone-400" />
                <span>{readingTime} min read</span>
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-allura-border bg-allura-card text-xs font-medium text-stone-700 hover:text-stone-900 hover:border-stone-400 transition-all shadow-xs"
              title="Copy page URL"
            >
              {isCopied ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 size={13} />
                  <span>Share Page</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Dynamic HTML Content */}
        <div
          className="cms-content-wrapper bg-allura-card rounded-2xl border border-allura-border/70 p-6 sm:p-10 shadow-xs"
        >
          <div
            className="cms-prose text-sm sm:text-base font-sans text-stone-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>

        {/* Footer Atelier Note */}
        <div className="border-t border-allura-border/70 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-stone-500">
          <p>
            Have questions regarding this policy or document? Reach out to our customer care team anytime.
          </p>
          <div className="flex items-center gap-3">
            <Link
              to="/contact"
              className="font-semibold text-allura-darkBrown hover:underline underline-offset-4"
            >
              Contact Support →
            </Link>
          </div>
        </div>

      </article>

      {/* Scoped CSS for CMS HTML tags rendering */}
      <style>{`
        .cms-prose h1, .cms-prose h2, .cms-prose h3, .cms-prose h4 {
          font-family: 'Quicksand', sans-serif;
          color: #1c1917;
          font-weight: 600;
          letter-spacing: -0.01em;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
        }
        .cms-prose h1 { font-size: 1.75rem; }
        .cms-prose h2 { font-size: 1.35rem; border-bottom: 1px solid rgba(86, 28, 8, 0.1); padding-bottom: 0.35rem; }
        .cms-prose h3 { font-size: 1.15rem; }
        .cms-prose h4 { font-size: 1rem; }
        .cms-prose p {
          margin-bottom: 1.25rem;
          line-height: 1.75;
          color: #44403c;
        }
        .cms-prose ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1.25rem;
          space-y: 0.5rem;
        }
        .cms-prose ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1.25rem;
        }
        .cms-prose li {
          margin-bottom: 0.5rem;
          color: #44403c;
        }
        .cms-prose a {
          color: #561C08;
          text-decoration: underline;
          text-underline-offset: 3px;
          font-weight: 500;
        }
        .cms-prose a:hover {
          color: #000000;
        }
        .cms-prose blockquote {
          border-left: 3px solid #561C08;
          padding-left: 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #57534e;
          background: rgba(86, 28, 8, 0.03);
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          border-radius: 0 0.5rem 0.5rem 0;
        }
        .cms-prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1.5rem 0;
          box-shadow: 0 4px 20px -2px rgba(44, 41, 38, 0.08);
        }
        .cms-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          font-size: 0.875rem;
        }
        .cms-prose th, .cms-prose td {
          border: 1px solid rgba(86, 28, 8, 0.15);
          padding: 0.75rem 1rem;
          text-align: left;
        }
        .cms-prose th {
          background-color: #f5f5f4;
          font-weight: 600;
          color: #1c1917;
        }
        .cms-prose code {
          background-color: #f5f5f4;
          padding: 0.15rem 0.35rem;
          border-radius: 0.25rem;
          font-size: 0.85em;
          font-family: monospace;
          color: #561C08;
        }
      `}</style>
    </div>
  );
};

export default CMSPageViewer;
