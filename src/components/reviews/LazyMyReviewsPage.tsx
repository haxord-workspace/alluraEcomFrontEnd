import React, { Suspense, lazy } from 'react';
import { ReviewsErrorBoundary } from './ReviewsErrorBoundary';
import { ReviewCardsSkeleton } from './ProductReviewsSkeleton';

// Code-split: the page loads only when /account/reviews is visited
const MyReviewsPage = lazy(() => import('../../pages/customer/MyReviewsPage'));

/** Lazy My Reviews page with a skeleton fallback and an error boundary. */
export const LazyMyReviewsPage: React.FC = () => (
  <ReviewsErrorBoundary>
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16" role="status" aria-label="Loading your reviews">
          <ReviewCardsSkeleton count={3} />
        </div>
      }
    >
      <MyReviewsPage />
    </Suspense>
  </ReviewsErrorBoundary>
);
