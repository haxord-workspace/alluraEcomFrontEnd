import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { MY_REVIEWS_PATH, REVIEWS_ENABLED } from '../../config/reviews';

/**
 * "My Reviews" entry for the AccountPage tab bar. A route link (like the sibling
 * /account/orders and /account/notifications links), not an in-page tab, styled to
 * match the inactive tab buttons. Renders nothing when the module is off.
 */
export const MyReviewsAccountTab: React.FC = () => {
  if (!REVIEWS_ENABLED) return null;
  return (
    <Link
      to={MY_REVIEWS_PATH}
      className="pb-3 transition-colors flex items-center gap-2 relative whitespace-nowrap text-allura-muted hover:text-allura-text"
    >
      <MessageSquareText size={15} />
      <span>My Reviews</span>
    </Link>
  );
};
