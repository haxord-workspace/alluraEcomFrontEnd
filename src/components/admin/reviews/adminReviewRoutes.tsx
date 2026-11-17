import { Route } from 'react-router-dom';
import {
  ADMIN_REVIEWS_PATH,
  ADMIN_REVIEW_ANALYTICS_PATH,
  ADMIN_REVIEW_REPORTS_PATH,
  REVIEWS_ADMIN_MODULE,
  REVIEWS_ENABLED,
} from '../../../config/reviews';
import { AdminAccessGuard } from '../AdminAccessGuard';
import { LazyAdminReviewAnalyticsPage, LazyAdminReviewReportsPage, LazyAdminReviewsPage } from './LazyAdminReviewPages';

/**
 * Admin review routes, for use directly inside the admin <Routes> (under AdminLayout)
 * as `{renderAdminReviewRoutes()}`. Each page sits behind the existing AdminAccessGuard
 * with REVIEWS_ADMIN_MODULE. Returns null when the module is off (React Router ignores
 * null children, and flattens the Fragment).
 */
export const renderAdminReviewRoutes = () =>
  REVIEWS_ENABLED ? (
    <>
      <Route
        path={ADMIN_REVIEWS_PATH}
        element={
          <AdminAccessGuard module={REVIEWS_ADMIN_MODULE}>
            <LazyAdminReviewsPage />
          </AdminAccessGuard>
        }
      />
      <Route
        path={ADMIN_REVIEW_REPORTS_PATH}
        element={
          <AdminAccessGuard module={REVIEWS_ADMIN_MODULE}>
            <LazyAdminReviewReportsPage />
          </AdminAccessGuard>
        }
      />
      <Route
        path={ADMIN_REVIEW_ANALYTICS_PATH}
        element={
          <AdminAccessGuard module={REVIEWS_ADMIN_MODULE}>
            <LazyAdminReviewAnalyticsPage />
          </AdminAccessGuard>
        }
      />
    </>
  ) : null;
