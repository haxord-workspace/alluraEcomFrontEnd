import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { ReviewsErrorBoundary } from '../../reviews/ReviewsErrorBoundary';

// Code-split: admin review pages load only when their route is visited
const AdminReviewsPage = lazy(() => import('../../../pages/admin/AdminReviewsPage'));
const AdminReviewReportsPage = lazy(() => import('../../../pages/admin/AdminReviewReportsPage'));
const AdminReviewAnalyticsPage = lazy(() => import('../../../pages/admin/AdminReviewAnalyticsPage'));

const AdminPageFallback: React.FC = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-stone-400" role="status" aria-label="Loading reviews">
    <Loader2 size={22} className="animate-spin" />
  </div>
);

export const LazyAdminReviewsPage: React.FC = () => (
  <ReviewsErrorBoundary>
    <Suspense fallback={<AdminPageFallback />}>
      <AdminReviewsPage />
    </Suspense>
  </ReviewsErrorBoundary>
);

export const LazyAdminReviewReportsPage: React.FC = () => (
  <ReviewsErrorBoundary>
    <Suspense fallback={<AdminPageFallback />}>
      <AdminReviewReportsPage />
    </Suspense>
  </ReviewsErrorBoundary>
);

export const LazyAdminReviewAnalyticsPage: React.FC = () => (
  <ReviewsErrorBoundary>
    <Suspense fallback={<AdminPageFallback />}>
      <AdminReviewAnalyticsPage />
    </Suspense>
  </ReviewsErrorBoundary>
);
