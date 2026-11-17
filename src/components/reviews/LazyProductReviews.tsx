import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { REVIEWS_ENABLED } from '../../config/reviews';
import { ReviewsErrorBoundary } from './ReviewsErrorBoundary';
import { ProductReviewsSkeleton } from './ProductReviewsSkeleton';
import { PRODUCT_REVIEWS_ANCHOR_ID, REVIEWS_REQUEST_EVENT } from './reviewsAnchor';

interface LazyProductReviewsProps {
  productId: string | undefined;
}

/**
 * One-line mount point for Product Details. Renders nothing when the module is off.
 * The reviews chunk and its API calls start only when the section scrolls near the
 * viewport (or the URL targets #reviews), so the page's own load is unaffected.
 * Wrapped in an error boundary: a failure here can never blank the product page.
 */
export const LazyProductReviews: React.FC<LazyProductReviewsProps> = ({ productId }) => {
  if (!REVIEWS_ENABLED || !productId) return null;
  return <LazyProductReviewsInner productId={productId} />;
};

const LazyProductReviewsInner: React.FC<{ productId: string }> = ({ productId }) => {
  const location = useLocation();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isNear, setIsNear] = useState(() => location.hash === `#${PRODUCT_REVIEWS_ANCHOR_ID}`);
  // Bumped by the boundary's Retry so a failed chunk import is attempted again
  const [attempt, setAttempt] = useState(0);

  const Section = useMemo(
    () => lazy(() => import('./ProductReviewsSection')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attempt]
  );

  useEffect(() => {
    if (isNear) return;
    const node = anchorRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isNear]);

  // Rating link in the header (or a #reviews URL) asks to load immediately
  useEffect(() => {
    const onRequest = () => setIsNear(true);
    window.addEventListener(REVIEWS_REQUEST_EVENT, onRequest);
    return () => window.removeEventListener(REVIEWS_REQUEST_EVENT, onRequest);
  }, []);

  return (
    <div id={PRODUCT_REVIEWS_ANCHOR_ID} ref={anchorRef} className="scroll-mt-24 min-h-px">
      {isNear && (
        <ReviewsErrorBoundary onReset={() => setAttempt(a => a + 1)}>
          <Suspense
            fallback={
              <div className="mt-8 sm:mt-14 pt-8 sm:pt-12 border-t border-allura-border/60">
                <ProductReviewsSkeleton />
              </div>
            }
          >
            <Section key={productId} productId={productId} />
          </Suspense>
        </ReviewsErrorBoundary>
      )}
    </div>
  );
};
