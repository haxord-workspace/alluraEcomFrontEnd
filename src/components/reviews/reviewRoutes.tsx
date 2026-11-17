import { Route } from 'react-router-dom';
import { MY_REVIEWS_PATH, REVIEWS_ENABLED } from '../../config/reviews';
import { ProtectedRoute } from '../common/ProtectedRoute';
import { LazyMyReviewsPage } from './LazyMyReviewsPage';

/**
 * The customer "My Reviews" route, for use directly inside <Routes> as
 * `{renderMyReviewsRoute()}`. Returns null when the module is off (React Router
 * ignores null children), so the route does not exist at all.
 */
export const renderMyReviewsRoute = () =>
  REVIEWS_ENABLED ? (
    <Route
      path={MY_REVIEWS_PATH}
      element={
        <ProtectedRoute>
          <LazyMyReviewsPage />
        </ProtectedRoute>
      }
    />
  ) : null;
